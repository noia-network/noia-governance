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

 async function sendTransactionAndWaitForReceiptMined (web3, method, options) {
    let args = Array.from(arguments).slice(3);
    let gasSafetyMargin = 1.05;
    args.push(options);
    let gasEstimate = await method.estimateGas.apply(null, args);
    options.gas = Math.ceil(Number(gasEstimate) * gasSafetyMargin);
    logger.info(`Gas estimated ${gasEstimate}, using ${options.gas}`);
    let tx = await method.apply(null, args);
    logger.info(`Waiting for transaction ${tx.receipt.transactionHash} to be mined`);
    tx.receiptMined = await getTransactionReceiptMined(web3, tx.receipt.transactionHash);
    logger.info(`Transaction is mined @${tx.receiptMined.blockNumber}`);
    return tx;
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
