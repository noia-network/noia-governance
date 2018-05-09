'use strict';

const {
    bytesToString,
    getGasUsedForTransaction
} = require('../common/web3_utils.js');

const NEW_JOBPOST_GAS                   = 2000000;

function JobPost(contract, logger, jobPostInfo) {
    let self = this;
    return new Promise(async function (resolve, reject) { try {
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

JobPost.createInstance = async function (owner, JobPostContract, factory, employerAddress, jobPostInfo, logger) {
    logger.info('Creating new job post...', jobPostInfo);
    let tx = await factory.create(employerAddress, 'application/json', JSON.stringify(jobPostInfo), { from: owner, gas: NEW_JOBPOST_GAS })
    let jobPostAddress = tx.logs[0].args.contractInstance;
    logger.info(`Job post created at ${jobPostAddress}@${tx.receipt.blockNumber}, gas used ${getGasUsedForTransaction(tx)}`);
    let jobPost = await JobPostContract.at(jobPostAddress);
    return await new JobPost(jobPost, logger, jobPostInfo);
}

JobPost.getInstance = async function (JobPostContract, at, logger) {
    let jobPost = await JobPostContract.at(at);
    return await new JobPost(jobPost, logger);
}

module.exports = JobPost;
