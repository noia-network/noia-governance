'use strict';

const util = require('util');
const inherits = require('util').inherits;
const WorkOrder = require('./work_order');

const LOGS_NUM_BLOCKS_TO_WATCH = 1;

const {
    signMessage,
    rpcSignMessage,
    rpcSignPacked
} = require('../../common/web3_utils.js');

inherits(BaseClient, require('events').EventEmitter)
function BaseClient(options) {
    let self = this;
    return new Promise(async function (resolve, reject) { try {
        self.logger = options.logger;
        self.web3 = options.web3;
        self.contracts = options.contracts;
        self.accountOwner = options.account.owner;
        self.accountOwnerPrivateKey = options.account.ownerPrivateKey;
        self.marketplace = options.instances.marketplace;
        self.factories = options.instances.factories;
        self.eventHandlers = {};

        self.businessRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.businessRegistry.call());
        self.nodeRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.nodeRegistry.call());
        self.jobPostRegistry = self.contracts.NoiaRegistry.at(await self.marketplace.jobPostRegistry.call());

        self.NOIA_REGISTRY_ENTRY_ADDED_EVENT = self.web3.sha3('NoiaRegistryEntryAdded(address)');

        resolve(self);
    } catch (error) {
        reject(error);
    }});
}

BaseClient.prototype.getWorkOrderAt = async function(workOrderAddress) {
    return WorkOrder.getInstance(this.logger, this.contracts, this.accountOwner, workOrderAddress);
}

/**
 * Get owner address of the contract
 * @return address of the owner
 */
BaseClient.prototype.getOwnerAddress = async function () {
    return await this.contract.owner.call();
}

/**
 * [async] Sign message through rpc
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.rpcSignPacked = async function (msg) {
    const params = Array.from(arguments).slice(1);
    return await rpcSignPacked(this.web3, this.accountOwner, ...params);
}

/**
 * [async] Sign message through rpc
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.rpcSignMessage = async function (msg) {
    return await rpcSignMessage(this.web3, msg, this.accountOwner);
}

/**
 * Sign message by client owner's private key
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.signMessage = function (msg) {
    return signMessage(msg, this.accountOwnerPrivateKey);
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
    return this._stopWatchingEvent('node_entry_added', true);
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
    return this._stopWatchingEvent('job_post_added', true);
}

BaseClient.prototype._startWatchingEvent = async function (eventName, filterFunc, topics, options_) {
    let options = options_ || {};
    let fromBlock = options.fromBlock || await util.promisify(this.web3.eth.getBlockNumber)();
    let pollingInterval = options.pollingInterval || 5000;
    // currently using polling
    // TODO: support pubusb if websocket provider is used
    if (!this.eventHandlers[eventName]) {
        let handler = this.eventHandlers[eventName] = {
            disabled: false,
            latestSyncedBlock: fromBlock - LOGS_NUM_BLOCKS_TO_WATCH,
            receivedLogs: { /* blocknumber : [] */},
            pollingInterval: pollingInterval,
            pullMode: options.pullMode || false
        };
        let that = this;
        handler.pollEvents = async function pollEvents () {
            if (handler.disabled) return;
            handler.disabled = true;
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
                for (let i=0; i < logs.length; i++) {
                    const log = logs[i];
                    // avoid multiple firing of the same log
                    if (!handler.receivedLogs[log.blockNumber]) {
                        handler.receivedLogs[log.blockNumber] = []
                    }
                    let receivedLogsOfBlock = handler.receivedLogs[log.blockNumber];
                    if (!receivedLogsOfBlock[log.transactionHash]) {
                        const contractAddress = log.args.baseContract;
                        receivedLogsOfBlock[log.transactionHash] = 1;

                        // check if we enable userland to pull events one by one instead of pushing them
                        if (handler.pullMode) {
                            try {
                                const processNextEvent = await new Promise((resolve, reject) => {
                                    that.emit(eventName, contractAddress, () => {
                                        resolve(false);
                                    });
                                });
                                if (!processNextEvent) {
                                    // skip processing the next event(s)
                                    return;
                                }
                            } catch (err) {
                                // error while waiting for the log event processed
                                console.log(`Error in processing the event!`, err);
                            }
                        } else {
                            that.emit(eventName, contractAddress);
                        }
                    }
                }

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
                that.logger.error(`poll events@${eventName} error`, error);
            }
            handler.disabled = false;
        };
        handler.pollEvents();
        handler.intervalId = setInterval(handler.pollEvents, handler.pollingInterval);
    } else {
        throw new Error(`Already watching events@${eventName}`);
    }
}

BaseClient.prototype._stopWatchingEvent = function (eventName, removeAllListeners) {
    let handler = this.eventHandlers[eventName];
    if (handler) {
        handler.disabled = true;
        clearInterval(handler.intervalId);
        delete this.eventHandlers[eventName];
        if (removeAllListeners) {
            this.removeAllListeners(eventName);
        }
    } else {
        throw new Error(`Not watching the events@${eventName}`);
    }
    // resume watching
    const resume = () => {
        this.eventHandlers[eventName] = handler;
        handler.disabled = false;
        handler.pollEvents();
        handler.intervalId = setInterval(handler.pollEvents, handler.pollingInterval);
    }
    return resume;
}

module.exports = BaseClient;
