'use strict';

const util = require('util');
const inherits = require('util').inherits;

const LOGS_NUM_BLOCKS_TO_WATCH = 1;

const {
    signMessage,
    rpcSignMessage
} = require('../common/web3_utils.js');

inherits(BaseClient, require('events').EventEmitter)
function BaseClient(options) {
    let self = this;
    return new Promise(async function (resolve, reject) { try {
        self.logger = options.logger;
        self.web3 = options.web3;
        self.contracts = options.contracts;
        self.owner = options.account.owner;
        self.ownerPrivateKey = options.account.ownerPrivateKey;
        self.marketplace = options.instances.marketplace;
        self.factory = options.instances.factory;
        self.eventHandlers = {};

        self.businessRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.businessRegistry.call());
        self.nodeRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.nodeRegistry.call());
        self.jobPostRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.jobPostRegistry.call());

        self.NOIA_REGISTRY_ENTRY_ADDED_EVENT = self.web3.sha3('NoiaRegistryEntryAdded(address)');

        resolve(self);
    } catch (error) {
        reject(error);
    });
}

/**
 * [async] Sign message through rpc
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.rpcSignMessage = async function (msg) {
    return await rpcSignMessage(this.web3, msg, this.owner);
}

BaseClient.prototype.startWatchingNodeEvents = function (options) {
    this._startWatchingEvent(
        'node_entry_added',
        this.nodeRegistry.NoiaRegistryEntryAdded,
        [
            this.NOIA_REGISTRY_ENTRY_ADDED_EVENT
        ],
        options);
}

BaseClient.prototype.stopWatchingNodeEvents = function () {
    this._stopWatchingEvent('node_entry_added')
}

BaseClient.prototype.startWatchingJobPostAddedEvents = function (options) {
    this._startWatchingEvent(
        'job_post_added',
        this.jobPostRegistry.NoiaRegistryEntryAdded,
        [
            this.NOIA_REGISTRY_ENTRY_ADDED_EVENT
        ],
        options);
}

BaseClient.prototype.stopWatchingJobPostAddedEvents = function () {
    this._stopWatchingEvent('job_post_added')
}

/**
 * Sign message by client owner's private key
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.signMessage = function (msg) {
    return signMessage(msg, this.ownerPrivateKey);
}

BaseClient.prototype._startWatchingEvent = async function (eventName, filterFunc, topics, options_) {
    let options = options_ || {};
    let fromBlock = options.fromBlock || await util.promisify(this.web3.eth.getBlockNumber)();
    let pollingInterval = options.pollingInterval || 5000;
    // currently using polling
    // TODO: support pubusb if websocket provider is used
    if (!this.eventHandlers[eventName]) {
        let handler = this.eventHandlers[eventName] = {
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

                let filter = filterFunc({}, {
                    fromBlock: handler.latestSyncedBlock,
                    toBlock: 'latest',
                    topics: topics,
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
                        that.emit(eventName, log.args.baseContract);
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
                this.logger.error(`poll events@${eventName} error`, error);
            }
            handler.polling = false;
        };
        pollEvents();
        handler.intervalId = setInterval(pollEvents, pollingInterval);
    } else {
        throw new Error(`Already watching events@${eventName}`);
    }
}

BaseClient.prototype._stopWatchingEvent = function (eventName) {
    let handler = this.eventHandlers[eventName];
    if (handler) {
        clearInterval(handler.intervalId);
        delete this.eventHandlers[eventName];
    } else {
        throw new Error(`Not watching the events@${eventName}`);
    }
}

module.exports = BaseClient;
