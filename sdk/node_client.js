'use strict';

const BaseClient = require('./base_client');
const inherits = require('util').inherits;

const NEW_NODE_GAS                      = 1000000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    signMessage,
    rpcSignMessage,
    bytesToString
} = require('../common/web3_utils.js');

inherits(NodeClient, BaseClient)
function NodeClient(options) {
    BaseClient.call(this, options);

    this.address = options.at;
    this.info = options.info;
};

NodeClient.prototype.init = async function () {
    this.nodeRegistry = this.contracts.NoiaRegistry.at(await this.marketplace.nodeRegistry.call());
    if (this.address) {
        if (await this.nodeRegistry.hasEntry.call(this.address)) {
            this.contract = await this.contracts.NoiaNode.at(this.address);
        } else {
            throw Error(`Node does not exist at ${this.address}`);
        }
    } else {
        console.log(`Creating new node...`);
        let tx = await this.factory.createNode('application/json', JSON.stringify(this.info), { from: this.owner, gas: NEW_NODE_GAS });
        this.address = tx.logs[0].args.nodeAddress;
        console.log(`Node created at ${this.address}@${tx.receipt.blockNumber}, gas used ${getGasUsedForTransaction(tx)}`);
        this.contract = await this.contracts.NoiaNode.at(this.address);
    }
}

NodeClient.prototype.getInfo = async function (msg) {
    let type = bytesToString(await this.contract.infoType.call());
    let data = bytesToString(await this.contract.infoData.call());
    if (type == 'application/json') {
        return JSON.parse(data);
    } else {
        return {
            type: type,
            data: data
        }
    }
}

// events
//   - certificate_contract_received
//   - certificate_contract_updated
//   - certificate_contract_revoked
//   - work_contract_received
//   - work_contract_signed

module.exports = NodeClient;
