'use strict';

const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits;
const contract = require("truffle-contract");

const NEW_NODE_GAS                      = 700000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    signMessage
} = require('../common/web3_utils.js');

inherits(NodeClient, EventEmitter)
function NodeClient(contracts, owner, marketplace, factory, address) {
    this.contracts = contracts;
    this.owner = owner;
    this.marketplace = marketplace;
    this.factory = factory;
    this.address = address;
    this.web3 = this.marketplace.constructor.web3;
};

NodeClient.prototype.init = async function () {
    this.nodeRegistry = this.contracts.NoiaRegistry.at(await this.marketplace.nodeRegistry.call());
    if (this.address) {
        if (nodeRegistry.hasEntry.call(this.address)) {
            this.contract = await NoiaNode.at(this.address);
        } else {
            throw Error(`Node does not exist at ${this.address}`);
        }
    } else {
        console.log(`Creating new node...`);
        let tx = await this.factory.createNode({ gas: NEW_NODE_GAS });
        this.contract = this.contracts.NoiaNode.at(tx.logs[0].args.nodeAddress);
        this.address = this.contract.address;
        console.log(`Node created at ${this.contract.address}, gas used ${getGasUsedForTransaction(tx)}`);
    }
}

/**
 * use this message when you want to prove your ownership of the node contract
 */
NodeClient.prototype.signMessage = async function (msg) {
    return await signMessage(web3, this.owner, msg);
}

// events
//   - certificate_contract_received
//   - certificate_contract_updated
//   - certificate_contract_revoked
//   - work_contract_received
//   - work_contract_signed

module.exports = NodeClient;
