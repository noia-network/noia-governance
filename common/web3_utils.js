'use strict';

const util = require('util');
const debug = require('debug');
const Web3Utils = require('web3-utils');

const ethutils = require('ethereumjs-util');
var logger = {
    info : debug('noiagov:info'),
    warn : debug('noiagov:warn'),
    error : debug('noiagov:error')
};
logger.info.log = console.info.bind(console);
logger.warn.log = console.warn.bind(console);
logger.error.log = console.error.bind(console);

function waitForConfirmations(resolve, reject, web3, txnHash, receipt, waitForNrConfirmations) {
    const startBlockNumber = receipt.blockNumber;
    let highestBlockNumber = startBlockNumber;
    let blockNumbers = [];
    function checkConfirmation() {
        try {
            // select the higher block
            let oldBlockNumber = highestBlockNumber;
            for (let i=0; i < blockNumbers.length; i++) {
                const blockNumber = blockNumbers[i];
                if (blockNumber > highestBlockNumber) {
                    highestBlockNumber = blockNumber;
                }
            }
            // clear the array so that it can start accumulating again
            blockNumbers = [];

            // nothing to do if not a new block number
            const steps = highestBlockNumber - startBlockNumber;
            let stepsToGo = waitForNrConfirmations - steps;
            stepsToGo = stepsToGo >= 0 ? stepsToGo : 0;
            console.log(`Waiting confirmations[${stepsToGo}]. startBlockNumber: ${startBlockNumber}, highestBlockNumber: ${highestBlockNumber}`);
            if (highestBlockNumber <= oldBlockNumber) {
                // logger.info(`Waiting for next block!`);
                return;
            }

            // check if we are done
            if (steps >= waitForNrConfirmations) {
                // now check if we still have our transaction receipt in chain - or chain might have diverged
                web3.eth.getTransactionReceipt(txnHash, function (err, receipt) {
                    if (err) {
                        finish(null, err);
                        return;
                    }
                    if (!receipt || !receipt.blockNumber) {
                        return finish(null, new Error(`No block number in receipt. Transaction with hash: ${txnHash} failed to wait for ${waitForNrConfirmations} confirmations!`));
                    }
                    finish(highestBlockNumber);
                });
            }
        } catch (err) {
            finish(null, err);
        }
    }

    // accumulate the block number's here that come in from 'nextBlock' listener
    function nextBlockNumberListener(blockNumber) {
        logger.info(`Got blockNumber: `, blockNumber);
        if (!blockNumber) { return; }
        blockNumbers.push(blockNumber);

        // we try to retry if new blocks are coming in
        checkConfirmation();
    }
    function nextBlockListener(nextBlock) {
        nextBlockNumberListener(ethutils.bufferToInt(nextBlock.number));
    }

    // provide a method here to clean up on exit
    let timeoutId;
    function finish(result, error) {
        logger.info(`Waiting confirmations. Finishing up! result: ${JSON.stringify(result)}, error: ${JSON.stringify(error)}`);
        // clear the resources
        provider.engine.removeListener('block', nextBlockListener);
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        // return result
        if (error) {
            return reject(error);
        }
        resolve(result);
    }

    // register block listener
    const provider = getProvider(web3);
    // register next block listener immediately
    provider.engine.on('block', nextBlockListener);

    // start the timer in case the nextBlock's do not come in for some reason or
    // next blocks come in very slowly
    const TIMEOUT_PERIOD = 5 * 60 * 1000;  // 5 mins
    timeoutId = setTimeout(() => {
        finish(null, new Error(`Timeout ${TIMEOUT_PERIOD / 1000}s. Transaction with hash: ${txnHash} failed to wait for ${waitForNrConfirmations} confirmations!`));
    }, TIMEOUT_PERIOD);
}

function getTransactionReceiptMined(web3, txnHash, interval, waitForNrConfirmations) {
    interval = interval ? interval : 500;
    let transactionReceiptAsync = function(txnHash, resolve, reject) {
        try {
            web3.eth.getTransactionReceipt(txnHash, function (err, receipt) {
                if (err) {
                    reject(err);
                    return;
                }
                // FIXME check if recipt shows tx rejected/failed
                if (!receipt || !receipt.blockNumber) {
                    setTimeout(function () {
                        transactionReceiptAsync(txnHash, resolve, reject);
                    }, interval);
                } else {
                    // check the block number returned is mined into 10 blocks afterwards
                    if (waitForNrConfirmations && waitForNrConfirmations > 0) {
                        waitForConfirmations(resolve, reject, web3, txnHash, receipt, waitForNrConfirmations);
                    } else {
                        resolve(receipt);
                    }
                }
            });
        } catch(e) {
            reject(e);
        }
    };

    return new Promise(function (resolve, reject) {
        transactionReceiptAsync(txnHash, resolve, reject);
    });
}

// Gas estimates are multiplied by this value to allow for an extra buffer (for reference truffle-next uses 1.25
// and ZeppelinOS uses 1.2)
const GAS_MULTIPLIER = 1.2; // previously - 1.05

// set default confirmations
let CONFIRMATIONS_DEFAULT = 1; // default for all networks
if (process && process.env && process.env.NETWORK === 'local') {
    CONFIRMATIONS_DEFAULT = 0; // for local testing
}

async function sendTransactionAndWaitForReceiptMined(web3, contractFn, txParams) {
    // check if confirmations nr is provided
    const params = Object.assign({}, txParams || {});
    console.log(`Confirmation! txParams.confirmations: ${params.confirmations}, CONFIRMATIONS_DEFAULT: ${CONFIRMATIONS_DEFAULT}`);
    let waitForNrConfirmations = params.confirmations;
    if (waitForNrConfirmations == undefined) {
        waitForNrConfirmations = CONFIRMATIONS_DEFAULT;
    }
    delete params.confirmations;

    // append the contract function params and then transaction params as the last one
    let args = Array.from(arguments).slice(3);
    args.push(params);

    // if gas is not set explicitly then estimate gas for the transaction
    if (!params.gas) {
        console.info(`Contract function estimateGas: ${JSON.stringify(args)}`);
        const gasEstimate = await contractFn.estimateGas.apply(null, args);
        const gasToUse = await calculateActualGas(web3, gasEstimate);
        params.gas = gasToUse;
        console.info(`Gas estimated ${gasEstimate}, using gas: ${params.gas}, with args: ${JSON.stringify(args)}`);
    } else {
        console.info(`Gas explicitly set! using gas: ${params.gas}, with args: ${JSON.stringify(args)}`);
    }

    // call a contract function
    const methodWithArgs = contractFn.bind(null, ...args);
    const tx = await retryCallOnError(web3, methodWithArgs);
    logger.info(`Waiting for transaction ${tx.receipt.transactionHash} to be mined. Waiting ${waitForNrConfirmations} confirmations.`);
    tx.receiptMined = await getTransactionReceiptMined(web3, tx.receipt.transactionHash, undefined, waitForNrConfirmations);
    logger.info(`Transaction is mined @${tx.receiptMined.blockNumber}`);
    return tx;
}

// Logic shamefully copied from ZeppelinOS - https://github.com/zeppelinos/zos/blob/master/packages/lib/src/utils/Transactions.js
async function calculateActualGas(web3, estimatedGas) {
    //const blockLimit = await getBlockGasLimit();
    const blockLimit = Number.MAX_SAFE_INTEGER;

    let gasToUse = parseInt(estimatedGas * GAS_MULTIPLIER);
    // Ganache has a bug (https://github.com/trufflesuite/ganache-core/issues/26) that causes gas
    // refunds to be included in the gas estimation; but the transaction needs to send the total
    // amount of gas to work. Geth and Parity return the correct value, so here we are adding the
    // value of the refund of setting a storage position to zero (which we do in NoiaWorkOrderV1.delegatedRelease).
    // This is a viable workaround as long as we don't have other methods that have higher refunds,
    // such as cleaning more storage positions or selfdestructing a contract. We should be able to fix
    // this once the issue is resolved.
    if (await isGanacheNode(web3)) {
        gasToUse += 45000; // single SSTORE clear refunds 15000 gas
    }
    return gasToUse >= blockLimit ? (blockLimit - 1) : gasToUse;
}

async function isGanacheNode(web3) {
    return (await getNodeVersion(web3)).match(/TestRPC/);
}

let nodeVersion;
async function getNodeVersion(web3) {
    if (nodeVersion) {
        return Promise.resolve(nodeVersion);
    }
    return new Promise((resolve, reject) => {
        web3.version.getNode((error, node) => {
            if (error) { return reject(error); }
            return resolve(nodeVersion = node);
        });
    });
}

async function getBlockGasLimit(web3) {
    return new Promise((resolve, reject) => {
        web3.eth.getBlock('latest', (error, block) => {
            if (error) { return reject(error); }
            return resolve(block.gasLimit);
        });
    });
}

async function callMethodCheckKnownError(method) {
    let result;
    try {
        result = await method();
    } catch (err) {
        // check for known error

        // GETH
        // {"jsonrpc":"2.0","id":1531402827926133,"error":{"code":-32000,"message":"replacement transaction underpriced"}}
        // {"jsonrpc":"2.0","id":1531403520972173,"error":{"code":-32000,"message":"known transaction: 9fd3d601f1d7c3952fdc9cf4ddf04e629e507bc82f08929c59da4139ec512a27"}}
        // Parity
        // {"jsonrpc":"2.0","error":{"code":-32010,"message":"Transaction gas price is too low. There is another transaction with same nonce in the queue. Try increasing the gas price or incrementing the nonce."},"id":1531471891913099}
        // {"jsonrpc":"2.0","error":{"code":-32010,"message":"Transaction with the same hash was already imported."},"id":1531473426794689}

        // if known error, then return the error
        if (err && err.message) {
            const message = err.message.toLowerCase();
            // logger.info(`Error message: ${message}`);
            const knownError = (
                message.indexOf('replacement transaction') >= 0 ||
                message.indexOf('known transaction') >= 0 ||
                message.indexOf('there is another transaction with same nonce in the queue') >= 0 ||
                message.indexOf('transaction with the same hash was already imported') >= 0
            )
            if (knownError) {
                return {
                    error: err
                }
            }
        }
        // unknown error, rethrow
        throw err;
    }
    return {
        result: result
    };
}

function getProvider(web3) {
    let provider = web3.currentProvider;
    // unpeel nested providers
    while (provider.provider) {
        provider = provider.provider;
    }
    if (provider.constructor && provider.constructor.name === 'Web3HDWalletProvider') {
        return provider;
    } else {
        throw new Error('Only Web3HDWalletProvider supported');
    }
}

const MAX_BLOCK_RETRIES = 12;
async function retryCallOnError(web3, method) {
    return new Promise(async (resolve, reject) => {
        const provider = getProvider(web3);

        // initialize current block number if available
        let currentBlockNumber;
        if (provider.currentBlock) {
            try {
                currentBlockNumber = ethutils.bufferToInt(provider.currentBlock.number);
            } catch (error) {
                return reject(error);
            }
        }

        // check retries
        let blockNumbers = [];
        let retriesAllowed = false;
        let retriesCount = 0;
        async function retry() {
            if (!retriesAllowed) {
                // logger.info(`Already retrying a method!`);
                return;
            }
            retriesAllowed = false;

            // select the higher block
            let oldBlockNumber = currentBlockNumber;
            for (let i=0; i < blockNumbers.length; i++) {
                const blockNumber = blockNumbers[i];
                if (!currentBlockNumber) {
                    currentBlockNumber = blockNumber;
                }
                if (blockNumber > currentBlockNumber) {
                    currentBlockNumber = blockNumber;
                }
            }
            // clear the array so that it can start accumulating again
            blockNumbers = [];

            // nothing to do if not a new block number
            if (currentBlockNumber <= oldBlockNumber) {
                retriesAllowed = true;
                logger.info(`Waiting for next block!`);
                return;
            }

            // otherwise retry
            logger.info(`Retrying a method! currentBlockNumber: ${currentBlockNumber}, retriesCount: ${retriesCount}`);
            try {
                const {result, error} = await callMethodCheckKnownError(method);
                if (error) {
                    // check if we have reached max retries
                    retriesCount++;
                    if (retriesCount > MAX_BLOCK_RETRIES) {
                        finish(null, new Error('Max retried blocks reached!'));
                        return;
                    }

                    // known error, allow retries
                    logger.info(`Known error! Retry count: ${retriesCount}. Error: ${error}`);
                    retriesAllowed = true;

                    // trigger retries here if 'nextBlock' events have already accumulated some new blocks
                    if (blockNumbers.length) {
                        retry().catch((err) => {
                            // should not happen
                            finish(null, err);
                        });
                    }
                    return;
                }
                finish(result);
            } catch (err) {
                // unknown error
                finish(null, err);
            }
        }

        // provide a method here to clean up on exit
        let timeoutId;
        function finish(result, error) {
            logger.info(`Retrying a method. Finishing up! result: ${JSON.stringify(result)}, error: ${JSON.stringify(error)}`);
            // clear the resources
            retriesAllowed = false;
            provider.engine.removeListener('block', nextBlockListener);
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            // return result
            if (error) {
                return reject(error);
            }
            resolve(result);
        }

        // accumulate the block number's here that come in from 'nextBlock' listener
        function nextBlockNumberListener(blockNumber) {
            logger.info(`Got blockNumber: `, blockNumber);
            if (!blockNumber) { return; }
            blockNumbers.push(blockNumber);

            // we try to retry if new blocks are coming in
            retry().catch((err) => {
                // should not happen
                finish(null, err);
            });
        }

        // register next block listener immediately
        function nextBlockListener(nextBlock) {
            nextBlockNumberListener(ethutils.bufferToInt(nextBlock.number));
        }
        provider.engine.on('block', nextBlockListener);

        // call method, if known error, then retry
        try {
            const {result, error} = await callMethodCheckKnownError(method);
            if (error) {
                // known error, allow retries
                logger.info(`Known error! ${error}, blockNumbers: ${blockNumbers}`);
                retriesAllowed = true;

                // start the timer in case the nextBlock's do not come in for some reason or
                // next blocks come in very slowly
                timeoutId = setTimeout(() => {
                    finish(null, new Error('Timeout when calling/retrying a method!'));
                }, 5 * 60 * 1000); // 5 mins

                // trigger retries here if 'nextBlock' events have already accumulated some new blocks
                if (blockNumbers.length) {
                    retry().catch((err) => {
                        // should not happen
                        finish(null, err);
                    });
                } else {
                    // just in case, trigger current block fetch in case we missed nextBlock somehow
                    web3.eth.getBlockNumber((err, blockNumber) => {
                        nextBlockNumberListener(blockNumber);
                    });
                }
                return;
            }
            finish(result);
        } catch (err) {
            // unknown error
            finish(null, err);
        }
    });
}

function hexRemove0x(hex) {
    return hex.replace(/^0x/i,'');
}

const nameFromToStringRegex = /^function\s?([^\s(]*)/;

/**
 * Gets the classname of an object or function if it can.  Otherwise returns the provided default.
 *
 * Getting the name of a function is not a standard feature, so while this will work in many
 * cases, it should not be relied upon except for informational messages (e.g. logging and Error
 * messages).
 *
 * @private
 */
function className(object, defaultName) {
    var result = "";
    if (typeof object === 'function') {
        result = object.name || object.toString().match(nameFromToStringRegex)[1];
    } else if (typeof object.constructor === 'function') {
        result = className(object.constructor, defaultName);
    }
    return result || defaultName;
}

module.exports = {
    setupWeb3Utils: logger_ => {
        if (typeof logger_.info !== 'function' ||
            typeof logger_.warn !== 'function' ||
            typeof logger_.error !== 'function') {
            throw new Error('invalid logger option');
        }
        logger = logger_;
    },

    isContract: async (web3, address) => {
        let code = await new Promise(function (resolve, reject) {
            web3.eth.getCode(address, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
        return '0x0' !== code && '0x' !== code && '' !== code;
    },

    getGasUsedForTransaction: tx => {
        return tx.receipt.gasUsed;
    },

    getGasUsedForContractCreation : contract => {
        if (contract.constructor.name !== 'TruffleContract') throw Error('invalid input');
        return new Promise(async (resolve, reject) => {
            let web3 = contract.constructor.web3;
            let transactionHash = contract.transactionHash;
            if (!transactionHash) return resolve(-1);
            try {
                const receipt = await getTransactionReceiptMined(web3, transactionHash);
                return resolve(receipt.gasUsed);
            } catch (error) {
                return reject(error);
            }
            // web3.eth.getTransactionReceipt(transactionHash, (error, result) => {
            //     if (error) reject(error); else resolve(result.gasUsed);
            // })
        });
    },

    waitEventsFromWatcher: (watcher, nevents) => {
        let events = [];
        let stopping = false;
        return new Promise((resolve, reject) => {
            watcher.watch((error, result) => {
                if (error) reject(error); else {
                    if (events.length < nevents) {
                        events.push(result);
                    } else {
                        if (!stopping) {
                            stopping = true;
                            watcher.stopWatching((error, result) => {
                                if (error) reject(error); else resolve(events);
                            });
                        }
                    }
                }
            });
        });
    },

    bytesToString: function (bytes, encoding_) {
        let encoding = encoding_ || 'utf8';
        if (bytes.startsWith('0x')) bytes = bytes.slice(2);
        let result = new Buffer(bytes, 'hex').toString(encoding);
        result = result.replace(/\0*$/, '');
        return result;
    },

    rpcSignPacked: async function (web3, acc) {
        const params = Array.from(arguments).slice(2);
        const packedHash = Web3Utils.soliditySha3(...params);
        return new Promise(function (resolve, reject) {
            web3.eth.sign(acc, packedHash, function (error, result) {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            });
        });
    },

    recoverAddressFromRpcSignedPacked: function(sgn) {
        const params = Array.from(arguments).slice(1);
        const packedHash = hexRemove0x(Web3Utils.soliditySha3(...params));

        const packedHashBuf = Buffer.from(packedHash, "hex");
        const fullHash = ethutils.sha3(Buffer.concat([
            Buffer.from("\x19Ethereum Signed Message:\n"),
            Buffer.from(String(packedHashBuf.length)),
            packedHashBuf
        ]));
        // const fullHash = Web3Utils.soliditySha3("\x19Ethereum Signed Message:\n32", packedHash);
        const signature = ethutils.fromRpcSig(sgn);
        const pub = ethutils.ecrecover(fullHash, signature.v, signature.r, signature.s);
        const addr = '0x' + ethutils.pubToAddress(pub).toString('hex');
        return addr;
    },

    rpcSignMessage : async (web3, msg, acc) => {
        const msgBuf = new Buffer(msg);
        return await new Promise(function (resolve, reject) {
            web3.eth.sign(acc, '0x' + msgBuf.toString('hex'), function (error, result) {
                if (error) reject(error);
                else resolve(result);
            });
        });
    },

    recoverAddressFromRpcSignedMessage: (msg, sgn) => {
        const msgBuf = new Buffer(msg);
        const prefix = new Buffer("\x19Ethereum Signed Message:\n");
        const prefixedMsg = ethutils.sha3(
            Buffer.concat([prefix, new Buffer(String(msgBuf.length)), msgBuf])
        );
        const signature = ethutils.fromRpcSig(sgn);
        const pub = ethutils.ecrecover(prefixedMsg, signature.v, signature.r, signature.s);
        const addr = '0x' + ethutils.pubToAddress(pub).toString('hex');
        return addr;
    },

    signMessage : (msg, privateKey) => {
        const msgBuf = new Buffer(msg);
        const msgHash = ethutils.sha3(msgBuf);
        const sig = ethutils.ecsign(msgHash, privateKey);
        sig.r = ethutils.bufferToHex(sig.r).slice(2);
        sig.s = ethutils.bufferToHex(sig.s).slice(2);
        return sig;
    },

    recoverAddressFromSignedMessage: (msg, sig) => {
        const msgBuf = new Buffer(msg);
        const msgHash = ethutils.sha3(msgBuf);
        sig.r = new Buffer(sig.r, 'hex');
        sig.s = new Buffer(sig.s, 'hex');
        const pub = ethutils.ecrecover(msgHash, sig.v, sig.r, sig.s);
        const addr = '0x' + ethutils.pubToAddress(pub).toString('hex');
        return addr;
    },

    getTransactionReceiptMined: getTransactionReceiptMined,

    sendTransactionAndWaitForReceiptMined: sendTransactionAndWaitForReceiptMined,

    hexRemove0x: hexRemove0x
};
