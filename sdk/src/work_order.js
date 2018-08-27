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
        return await this.contract.getTimelocks.call();
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

    static async getInstance(logger, contracts, owner, workOrderAddress) {
        const workOrderContract = await contracts.NoiaWorkOrder.at(workOrderAddress);
        return await new WorkOrderConstructor(owner, contracts, workOrderContract, logger);
    }
}

// just because we can call: `await new WorkOrder()` when using it
function WorkOrderConstructor() {
    return new Promise((resolve, reject) => {
        const workOrder = new WorkOrder(...Array.from(arguments));
        resolve(workOrder);
    });
}
WorkOrderConstructor.getInstance = WorkOrder.getInstance;

module.exports = WorkOrderConstructor;
