'use strict';

const util = require('util');

const ethutils = require('ethereumjs-util');

module.exports = {
    isContract: address => {
        return '0x0' !== web3.eth.getCode(address)
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
        return new Promise((resolve, reject) => {
            watcher.watch((error, result) => {
                if (error) reject(error); else {
                    events.push(result);
                    if (events.length < nevents) return;
                    watcher.stopWatching((error, result) => {
                        if (error) reject(error); else resolve(events);
                    });
                }
            });
        });
    },

    signMessage : async (web3, acc, msg) => {
        const msgBuf = new Buffer(msg);
        return await web3.eth.sign(acc, '0x' + msgBuf.toString('hex'));
    },

    recoverAddressFromSignedMessage: (web3, msg, sgn) => {
        const msgBuf = new Buffer(msg);
        const prefix = new Buffer("\x19Ethereum Signed Message:\n");
        const prefixedMsg = ethutils.sha3(
            Buffer.concat([prefix, new Buffer(String(msgBuf.length)), msgBuf])
        );
        const signature = ethutils.fromRpcSig(sgn);
        const pub = ethutils.ecrecover(prefixedMsg, signature.v, signature.r, signature.s);
        const addr = '0x' + ethutils.pubToAddress(pub).toString('hex');
        return addr;
    }
};
