'use strict';

require('./test_common.js');

const sdk = require('../../');

const util = require('util');
const assert = require('assert');
const should = require('should');

contract('NOIA Governance SDK tests: ', function (accounts) {
    const acc0 = accounts[0];
    const acc1 = accounts[1];

    var nodeClient;
    var businessClient;

    before(async () => {
        let noia, factory;
        if (typeof artifacts !== 'undefined') {
            noia = await artifacts.require('NoiaNetwork').deployed();
            factory = await artifacts.require("NoiaContractsFactoryV1").deployed();
        }
        await sdk.init(web3.currentProvider, acc0, noia, factory);

        nodeClient = await sdk.createNodeClient({host : '127.0.0.1'});
        console.log(`Node client created at ${nodeClient.address}`);
        businessClient = await sdk.createBusinessClient({/* business info missing */});
        console.log(`Business client created at ${businessClient.address}`);
    })

    after(() => {
        sdk.uninit();
    })

    it('message signing & validation', async () => {
        let msg = "good weather in vilnius";
        let sgn = await businessClient.signMessage(msg);
        console.log(`signed: ${sgn} by business at ${businessClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(businessClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromSignedMessage(msg, sgn));
    })

    it('node registration event watching', async () => {
        console.log(`start watching node events`);
        await businessClient.startWatchingNodeEvents({
            pollingInterval: 1000 // faster!!
        });
        let nodeAddresses = {};
        await new Promise(async function (resolve, reject) {
            let nodeClient1;
            businessClient.on('node_entry_added', function (nodeAddress) {
                console.log('node_entry_added', nodeAddress);
                nodeAddresses[nodeAddress] = true;
                if (nodeClient1 && nodeClient1.address in nodeAddresses) resolve();
            });
            console.log('creating new node client');
            nodeClient1 = await sdk.createNodeClient({host : '127.0.0.1'});
            console.log(`Created new node client at ${nodeClient1.address}`);
            if (nodeClient1.address in nodeAddresses) resolve();
        });
        businessClient.stopWatchingNodeEvents();
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
