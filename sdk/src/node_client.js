'use strict';

const BaseClient = require('./base_client');
const inherits = require('util').inherits;

const {
  isContract,
  getGasUsedForContractCreation,
  getGasUsedForTransaction,
  waitEventsFromWatcher,
  signMessage,
  rpcSignMessage,
  bytesToString,
  sendTransactionAndWaitForReceiptMined
} = require('../../common/web3_utils.js');

inherits(NodeClient, BaseClient)
function NodeClient(options) {
  let self = this;
  return new Promise(async function (resolve, reject) { try {
    await BaseClient.call(self, options);
    self.address = options.at;
    if (self.address) {
      if (await self.nodeRegistry.hasEntry.call(self.address)) {
        self.contract = await self.contracts.NoiaNode.at(self.address);
      } else {
        throw Error(`Node does not exist at ${self.address}`);
      }

      // load info
      let infoType = bytesToString(await self.contract.infoType.call());
      self.info = bytesToString(await self.contract.infoData.call());
      if (infoType == 'application/json') {
        try {
          self.info = JSON.parse(self.info);
        } catch (error) {
          logger.info(`Parse node @${self.contract.address} json info failed`, self.info);
        }
      }
    } else {
      self.info = options.info;
      if (typeof self.info !== 'object') {
        throw new Error('options.info has to be an object');
      }
      self.logger.info(`Creating new node...`, self.info, self.factories.node.create.constructor.name);
      let tx = await sendTransactionAndWaitForReceiptMined(self.web3, self.factories.node.create,
                                                           { from: self.accountOwner },
                                                           'application/json', JSON.stringify(self.info));
      self.address = tx.logs[0].args.contractInstance;
      self.logger.info(`Node created at ${self.address}@${tx.receiptMined.blockNumber}, gas used ${getGasUsedForTransaction(tx)}`);
      self.contract = await self.contracts.NoiaNode.at(self.address);
    }
    resolve(self);
  } catch (error) {
    reject(error);
  }});
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

module.exports = NodeClient;
