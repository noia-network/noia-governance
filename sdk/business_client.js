'use strict';

const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits;
const contract = require("truffle-contract");

const NEW_BUSINESS_GAS                  = 1200000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    recoverAddress
} = require('../common/web3_utils.js');

inherits(BusinessCient, EventEmitter)
function BusinessCient(contracts, owner, marketplace, factory, address) {
    this.contracts = contracts;
    this.owner = owner;
    this.marketplace = marketplace;
    this.factory = factory;
    this.address = address;
};

BusinessCient.prototype.init = async function () {
    this.businessRegistry = this.contracts.NoiaRegistry.at(await this.marketplace.businessRegistry.call());
    if (this.address) {
        if (businessRegistry.hasEntry.call(this.address)) {
            this.contract = await NoiaBusiness.at(this.address);
        } else {
            throw Error(`Business does not exist at ${this.address}`);
        }
    } else {
        console.log(`Creating new business...`);
        let tx = await this.factory.createBusiness({ gas: NEW_BUSINESS_GAS });
        this.contract = this.contracts.NoiaBusiness.at(tx.logs[0].args.businessAddress);
        console.log(`Business created at ${this.contract.address}, gas used ${getGasUsedForTransaction(tx)}`);
    }
}

/**
 * use this message when you want to prove your ownership of the node contract
 */
BusinessCient.prototype.signMessage = async function (msg) {
    return await web3.eth.sign(this.owner, web3.sha3(msg));
}

// events
//...

module.exports = BusinessCient;
