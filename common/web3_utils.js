'use strict';

const util = require('util');

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
    }
};
