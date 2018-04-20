'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits;
const contract = require("truffle-contract");

const NEW_BUSINESS_GAS                  = 1200000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    signMessage
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
        if (await businessRegistry.hasEntry.call(this.address)) {
            this.contract = await NoiaBusiness.at(this.address);
        } else {
            throw Error(`Business does not exist at ${this.address}`);
        }
    } else {
        console.log(`Creating new business...`);
        let tx = await this.factory.createBusiness({ gas: NEW_BUSINESS_GAS });
        this.contract = this.contracts.NoiaBusiness.at(tx.logs[0].args.businessAddress);
        this.address = this.contract.address;
        console.log(`Business created at ${this.contract.address}, gas used ${getGasUsedForTransaction(tx)}`);
    }
}

BusinessClient.prototype.startWatchingNodeEvents = function (latestSyncedBlock_, options_) {
    let options = options_ || {};
    let pollingInterval = options.pollingInterval || 5000;
    // currently using polling
    // TODO: support pubusb if websocket web3 is used
    if (!this.watchingNodeEventsHandler) {
        let handler = this.watchingNodeEventsHandler = {
            latestSyncedBlock: latestSyncedBlock_
        };
        let that = this;
        async function pollEvents () {
            console.log('pollEvents');
            // FIXME setInterval doesn't await for async function
            let latestBlock = await util.promisify(that.web3.eth.getBlockNumber)();
            console.log(`pollEvents latestBlock ${latestBlock}`);
            let filter = that.nodeRegistry.NoiaRegistryEntryAdded({}, {
                fromBlock: handler.latestSyncedBlock,
                toBlock: latestBlock,
                topics: [
                    that.NOIA_REGISTRY_ENTRY_ADDED_EVENT
                ]
            });
            let logs = await util.promisify(filter.get.bind(filter))();
            logs.forEach(log => {
                that.emit('node_entry_added', log.args.baseContract);
            });
            if (latestBlock > handler.latestSyncedBlock) {
                handler.latestSyncedBlock = latestBlock;
            }
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
    return await signMessage(web3, this.owner, msg);
}

// events
//...

module.exports = BusinessClient;
