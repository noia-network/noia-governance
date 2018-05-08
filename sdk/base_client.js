'use strict';

const inherits = require('util').inherits;

const {
    signMessage,
    rpcSignMessage
} = require('../common/web3_utils.js');

inherits(BaseClient, require('events').EventEmitter)
function BaseClient(options) {
    this.web3 = options.web3;
    this.contracts = options.contracts;
    this.owner = options.account.owner;
    this.ownerPrivateKey = options.account.ownerPrivateKey;
    this.marketplace = options.instances.marketplace;
    this.factory = options.instances.factory;
}

/**
 * Sign message through rpc
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.rpcSignMessage = async function (msg) {
    return await rpcSignMessage(this.web3, msg, this.owner);
}

/**
 * Sign message by client owner's private key
 * @param string msg - msg to sign
 * @return Signature object
 */
BaseClient.prototype.signMessage = function (msg) {
    return signMessage(msg, this.ownerPrivateKey);
}

module.exports = BaseClient;
