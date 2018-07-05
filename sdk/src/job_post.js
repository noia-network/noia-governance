'use strict';

const BusinessClient = require('./business_client.js');

const {
    bytesToString,
    getGasUsedForTransaction,
    sendTransactionAndWaitForReceiptMined
} = require('../../common/web3_utils.js');

function JobPost(contracts, contract, logger, jobPostInfo) {
    let self = this;
    return new Promise(async function (resolve, reject) { try {
        self.contracts = contracts;
        self.contract = contract;
        self.address = contract.address;
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
        resolve(self);
    } catch (error) {
        reject(error);
    }});
}

JobPost.prototype.getEmployerAddress = async function () {
    return await this.contract.employer.call();
}

JobPost.createInstance = async function (owner, contracts, factory, employerAddress, jobPostInfo, logger) {
    logger.info('Creating new job post...', jobPostInfo);
    let web3 = factory.constructor.web3;
    let tx = await sendTransactionAndWaitForReceiptMined(web3, factory.create,
        { from: owner },
        employerAddress, 'application/json', JSON.stringify(jobPostInfo));
    let jobPostAddress = tx.logs[0].args.contractInstance;
    logger.info(`Job post created at ${jobPostAddress}@${tx.receipt.blockNumber}, gas used ${getGasUsedForTransaction(tx)}`);
    let jobPost = await contracts.NoiaJobPost.at(jobPostAddress);
    return await new JobPost(contracts, jobPost, logger, jobPostInfo);
}

JobPost.getInstance = async function (contracts, at, logger) {
    let jobPost = await contracts.NoiaJobPost.at(at);
    return await new JobPost(contracts, jobPost, logger);
}

module.exports = JobPost;
