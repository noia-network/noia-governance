'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits;
const contract = require("truffle-contract");

const LOGS_NUM_BLOCKS_TO_WATCH = 1;

const NEW_BUSINESS_GAS                  = 1200000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    rpcSignMessage,
} = require('../common/web3_utils.js');

inherits(BusinessClient, EventEmitter)
function BusinessClient(contracts, owner, marketplace, factory, address) {
    this.contracts = contracts;
    this.owner = owner;
    this.marketplace = marketplace;
    this.factory = factory;
    this.address = address;
    this.web3 = this.marketplace.constructor.web3;
    this.NOIA_REGISTRY_ENTRY_ADDED_EVENT = this.web3.sha3('NoiaRegistryEntryAdded(address)');
};

BusinessClient.prototype.init = async function () {
    this.businessRegistry = this.contracts.NoiaRegistry.at(await this.marketplace.businessRegistry.call());
    this.nodeRegistry = this.contracts.NoiaRegistry.at(await this.marketplace.nodeRegistry.call());
    if (this.address) {
        if (await this.businessRegistry.hasEntry.call(this.address)) {
            this.contract = await this.contracts.NoiaBusiness.at(this.address);
        } else {
            throw Error(`Business does not exist at ${this.address}`);
        }
    } else {
        console.log(`Creating new business...`);
        let tx = await this.factory.createBusiness({ from: this.owner, gas: NEW_BUSINESS_GAS });
        this.contract = await this.contracts.NoiaBusiness.at(tx.logs[0].args.businessAddress);
        this.address = this.contract.address;
        console.log(`Business created at ${this.contract.address}, gas used ${getGasUsedForTransaction(tx)}`);
    }
}

BusinessClient.prototype.startWatchingNodeEvents = async function (options_) {
    let options = options_ || {};
    let fromBlock = options.fromBlock || await util.promisify(this.web3.eth.getBlockNumber)();
    let pollingInterval = options.pollingInterval || 5000;
    // currently using polling
    // TODO: support pubusb if websocket provider is used
    if (!this.watchingNodeEventsHandler) {
        let handler = this.watchingNodeEventsHandler = {
            polling: false,
            latestSyncedBlock: fromBlock - LOGS_NUM_BLOCKS_TO_WATCH,
            receivedLogs: { /* blocknumber : [] */}
        };
        let that = this;
        async function pollEvents () {
            if (handler.polling) return;
            handler.polling = true;
            try {
                //console.debug('pollEvents');
                let latestBlock = await util.promisify(that.web3.eth.getBlockNumber)();
                //console.debug(`pollEvents latestBlock ${handler.latestSyncedBlock} -> ${latestBlock}`);
                let filter = that.nodeRegistry.NoiaRegistryEntryAdded({}, {
                    fromBlock: handler.latestSyncedBlock,
                    toBlock: 'latest',
                    topics: [
                        that.NOIA_REGISTRY_ENTRY_ADDED_EVENT
                    ]
                });
                let logs = await util.promisify(filter.get.bind(filter))();
                logs.forEach(log => {
                    // avoid multiple firing of the same log
                    if (!handler.receivedLogs[log.blockNumber]) {
                        handler.receivedLogs[log.blockNumber] = []
                    }
                    let receivedLogsOfBlock = handler.receivedLogs[log.blockNumber];
                    if (!receivedLogsOfBlock[log.transactionHash]) {
                        receivedLogsOfBlock[log.transactionHash] = 1;
                        that.emit('node_entry_added', log.args.baseContract);
                    }
                });

                // LOGS_NUM_BLOCKS_TO_WATCH block before current block is fully synced
                if (latestBlock - LOGS_NUM_BLOCKS_TO_WATCH > handler.latestSyncedBlock) {
                    handler.latestSyncedBlock = latestBlock - LOGS_NUM_BLOCKS_TO_WATCH;
                    // cleanup saved old blocks logs
                    for (let b in handler.receivedLogs) {
                        if (b < latestBlock - LOGS_NUM_BLOCKS_TO_WATCH) {
                            delete handler.receivedLogs[b];
                        }
                    }
                }
            } catch (error) {
                console.error(`pollEvents error ${error}`);
            }
            handler.polling = false;
        };
        pollEvents();
        this.watchingNodeEventsHandler.intervalId = setInterval(pollEvents, pollingInterval);
    } else {
        throw new Error('Already watching node events');
    }
}

BusinessClient.prototype.stopWatchingNodeEvents = function () {
    if (this.watchingNodeEventsHandler) {
        clearInterval(this.watchingNodeEventsHandler.intervalId);
        delete this.watchingNodeEventsHandler;
    } else {
        throw new Error('Not watching node events');
    }
}

/**
 * use this message when you want to prove your ownership of the node contract
 */
BusinessClient.prototype.signMessage = async function (msg) {
    return await rpcSignMessage(this.web3, msg, this.owner);
}

// Emitting Events:
//
// - node_entry_added
//

module.exports = BusinessClient;
