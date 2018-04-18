'use strict';

const sdk = require('../../');
const truffleConfig = require('../../truffle.js');

const Web3 = require('web3');
const should = require('should');

contract('NOIA Governance SDK Test', (accounts) => {
    const acc0 = accounts[0];
    const acc1 = accounts[1];
    const provider = new Web3.providers.HttpProvider(`http://${truffleConfig.networks.local.host}:${truffleConfig.networks.local.port}`);

    var nodeClient;
    var businessClient;

    before(async () => {
        let noia = await artifacts.require('NoiaNetwork').deployed();
        let factory = await artifacts.require("NoiaContractsFactoryV1").deployed();
        await sdk.init(provider, accounts, noia, factory);
    })

    after(() => {
        sdk.uninit();
    })

    beforeEach(async () => {
        nodeClient = await sdk.getNodeClient();
        console.log(`Node client created at ${nodeClient.address}`);
        businessClient = await sdk.getBusinessClient();
        console.log(`Business client created at ${nodeClient.address}`);
    })

    it.only('Test message signing', async () => {
        let msg = "good weather in vilnius";
        let sgn = await businessClient.signMessage(msg);
        console.log(`signed: ${sgn} by business at ${businessClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(businessClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromSignedMessage(msg, sgn));
    })

    it("Transfer tokens", async () => {
        let oldBalance = await sdk.balanceOf(acc1);
        await sdk.transfer(acc0, acc1, 100);
        let newBalance = await sdk.balanceOf(acc1);
        assert.equal(oldBalance + 100, newBalance);
    })

    it("Transfer too many tokens", async () => {
        let maxBalance = await sdk.balanceOf(acc0);
        await sdk.transfer(acc0, acc1, maxBalance + 1).should.be.rejected();
    })
});
