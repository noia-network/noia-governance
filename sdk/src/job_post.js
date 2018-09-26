'use strict';

const BusinessClient = require('./business_client.js');
const WorkOrder = require('./work_order.js');

const {
  bytesToString,
  getGasUsedForTransaction,
  sendTransactionAndWaitForReceiptMined
} = require('../../common/web3_utils.js');

class JobPost {
  constructor(owner, contracts, contract, logger, info) {
    this.logger = logger;
    this.contracts = contracts;
    this.contract = contract;
    this.address = contract.address;
    this.info = info;
    // the sender will be the wallet who's sdk created WorkOrder
    this.web3 = this.contract.constructor.web3;
    this.accountOwner = owner || this.web3.currentProvider.addresses[0];
  }

  async getEmployerAddress() {
    return await this.contract.employer.call();
  }

  async createWorkOrder(toWorkerOwnerAddress) {
    const logger = this.logger;
    const web3 = this.web3;
    const owner = this.accountOwner;
    logger.info(`Creating new work order... from wallet address: ${owner}, to worker owner: ${toWorkerOwnerAddress}`);
    let tx = await sendTransactionAndWaitForReceiptMined(web3, this.contract.createWorkOrder,
                                                         { from: owner },
                                                         toWorkerOwnerAddress);
    const workOrderAddress = tx.logs[0].args.contractInstance;
    const workOrderContract = await this.contracts.NoiaWorkOrder.at(workOrderAddress);
    return await new WorkOrder(owner, this.contracts, workOrderContract, this.contract, logger);
  }

  async getWorkOrder(workerOwner) {
    const logger = this.logger;
    const owner = this.accountOwner;
    logger.info(`Getting a work order for the owner: ${workerOwner}. Job post: ${this.address}`);
    const workOrderAddress = await this.contract.getWorkOrder(workerOwner);
    return this.getWorkOrder(workOrderAddress);
  }

  async getWorkOrderAt(workOrderAddress) {
    const logger = this.logger;
    const owner = this.accountOwner;
    logger.info(`Getting an existing work order. Work order address: ${workOrderAddress}, job post: ${this.address}`);
    const workOrderContract = await this.contracts.NoiaWorkOrder.at(workOrderAddress);
    return await new WorkOrder(owner, this.contracts, workOrderContract, this.contract, logger);
  }

  static async createInstance(owner, contracts, factory, employerAddress, jobPostInfo, logger) {
    logger.info('Creating new job post...', jobPostInfo);
    let web3 = factory.constructor.web3;
    let tx = await sendTransactionAndWaitForReceiptMined(web3, factory.create,
                                                         { from: owner },
                                                         employerAddress, 'application/json', JSON.stringify(jobPostInfo));
    let jobPostAddress = tx.logs[0].args.contractInstance;
    logger.info(`Job post created at ${jobPostAddress}@${tx.receipt.blockNumber}, gas used ${getGasUsedForTransaction(tx)}`);
    let jobPost = await contracts.NoiaJobPost.at(jobPostAddress);
    return await new JobPostConstructor(owner, contracts, jobPost, logger, jobPostInfo);
  }

  static async getInstance(owner, contracts, at, logger) {
    let jobPost = await contracts.NoiaJobPost.at(at);
    return await new JobPostConstructor(owner, contracts, jobPost, logger);
  }
}

// just because we can call: `await new JobPost()` when using it
function JobPostConstructor(owner, contracts, contract, logger, jobPostInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      const self = {};
      if (!jobPostInfo) {
        let infoType = bytesToString(await contract.infoType.call());
        self.info = bytesToString(await contract.infoData.call());
        if (infoType == 'application/json') {
          try {
            self.info = JSON.parse(self.info);
          } catch (error) {
            logger.info(`Parse job post @${contract.address} json info failed`, self.info);
          }
        }
      } else {
        self.info = jobPostInfo;
      }
      const jobPost = new JobPost(owner, contracts, contract, logger, self.info);
      resolve(jobPost);
    } catch (error) {
      reject(error);
    }
  });
}
// forward statics
JobPostConstructor.createInstance = JobPost.createInstance;
JobPostConstructor.getInstance = JobPost.getInstance;

module.exports = JobPostConstructor;
