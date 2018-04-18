'use strict';

const NoiaNetwork = artifacts.require('NoiaNetwork');
const NoiaMarketplace = artifacts.require('NoiaMarketplace');
const NoiaRegistry = artifacts.require('NoiaRegistry');
const NoiaNode = artifacts.require('NoiaNodeV1');
const NoiaBusiness = artifacts.require('NoiaBusinessV1');
const NoiaCertificate = artifacts.require('NoiaCertificateV1');
const NoiaContractsFactory = artifacts.require("NoiaContractsFactoryV1");

const {
    setBeforeAllTimeout,
    setTestTimeout,
    solAssertBytesEqual
} = require('./test_common.js');

const {
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher
} = require('../../common/web3_utils.js');

const should = require('should');

contract('NOIA noia tests: ', function (accounts) {
    const NEW_NODE_GAS                      = 700000;
    const REGISTER_NODE_GAS                 = 100000;
    const NEW_BUSINESS_GAS                  = 1200000;
    const REGISTER_BUSINESS_GAS             = 200000;
    const NEW_CERTIFICATE_GAS               = 1200000;
    const SIGN_CERTIFICATE_GAS              = 300000;
    const UPDATE_CERTIFICATE_GAS            = 200000;
    const REVOKE_CERTIFICATE_GAS            = 200000;
    const REVOKE_NOTICE_CERTIFICATE_GAS     = 200000;

    const acc0 = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[1];

    var noia;
    var factory;
    var marketplace;
    var node0;
    var business0;

    before(async function() {
        setBeforeAllTimeout(this, 2);

        noia = await NoiaNetwork.deployed();
        factory = await NoiaContractsFactory.deployed();
        marketplace = NoiaMarketplace.at(await noia.marketplace());
    });

    beforeEach(async function () {
        console.log(`----- Test Starts: ${this.currentTest.title}`);
        setTestTimeout(this, 2);
        let tx;

        console.log('Creating node0...');
        tx = await factory.createNode({ gas: NEW_NODE_GAS });
        node0 = NoiaNode.at(tx.logs[0].args.nodeAddress);
        console.log(`Created at ${node0.address}, gas used ${await getGasUsedForTransaction(tx)}`);

        console.log('Creating business0...');
        tx = await factory.createBusiness({ gas: NEW_BUSINESS_GAS });
        business0 = NoiaBusiness.at(tx.logs[0].args.businessAddress);
        console.log(`Created at ${business0.address}, gas used ${await getGasUsedForTransaction(tx)}`);
    })

    afterEach(async function () {
        console.log(`----- Test Ends: ${this.currentTest.title}`);
    })

    it('register a new node', async function() {
        setTestTimeout(this, 2);

        let tx;
        let nodeRegistry = NoiaRegistry.at(await marketplace.nodeRegistry.call());
        let eventWatcher = nodeRegistry.NoiaRegistryEntryAdded();

        await nodeRegistry.addEntry(node0.address, {
            from: acc1,
            gas: REGISTER_NODE_GAS
        }).should.be.rejected();

        let nentry = (await nodeRegistry.count.call()).toNumber();
        console.log('Creating node1...');
        tx = await factory.createNode({ gas: NEW_NODE_GAS });
        let node1 = NoiaNode.at(tx.logs[0].args.nodeAddress);
        console.log(`Created at ${node0.address}, gas used ${await getGasUsedForTransaction(tx)}`);

        assert.isTrue(await nodeRegistry.hasEntry(node1.address));
        assert.equal(nentry + 1, (await nodeRegistry.count.call()).toNumber());
        let events = await waitEventsFromWatcher(eventWatcher, 1);
        assert.equal(1, events.length);
        assert.equal(nodeRegistry.address, events[0].args.registry.valueOf());
        assert.equal(node1.address, events[0].args.baseContract.valueOf());
    });

    it('register a new business', async function() {
        setTestTimeout(this, 2);

        let tx;
        let businessRegistry = NoiaRegistry.at(await marketplace.businessRegistry.call());
        let eventWatcher = businessRegistry.NoiaRegistryEntryAdded();

        await businessRegistry.addEntry(business0.address, {
            from: acc1,
            gas: REGISTER_NODE_GAS
        }).should.be.rejected();

        let nentry = (await businessRegistry.count.call()).toNumber();
        console.log('Creating business1...');
        tx = await factory.createBusiness({ gas: NEW_BUSINESS_GAS });
        let business1 = NoiaBusiness.at(tx.logs[0].args.businessAddress);
        console.log(`Created at ${business1.address}, gas used ${await getGasUsedForTransaction(tx)}`);

        assert.isTrue(await businessRegistry.hasEntry(business1.address));
        assert.equal(nentry + 1, (await businessRegistry.count.call()).toNumber());
        let events = await waitEventsFromWatcher(eventWatcher, 1);
        assert.equal(1, events.length);
        assert.equal(businessRegistry.address, events[0].args.registry.valueOf());
        assert.equal(business1.address, events[0].args.baseContract.valueOf());
    });

    it('create, sign, update and revoke a certificate', async function() {
        setTestTimeout(this, 4);

        let tx;

        let certsSignedEventWatcher = business0.CertificateSignedV1();
        let certsUpdatedEventWatcher = business0.CertificateUpdatedV1();
        let certsRevokedEventWatcher = business0.CertificateRevokedV1();

        console.log('Creating new certificate...');
        let certificate = await NoiaCertificate.new(
            business0.address,
            node0.address,
            "NODE_TEST_CERTIFICATE",
            "application/json",
            JSON.stringify({
                field1: "lorem ipsum",
                field2: "lorem ipsum"
            }),
            { gas: NEW_CERTIFICATE_GAS });
        console.log(`Certificate created, gas used ${await getGasUsedForContractCreation(certificate)}`);

        assert.isFalse(await certificate.signedByBusiness.call());

        console.log('Sign the certificate...');
        tx = await business0.signCertificate(certificate.address, { gas: SIGN_CERTIFICATE_GAS });
        console.log(`Certificate singed, gas used ${getGasUsedForTransaction(tx)}`);
        assert.isTrue(await certificate.signedByBusiness.call());

        let certsSignedEvents = await waitEventsFromWatcher(certsSignedEventWatcher, 1);
        assert.equal(1, certsSignedEvents.length);
        assert.equal(business0.address, certsSignedEvents[0].args.issuer);
        assert.equal(node0.address, certsSignedEvents[0].args.recipient);

        console.log('Update the certificate...');
        tx = await business0.updateCertificate(certificate.address,
            "application/json",
            JSON.stringify({
                field1: "lorem ipsum"
            }),
            { gas: UPDATE_CERTIFICATE_GAS });
        console.log(`Certificate updated, gas used ${getGasUsedForTransaction(tx)}`);

        let certsUpdatedEvents = await waitEventsFromWatcher(certsUpdatedEventWatcher, 1);
        assert.equal(1, certsUpdatedEvents.length);
        assert.equal(business0.address, certsUpdatedEvents[0].args.issuer);
        assert.equal(node0.address, certsUpdatedEvents[0].args.recipient);

        // test payload storage
        let certificadte2 = NoiaCertificate.at(certsSignedEvents[0].args.certificate);
        assert.isTrue(await certificadte2.signedByBusiness.call());
        assert.equal(business0.address, await certificadte2.issuer.call());
        assert.equal(node0.address, await certificadte2.recipient.call());
        solAssertBytesEqual("NODE_TEST_CERTIFICATE", await certificadte2.certificateName.call());
        solAssertBytesEqual("application/json", await certificadte2.payloadType.call());
        solAssertBytesEqual('{"field1":"lorem ipsum"}', await certificadte2.payloadData.call());

        console.log('Sending certificate revoke notice...');
        tx = await business0.sendCertificateRevokeNotice(certificate.address, { gas: REVOKE_NOTICE_CERTIFICATE_GAS });
        console.log(`Notice sent, gas used ${getGasUsedForTransaction(tx)}`);

        assert.notEqual('0x0', web3.eth.getCode(certificate.address));
        console.log('Revoking certificate...');
        tx = await business0.revokeCertificate(certificate.address, { gas: REVOKE_CERTIFICATE_GAS });
        console.log(`Certificate revoked, gas used ${getGasUsedForTransaction(tx)}`);
        assert.equal('0x0', web3.eth.getCode(certificate.address));

        let certsRevokedEvents = await waitEventsFromWatcher(certsRevokedEventWatcher, 1);
        assert.equal(1, certsRevokedEvents.length);
        assert.equal(business0.address, certsRevokedEvents[0].args.issuer);
        assert.equal(node0.address, certsRevokedEvents[0].args.recipient);
    });

    it('certificate functions can only be called by the issuer or owner', async function() {
        console.log('Creating new certificate...');
        let certificate = await NoiaCertificate.new(
            business0.address,
            node0.address,
            "NODE_TEST_CERTIFICATE",
            "nonsense",
            '',
            { gas: NEW_CERTIFICATE_GAS });
        console.log(`Certificate created, gas used ${await getGasUsedForContractCreation(certificate)}`);

        await certificate.sign({ gas: SIGN_CERTIFICATE_GAS }).should.be.rejected();
        await certificate.update("nonsense", "", { gas: UPDATE_CERTIFICATE_GAS  }).should.be.rejected();
        await certificate.revokeNotice( { gas: REVOKE_CERTIFICATE_GAS  }).should.be.rejected();
        await certificate.revoke({ gas: REVOKE_NOTICE_CERTIFICATE_GAS  }).should.be.rejected();

        await business0.signCertificate(certificate.address, {
            from: acc1,
            gas: SIGN_CERTIFICATE_GAS
        }).should.be.rejected();
        await business0.updateCertificate(certificate.address, "nonsense", "", {
            from: acc1,
            gas: UPDATE_CERTIFICATE_GAS
        }).should.be.rejected();
        await business0.sendCertificateRevokeNotice(certificate.address, {
            from: acc1,
            gas: REVOKE_NOTICE_CERTIFICATE_GAS
        }).should.be.rejected();
        await business0.revokeCertificate(certificate.address, {
            from: acc1,
            gas: REVOKE_CERTIFICATE_GAS
        }).should.be.rejected();

        // cleanup the shit
        await business0.revokeCertificate(certificate.address, { gas: REVOKE_CERTIFICATE_GAS });
    });

    it('Node certificate listing', async function() {
        let tx;

        let certs = [];
        for (let i = 0; i < 10; ++i) {
            console.log('Creating new certificate...');
            let certificate = await NoiaCertificate.new(
                business0.address,
                node0.address,
                "NODE_TEST_CERTIFICATE",
                "nonsense",
                '',
                { gas: NEW_CERTIFICATE_GAS });
            console.log(`Certificate created, gas used ${await getGasUsedForContractCreation(certificate)}`);

            certs.push(certificate.address);
            console.log('Sign the certificate...');
            tx = await business0.signCertificate(certificate.address, { gas: SIGN_CERTIFICATE_GAS });
            console.log(`Certificate singed, gas used ${getGasUsedForTransaction(tx)}`);

            let certsReturned = await node0.getCertificates.call();
            assert.deepEqual(certs, certsReturned);
        }

        // delete one cert from the middle
        {
            console.log('Revoking certificate...');
            tx = await business0.sendCertificateRevokeNotice(certs[5], { gas: REVOKE_NOTICE_CERTIFICATE_GAS });
            console.log(`Certificate revocation noticed, gas used ${getGasUsedForTransaction(tx)}`);
            tx = await business0.revokeCertificate(certs[5], { gas: REVOKE_CERTIFICATE_GAS });
            console.log(`Certificate revoked, gas used ${getGasUsedForTransaction(tx)}`);
            certs.splice(5, 1);
            let certsReturned = await node0.getCertificates.call();
            assert.deepEqual(certs, certsReturned);
        }
    });
})
