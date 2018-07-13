'use strict';

const util = require('util');
const debug = require('debug');

const ethutils = require('ethereumjs-util');
var logger = {
    info : debug('noiagov:info'),
    warn : debug('noiagov:warn'),
    error : debug('noiagov:error')
};
logger.info.log = console.info.bind(console);
logger.warn.log = console.warn.bind(console);
logger.error.log = console.error.bind(console);

 function getTransactionReceiptMined(web3, txnHash, interval) {
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
                    resolve(receipt);
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

async function sendTransactionAndWaitForReceiptMined(web3, method, options) {
    let args = Array.from(arguments).slice(3);
    let gasSafetyMargin = 1.05;
    args.push(options);
    let gasEstimate = await method.estimateGas.apply(null, args);
    options.gas = Math.ceil(Number(gasEstimate) * gasSafetyMargin);
    console.info(`Gas estimated ${gasEstimate}, using ${options.gas}`);
    const methodWithArgs = method.bind(null, ...args);
    const tx = await retryCallOnError(web3, methodWithArgs);
    logger.info(`Waiting for transaction ${tx.receipt.transactionHash} to be mined`);
    tx.receiptMined = await getTransactionReceiptMined(web3, tx.receipt.transactionHash);
    logger.info(`Transaction is mined @${tx.receiptMined.blockNumber}`);
    return tx;
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

const MAX_BLOCK_RETRIES = 5;
async function retryCallOnError(web3, method) {
  return new Promise(async (resolve, reject) => {
    const provider = web3.currentProvider.provider;

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
              logger.info(`Retry error!`, err);
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
      logger.info(`Finishing up! result: ${JSON.stringify(result)}, error: ${JSON.stringify(error)}`);
      // clear the resources
      retriesAllowed = false;
      provider.engine.off('block', nextBlockListener);
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
      blockNumbers.push(blockNumber);

      // we try to retry if new blocks are coming in
      retry().catch((err) => {
        // should not happen
        logger.info(`Retry error!`, err);
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

        // trigger retries here if 'nextBlock' events have already accumulated some new blocks
        if (blockNumbers.length) {
          retry().catch((err) => {
            // should not happen
            logger.info(`Retry error!`, err);
          });
        } else {
          // just in case, trigger current block fetch in case we missed nextBlock somehow
          web3.eth.getBlockNumber((err, blockNumber) => {
            nextBlockNumberListener(blockNumber);
          });
        }

        // start the timer in case the nextBlock's do not come in for some reason or
        // next blocks come in very slowly
        timeoutId = setTimeout(() => {
          finish(null, new Error('Timeout when calling/retrying a method!'));
        }, 5 * 60 * 1000); // 5 mins
        return;
      }
      finish(result);
    } catch (err) {
      // unknown error
      finish(null, err);
    }
  });
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
        return new Promise((resolve, reject) => {
            let web3 = contract.constructor.web3;
            let transactionHash = contract.transactionHash;
            if (!transactionHash) return resolve(-1);
            web3.eth.getTransactionReceipt(transactionHash, (error, result) => {
                if (error) reject(error); else resolve(result.gasUsed);
            })
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
};
