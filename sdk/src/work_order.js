'use strict';

const {
    sendTransactionAndWaitForReceiptMined,
    rpcSignPacked,
    hexRemove0x
} = require('../../common/web3_utils.js');

class WorkOrder {
    constructor(owner, contracts, contract, jobPost, logger) {
        this.logger = logger;
        this.contracts = contracts;
        this.contract = contract;
        this.address = contract.address;
        this.jobPost = jobPost;
        // the sender will be the wallet who's sdk created WorkOrder
        this.web3 = this.contract.constructor.web3;
        this.accountOwner = owner || this.web3.currentProvider.addresses[0];
        this.nonces = {};
    }

    async accept() {
        const logger = this.logger;
        const web3 = this.web3;
        const owner = this.accountOwner;
        logger.info(`Accepting work order... from wallet address: ${owner}`);
        let tx = await sendTransactionAndWaitForReceiptMined(web3, this.contract.accept,
            { from: owner });
        return tx;
    }

    async delegatedAccept(nonce, sig) {
        const logger = this.logger;
        const web3 = this.web3;
        const owner = this.accountOwner;
        logger.info(`Accepting work order (delegated)! Nonce: ${nonce}, signature: ${sig} ... from wallet address: ${owner}`);
        let tx = await sendTransactionAndWaitForReceiptMined(web3, this.contract.delegatedAccept,
            { from: owner },
            nonce, sig);
        return tx;
    }

    async generateSignedAcceptRequest() {
        const logger = this.logger;
        const method = "accept";
        const web3 = this.web3;
        const owner = this.accountOwner;
        let nonce = this.nonces[method];
        if (!nonce) { nonce = 0; }
        this.nonces[method] = ++nonce;
        // console.log(`signAcceptRequest! For wallet owner: ${owner}, work order address: ${this.address}`);
        const sig = await rpcSignPacked(web3, owner, // sign with acc1 - which created worker0
            {t: "address", v: hexRemove0x(this.address)}, // "69a6df83fdfa5f75d9e631bc1d36c7573b5fa52e"
            {t: "string", v: method},
            {t: "uint256", v: nonce});
        return {
            workOrder: this.address,
            owner: owner,
            nonce: nonce,
            sig: sig
        }
    }

    async isAccepted() {
        return await this.contract.isAccepted();
    }

    async timelock(lockedAmount, lockUntil) {
        const logger = this.logger;
        const web3 = this.web3;
        const owner = this.accountOwner;
        logger.info(`Setting timelocked tokens, amount: ${lockedAmount}, until: ${lockUntil} to work order: ${this.address} ... from wallet address: ${owner}`);
        let tx = await sendTransactionAndWaitForReceiptMined(web3, this.contract.timelock,
            { from: owner },
            lockedAmount, lockUntil);
        return tx;
    }

    async getTimelocks() {
        const timelocks = await this.contract.getTimelocks.call();
        const amounts = timelocks[0];
        const untils = timelocks[1];
        const results = [];
        for (let i=0; i < amounts.length; i++) {
            const amount = amounts[i];
            const until = untils[i];
            if (until <= 0) { continue; }
            results.push({
                amount: amount.toNumber(),
                until: until.toNumber()
            });
        }
        return results;
    }

    async hasTimelockedTokens() {
        const timelocks = await this.getTimelocks();
        return timelocks.length > 0;
    }

    async getTimelockedEarliest() {
        const timelocks = await this.getTimelocks();
        let earliest;
        for (let i=0; i < timelocks.length; i++) {
            const tl = timelocks[i];
            if (!earliest) { earliest = tl;}
            if (tl.until < earliest.until) {
                earliest = tl;
            }
        }
        return earliest;
    }

    async delegatedRelease(beneficiary, nonce, sig) {
        const logger = this.logger;
        const web3 = this.web3;
        const owner = this.accountOwner;
        logger.info(`Releasing funds (delegated) from work order! Beneficiary: ${beneficiary}, nonce: ${nonce}, signature: ${sig} ... from wallet address: ${owner}`);
        let tx = await sendTransactionAndWaitForReceiptMined(web3, this.contract.delegatedRelease,
            { from: owner, gasLimit: 192594 },
            beneficiary, nonce, sig);
        return tx;
    }

    async generateSignedReleaseRequest(beneficiary) {
        const logger = this.logger;
        const method = "release";
        const web3 = this.web3;
        // TODO! Check if beneficiary is provided then if it is a contract address then if it is ERC332 compliant contract
        const owner = beneficiary || this.accountOwner;
        let nonce = this.nonces[method];
        if (!nonce) { nonce = 0; }
        this.nonces[method] = ++nonce;
        // console.log(`signReleaseRequest! For wallet owner: ${owner}, work order address: ${this.address}`);
        const sig = await rpcSignPacked(web3, owner, // sign with acc1 - which created worker0
            {t: "address", v: hexRemove0x(this.address)}, // "69a6df83fdfa5f75d9e631bc1d36c7573b5fa52e"
            {t: "string", v: method},
            {t: "address", v: hexRemove0x(beneficiary)},
            {t: "uint256", v: nonce});
        return {
            workOrder: this.address,
            owner: owner,
            beneficiary: beneficiary,
            nonce: nonce,
            sig: sig
        }
    }

    async totalVested() {
        return await this.contract.totalVested.call();
    }

    async totalFunds() {
        return await this.contract.totalFunds.call();
    }

    getJobPost() {
        return this.jobPost;
    }

    static async getInstance(logger, contracts, owner, workOrderAddress) {
        const workOrderContract = await contracts.NoiaWorkOrder.at(workOrderAddress);
        const jobPostAddress = await workOrderContract.jobPost.call();
        const jobPost = await contracts.NoiaJobPost.at(jobPostAddress);
        return await new WorkOrderConstructor(owner, contracts, workOrderContract, jobPost, logger);
    }
}

// just because we can call: `await new WorkOrder()` when using it
function WorkOrderConstructor(owner, contracts, workOrderContract, jobPostContract, logger) {
    const JobPost = require('./job_post.js');
    return new Promise(async (resolve, reject) => {
        try {
            const jobPost = await JobPost.getInstance(owner, contracts, jobPostContract.address, logger);
            const workOrder = new WorkOrder(owner, contracts, workOrderContract, jobPost, logger);
            resolve(workOrder);
        } catch (err) {
            reject(err);
        }
    });
}
WorkOrderConstructor.getInstance = WorkOrder.getInstance;

module.exports = WorkOrderConstructor;
