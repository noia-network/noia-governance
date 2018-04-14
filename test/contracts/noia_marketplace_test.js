'use strict';

const NoiaMarketplace = artifacts.require('NoiaMarketplace');
const NoiaNetwork = artifacts.require('NoiaNetwork');
const NoiaNode = artifacts.require('NoiaNode');
const NoiaBusiness = artifacts.require('NoiaBusiness');
const NoiaCertificate = artifacts.require('NoiaCertificate');

const {
    setBeforeAllTimeout,
    setTestTimeout
} = require('./test_common.js');

const {
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher
} = require('../../common/web3_utils.js');

contract('NOIA marketplace tests: ', function (accounts) {
    const NEW_NODE_GAS = 200000;
    const REGISTER_NODE_GAS = 100000;
    const NEW_BUSINESS_GAS = 200000;
    const REGISTER_BUSINESS_GAS = 100000;
    const NEW_CERTIFICATE_GAS = 300000;
    const REGISTER_CERTIFICATE_GAS = 300000;

    const acc0 = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[1];

    var marketplace;

    before(async function() {
        setBeforeAllTimeout(this);

        let noia = await NoiaNetwork.deployed();
        marketplace = NoiaMarketplace.at(await noia.marketplace.call());
    });

    it('register new node', async function() {
        setTestTimeout(this, 2);

        let tx;
        let nodeRegisteredEventWatcher = marketplace.NodeRegistered();

        console.log('Creating new node...');
        let node = await NoiaNode.new({ gas: NEW_NODE_GAS });
        console.log(`Node created, gas used ${await getGasUsedForContractCreation(node)}`);

        console.log('Register the new node...');
        tx = await marketplace.registerNode(node.address, { gas: REGISTER_NODE_GAS });
        console.log(`Node registered, gas used ${getGasUsedForTransaction(tx)}`);

        assert.equal(1, await marketplace.getNodeRegistryVersion.call(node.address));
        assert.equal(1, await marketplace.getNodeContractVersion.call(node.address));
        let nodeRegisteredEvents = await waitEventsFromWatcher(nodeRegisteredEventWatcher, 1);
        assert.equal(1, nodeRegisteredEvents.length);
        assert.equal(node.address, nodeRegisteredEvents[0].args.nodeAddress.valueOf());
    });

    it('register new business', async function() {
        setTestTimeout(this, 2);

        let tx;
        let businessRegisteredEventWatcher = marketplace.BusinessRegistered();

        console.log('Creating new business...');
        let business = await NoiaBusiness.new({ gas: NEW_BUSINESS_GAS });
        console.log(`Business created, gas used ${await getGasUsedForContractCreation(business)}`);

        console.log('Register the new business...');
        tx = await marketplace.registerBusiness(business.address, { gas: REGISTER_BUSINESS_GAS });
        console.log(`Business registered, gas used ${getGasUsedForTransaction(tx)}`);

        assert.equal(1, await marketplace.getBusinessRegistryVersion.call(business.address));
        assert.equal(1, await marketplace.getBusinessContractVersion.call(business.address));
        let events = await waitEventsFromWatcher(businessRegisteredEventWatcher, 1);
        assert.equal(1, events.length);
        assert.equal(business.address, events[0].args.businessAddress.valueOf());
    });

    it('register new certificate', async function() {
        setTestTimeout(this, 4);

        let tx;
        let certificateRegisteredEventWatcher = marketplace.CertificateRegistered();

        console.log('Creating new node...');
        let node = await NoiaNode.new({ gas: NEW_NODE_GAS });
        console.log(`Node created, gas used ${await getGasUsedForContractCreation(node)}`);

        console.log('Creating new business...');
        let business = await NoiaBusiness.new({ gas: NEW_BUSINESS_GAS });
        console.log(`Business created, gas used ${await getGasUsedForContractCreation(business)}`);

        console.log('Creating new certificate...');
        let certificate = await NoiaCertificate.new(business.address, node.address, { gas: NEW_CERTIFICATE_GAS });
        console.log(`Certificate created, gas used ${await getGasUsedForContractCreation(certificate)}`);

        console.log('Register the new certificate...');
        tx = await marketplace.registerCertificate(certificate.address, { gas: REGISTER_CERTIFICATE_GAS });
        console.log(`Business registered, gas used ${getGasUsedForTransaction(tx)}`);

        assert.equal(1, await marketplace.getCertificateRegistryVersion.call(certificate.address));
        assert.equal(1, await marketplace.getCertificateContractVersion.call(certificate.address));
        let events = await waitEventsFromWatcher(certificateRegisteredEventWatcher, 1);
        assert.equal(1, events.length);
        assert.equal(business.address, events[0].args.issuer.valueOf());
        assert.equal(node.address, events[0].args.recipient.valueOf());
    });
})
