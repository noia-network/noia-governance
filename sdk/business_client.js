'use strict';

const BaseClient = require('./base_client');
const JobPost = require('./job_post');
const inherits = require('util').inherits;

const NEW_BUSINESS_GAS                  = 1200000;

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    signMessage,
} = require('../common/web3_utils.js');

inherits(BusinessClient, BaseClient)
function BusinessClient(options) {
    let self = this;
    return new Promise(async function (resolve, reject) { try {
        await BaseClient.call(self, options);
        self.address = options.at;
        self.info = options.info;
        if (self.address) {
            if (await self.businessRegistry.hasEntry.call(self.address)) {
                self.contract = await self.contracts.NoiaBusiness.at(self.address);
            } else {
                throw Error(`Business does not exist at ${self.address}`);
            }
        } else {
            self.logger.info(`Creating new business...`);
            let tx = await self.factories.business.create({ from: self.accountOwner, gas: NEW_BUSINESS_GAS });
            self.contract = await self.contracts.NoiaBusiness.at(tx.logs[0].args.contractInstance);
            self.address = self.contract.address;
            self.logger.info(`Business created at ${self.contract.address}, gas used ${getGasUsedForTransaction(tx)}`);
        }
        resolve(self);
    } catch (error) {
        reject(error);
    }});
}

/**
 * [async] Create new job post for the business
 *
 * @param jobPostInfo - Meta info about the job post
 * @return jobPost contract instance
 */
BusinessClient.prototype.createJobPost = async function (jobPostInfo) {
    return await JobPost.createInstance(this.accountOwner, this.contracts, this.factories.jobPost, this.address, jobPostInfo, this.logger);
}

module.exports = BusinessClient;
