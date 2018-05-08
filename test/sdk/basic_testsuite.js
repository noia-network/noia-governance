'use strict';

require('./test_common.js');

const sdk = require('../../');

const util = require('util');
const assert = require('chai').assert;
const should = require('should');

contract('NOIA Governance SDK functional tests: ', function (accounts) {
    const acc0 = accounts[0];
    const acc1 = accounts[1];

    var nodeClient;
    var businessClient;

    before(async () => {
        let noia, factory;
        let initOptions = {
            web3 : {
                provider : web3.currentProvider,
            },
            account : {
                owner: acc0,
            }
        };
        if (typeof artifacts !== 'undefined') {
            initOptions.deployed_contracts = {
                noia : await artifacts.require('NoiaNetwork').deployed(),
                factory : await artifacts.require("NoiaContractsFactoryV1").deployed()
            };
        }

        await sdk.init(initOptions);
        nodeClient = await sdk.createNodeClient({host : '127.0.0.1'});
        console.log(`Node client created at ${nodeClient.address}`);
        businessClient = await sdk.createBusinessClient({/* business info missing */});
        console.log(`Business client created at ${businessClient.address}`);
    })

    after(() => {
        sdk.uninit();
    })

    it('rpc message signing & validation', async () => {
        let msg = "good weather in vilnius";
        let sgn = await businessClient.rpcSignMessage(msg);
        console.log(`signed: ${sgn} by business at ${businessClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(businessClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromRpcSignedMessage(msg, sgn));
    })

    it('message signing & validation', async () => {
        let msg = "good weather in vilnius too";
        let sgn = businessClient.signMessage(msg);
        console.log(`signed: ${sgn} by business at ${businessClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(businessClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromSignedMessage(msg, sgn));
    })

    it('business client registration', async () => {
        let businessClient1 = await sdk.createBusinessClient({/* business info missing */});
        assert.isTrue(await sdk.isBusinessRegistered(businessClient1.address));
        console.log(`Business client 1 created at ${businessClient1.address}`);
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
            assert.isTrue(await sdk.isNodeRegistered(nodeClient1.address));
            console.log(`Created new node client at ${nodeClient1.address}`);
            if (nodeClient1.address in nodeAddresses) resolve();
        });
        businessClient.stopWatchingNodeEvents();
    })

    it("Transfer ether", async () => {
        let ethBalanceOldAcc0 = await sdk.getEtherBalance(acc0);
        let ethBalanceOldAcc1 = await sdk.getEtherBalance(acc1);

        await sdk.transferEther(acc1, 0.001);

        let ethBalanceNewAcc0 = await sdk.getEtherBalance(acc0);
        let ethBalanceNewAcc1 = await sdk.getEtherBalance(acc1);

        assert.isTrue(ethBalanceNewAcc0 + 0.001 < ethBalanceOldAcc0);
        assert.isTrue(ethBalanceNewAcc1 > ethBalanceOldAcc1);
    })

    it("Transfer noia tokens", async () => {
        let oldBalance = await sdk.getNoiaBalance(acc1);
        await sdk.transferNoiaToken(acc1, 100);
        let newBalance = await sdk.getNoiaBalance(acc1);
        assert.equal(oldBalance + 100, newBalance);
    })

    it("Transfer too many tokens", async () => {
        let maxBalance = await sdk.getNoiaBalance(acc0);
        await sdk.transferNoiaToken(acc1, maxBalance + 1).should.be.rejected();
    })
});
