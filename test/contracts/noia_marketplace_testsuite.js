'use strict';

const NoiaNetwork = artifacts.require('NoiaNetwork');
const NoiaBusinessContractFactory = artifacts.require("NoiaBusinessContractFactoryV1");
const NoiaNodeContractFactory = artifacts.require("NoiaNodeContractFactoryV1");
const NoiaCertificateContractFactory = artifacts.require("NoiaCertificateContractFactoryV1");
const NoiaJobPostContractFactory = artifacts.require("NoiaJobPostContractFactoryV1");
const NoiaContractFactories = artifacts.require("NoiaContractFactoriesV1");
const NoiaMarketplace = artifacts.require('NoiaMarketplace');
const NoiaRegistry = artifacts.require('NoiaRegistry');
const NoiaNode = artifacts.require('NoiaNodeV1');
const NoiaBusiness = artifacts.require('NoiaBusinessV1');
const NoiaCertificate = artifacts.require('NoiaCertificateV1');
const NoiaJobPost = artifacts.require('NoiaJobPostV1');
const NoiaWorkOrder = artifacts.require('NoiaWorkOrderV1');
// const ERC223Interface = artifacts.require('ERC223Interface');
const ERC20Token = artifacts.require('ERC20Token');

const {
  beforeAllTests,
  afterAllTests,
  setTestTimeout,
} = require('./test_common.js');

const {
  isContract,
  getGasUsedForContractCreation,
  getGasUsedForTransaction,
  waitEventsFromWatcher,
  bytesToString,
  rpcSignPacked,
  recoverAddressFromRpcSignedPacked
} = require('../../common/web3_utils.js');
const common = require('../../common/web3_utils.js');

const should = require('should');

contract('NOIA noia tests: ', function (accounts) {
  const NEW_NODE_GAS                      = 1500000;
  const REGISTER_NODE_GAS                 = 100000;
  const NEW_BUSINESS_GAS                  = 1500000;
  const NEW_JOBPOST_GAS                   = 2500000;
  const NEW_CERTIFICATE_GAS               = 1500000;
  const SIGN_CERTIFICATE_GAS              = 100000;
  const ISSUE_CERTIFICATE_GAS             = 100000;
  const UPDATE_CERTIFICATE_GAS            = 200000;
  const REVOKE_CERTIFICATE_GAS            = 200000;
  const REVOKE_NOTICE_CERTIFICATE_GAS     = 200000;

  const acc0 = accounts[0];
  const acc1 = accounts[1];

  var noia;
  var businessFactory;
  var nodeFactory;
  var certificateFactory;
  var jobPostFactory;
  var marketplace;
  var node0, worker0;
  var business0;

  before(async function() {
    beforeAllTests(this, 2);

    noia = await NoiaNetwork.deployed();

    let factories = await NoiaContractFactories.deployed();
    businessFactory = await NoiaBusinessContractFactory.at(await factories.business.call());
    nodeFactory = await NoiaNodeContractFactory.at(await factories.node.call());
    certificateFactory = await NoiaCertificateContractFactory.at(await factories.certificate.call());
    jobPostFactory = await NoiaJobPostContractFactory.at(await factories.jobPost.call());

    marketplace = NoiaMarketplace.at(await noia.marketplace());
  })

  after(function () {
    afterAllTests(this);
  })

  beforeEach(async function () {
    console.log(`----- Test Starts: ${this.currentTest.title}`);
    setTestTimeout(this, 2);
    let tx;

    console.log('Creating node0...');
    tx = await nodeFactory.create('application/json', '{"host": "127.0.0.1"}', { gas: NEW_NODE_GAS });
    node0 = NoiaNode.at(tx.logs[0].args.contractInstance);
    console.log(`Created at ${node0.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    console.log('Creating node1...');
    tx = await nodeFactory.create('application/json', '{"host": "127.0.0.1"}', { from: acc1, gas: NEW_NODE_GAS });
    worker0 = NoiaNode.at(tx.logs[0].args.contractInstance);
    console.log(`Created worker0 at ${worker0.address}, by: ${acc1}, gas used ${await getGasUsedForTransaction(tx)}`);

    console.log('Creating business0...');
    tx = await businessFactory.create('application/json', JSON.stringify({node_ip: "127.0.0.1"}), { gas: NEW_BUSINESS_GAS });
    business0 = NoiaBusiness.at(tx.logs[0].args.contractInstance);
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

    // add an existed entry
    await nodeRegistry.addEntry(node0.address, {
      from: acc1,
      gas: REGISTER_NODE_GAS
    }).should.be.rejected();

    let nentry = (await nodeRegistry.count.call()).toNumber();
    console.log('Creating node1...');
    tx = await nodeFactory.create('application/json', '{"host":"test-node.noia.network"}', { gas: NEW_NODE_GAS });
    let node1 = await NoiaNode.at(tx.logs[0].args.contractInstance);
    console.log(`Created at ${node1.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    assert.isTrue(await nodeRegistry.hasEntry(node1.address));
    assert.equal('application/json', bytesToString(await node1.infoType.call()));
    assert.equal('{"host":"test-node.noia.network"}', bytesToString(await node1.infoData.call()));
    assert.equal(nentry + 1, (await nodeRegistry.count.call()).toNumber());
    /*let events = await waitEventsFromWatcher(eventWatcher, 1);
      assert.equal(1, events.length);
      assert.equal(nodeRegistry.address, events[0].address);
      assert.equal(node1.address, events[0].args.baseContract.valueOf());*/
  });

  it('register a new business', async function() {
    setTestTimeout(this, 2);

    let tx;
    let businessRegistry = NoiaRegistry.at(await marketplace.businessRegistry.call());
    let eventWatcher = businessRegistry.NoiaRegistryEntryAdded();

    // add an existed entry
    await businessRegistry.addEntry(business0.address, {
      from: acc1,
      gas: REGISTER_NODE_GAS
    }).should.be.rejected();

    let nentry = (await businessRegistry.count.call()).toNumber();
    console.log('Creating business1...');
    tx = await businessFactory.create('application/json', JSON.stringify({node_ip: "127.0.0.1"}), { gas: NEW_BUSINESS_GAS });
    let business1 = await NoiaBusiness.at(tx.logs[0].args.contractInstance);
    console.log(`Created at ${business1.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    assert.isTrue(await businessRegistry.hasEntry(business1.address));
    assert.equal(nentry + 1, (await businessRegistry.count.call()).toNumber());
    /*let events = await waitEventsFromWatcher(eventWatcher, 1);
      assert.equal(1, events.length);
      assert.equal(businessRegistry.address, events[0].address);
      assert.equal(business1.address, events[0].args.baseContract.valueOf());*/
  });

  it('create, sign, update and revoke a certificate', async function() {
    setTestTimeout(this, 4);

    let tx;

    console.log('Creating new certificate...');
    tx = await certificateFactory.create(
      "NODE_TEST_CERTIFICATE",
      business0.address,
      node0.address,
      { gas: NEW_CERTIFICATE_GAS });
    let certificate = await NoiaCertificate.at(tx.logs[0].args.contractInstance);
    console.log(`Certificate created at ${certificate.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    let certsSignedEventWatcher = certificate.NoiaCertificateSignedV1();
    let certsIssuedEventWatcher = certificate.NoiaCertificateIssuedV1();
    let certsUpdatedEventWatcher = certificate.NoiaCertificateUpdatedV1();
    let certsRevokedEventWatcher = certificate.NoiaCertificateRevokedV1();

    assert.isFalse(await certificate.signed.call());
    assert.isFalse(await certificate.isInEffect.call());
    console.log('Sign the certificate...');
    tx = await business0.signCertificate(certificate.address, { gas: SIGN_CERTIFICATE_GAS });
    console.log(`Certificate singed, gas used ${getGasUsedForTransaction(tx)}`);
    assert.isTrue(await certificate.signed.call());
    assert.isFalse(await certificate.isInEffect.call());

    let certsSignedEvents = await waitEventsFromWatcher(certsSignedEventWatcher, 1);
    assert.equal(1, certsSignedEvents.length);
    assert.equal(business0.address, certsSignedEvents[0].args.issuer);
    assert.equal(node0.address, certsSignedEvents[0].args.recipient);

    console.log('Issue the certificate...');
    tx = await certificate.issue( { gas: ISSUE_CERTIFICATE_GAS });
    console.log(`Certificate issued, gas used ${getGasUsedForTransaction(tx)}`);
    assert.isTrue(await certificate.signed.call());
    assert.isTrue(await certificate.isInEffect.call());

    console.log('Update the certificate...');
    tx = await certificate.update(
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
    assert.isTrue(await certificadte2.signed.call());
    assert.isTrue(await certificadte2.isInEffect.call());
    assert.equal(business0.address, await certificadte2.issuer.call());
    assert.equal(node0.address, await certificadte2.recipient.call());
    assert.equal("NODE_TEST_CERTIFICATE", bytesToString(await certificadte2.certificateName.call()));
    assert.equal("application/json", bytesToString(await certificadte2.payloadType.call()));
    assert.equal('{"field1":"lorem ipsum"}', bytesToString(await certificadte2.payloadData.call()));

    assert.isTrue(await isContract(web3, certificate.address));
    console.log('Revoking certificate...');
    tx = await certificate.revoke({ gas: REVOKE_CERTIFICATE_GAS });
    console.log(`Certificate revoked, gas used ${getGasUsedForTransaction(tx)}`);
    assert.isFalse(await isContract(web3, certificate.address));

    let certsRevokedEvents = await waitEventsFromWatcher(certsRevokedEventWatcher, 1);
    assert.equal(1, certsRevokedEvents.length);
    assert.equal(business0.address, certsRevokedEvents[0].args.issuer);
    assert.equal(node0.address, certsRevokedEvents[0].args.recipient);
  });

  it('certificate functions can only be called by the issuer or owner', async function() {
    let tx;

    console.log('Creating new certificate...');
    tx = await certificateFactory.create(
      "NODE_TEST_CERTIFICATE",
      business0.address,
      node0.address,
      { gas: NEW_CERTIFICATE_GAS });
    let certificate = await NoiaCertificate.at(tx.logs[0].args.contractInstance);
    console.log(`Certificate created, gas used ${await getGasUsedForContractCreation(certificate)}`);

    console.log('cert.sing');
    await certificate.sign({ gas: SIGN_CERTIFICATE_GAS }).should.be.rejected();
    console.log('cert.issue');
    await certificate.issue({ from: acc1, gas: SIGN_CERTIFICATE_GAS }).should.be.rejected();
    console.log('cert.update');
    await certificate.update("nonsense", "", { from: acc1, gas: UPDATE_CERTIFICATE_GAS  }).should.be.rejected();
    console.log('cert.revoke');
    await certificate.revoke({ from: acc1, gas: REVOKE_NOTICE_CERTIFICATE_GAS  }).should.be.rejected();
    console.log('business.sign');
    await business0.signCertificate(certificate.address, {
      from: acc1,
      gas: SIGN_CERTIFICATE_GAS
    }).should.be.rejected();

    // cleanup the shit
    await certificate.revoke({ gas: REVOKE_CERTIFICATE_GAS });
  });

  it('Node certificate listing', async function() {
    let tx;

    let certs = [];
    for (let i = 0; i < 10; ++i) {
      console.log('Creating new certificate...');
      tx = await certificateFactory.create(
        "NODE_TEST_CERTIFICATE",
        business0.address,
        node0.address,
        { gas: NEW_CERTIFICATE_GAS });
      let certificate = await NoiaCertificate.at(tx.logs[0].args.contractInstance);
      console.log(`Certificate created, gas used ${await getGasUsedForTransaction(tx)}`);

      certs.push(certificate.address);
      console.log('Sign the certificate...');
      tx = await business0.signCertificate(certificate.address, { gas: SIGN_CERTIFICATE_GAS });
      console.log(`Certificate singed, gas used ${getGasUsedForTransaction(tx)}`);

      console.log('Issue the certificate...');
      tx = await certificate.issue( { gas: ISSUE_CERTIFICATE_GAS });
      console.log(`Certificate issued, gas used ${getGasUsedForTransaction(tx)}`);

      let certsReturned = await node0.getCertificates.call();
      assert.deepEqual(certs, certsReturned);
    }

    // delete one cert from the middle
    {
      console.log('Revoking certificate...');
      let certificate = NoiaCertificate.at(certs[5]);
      tx = await certificate.revoke({ gas: REVOKE_NOTICE_CERTIFICATE_GAS });
      console.log(`Certificate revoked, gas used ${getGasUsedForTransaction(tx)}`);
      certs.splice(5, 1);
      let certsReturned = await node0.getCertificates.call();
      assert.deepEqual(certs, certsReturned);
    }
  });

  it('register new job post', async function () {
    setTestTimeout(this, 2);

    let tx;
    let jobPostRegistry = NoiaRegistry.at(await marketplace.jobPostRegistry.call());
    let eventWatcher = jobPostRegistry.NoiaRegistryEntryAdded();

    let nentry = (await jobPostRegistry.count.call()).toNumber();
    console.log('Creating jobPost...');
    tx = await jobPostFactory.create(business0.address, 'application/json', '{"period":"1 week"}', { gas: NEW_JOBPOST_GAS });
    let jobPost = await NoiaJobPost.at(tx.logs[0].args.contractInstance);
    console.log(`Created at ${jobPost.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    assert.isTrue(await jobPostRegistry.hasEntry(jobPost.address));
    assert.equal(nentry + 1, (await jobPostRegistry.count.call()).toNumber());
    let events = await waitEventsFromWatcher(eventWatcher, 1);
    assert.equal(1, events.length);
    assert.equal(jobPostRegistry.address, events[0].address);
    assert.equal(jobPost.address, events[0].args.baseContract.valueOf());
  });

  it('Work order process', async () => {
    // owners
    const businessOwner = await business0.owner.call();
    const workerOwner = await worker0.owner.call();
    console.log(`Business owner address: ${businessOwner}, Worker owner address: ${workerOwner}`);

    //
    console.log(`Creating job post for work order ...`);
    let tx = await jobPostFactory.create(business0.address, 'application/json', '{"period":"1 week"}', { gas: NEW_JOBPOST_GAS });
    let jobPost = await NoiaJobPost.at(tx.logs[0].args.contractInstance);
    console.log(`Created job post at ${jobPost.address}, gas used ${await getGasUsedForTransaction(tx)}`);

    // create a work order
    tx = await jobPost.createWorkOrder(workerOwner, { gas: NEW_JOBPOST_GAS });
    const workOrderAddress = tx.logs[0].args.contractInstance;
    const workOrder = await NoiaWorkOrder.at(workOrderAddress);
    console.log(`Work order created and proposed to node! workOrderAddress: ${workOrder.address}`);

    // work order acceptance process
    // business accept
    console.log(`Business work order accept!`);
    await workOrder.accept();
    // node accept
    let sig = await rpcSignPacked(web3, workerOwner, // sign with acc1 - which created worker0
                                  {t: "address", v: workOrder.address.slice(2)}, // "69a6df83fdfa5f75d9e631bc1d36c7573b5fa52e"
                                  {t: "string", v: "accept"},
                                  {t: "uint256", v: 1});
    const recoveredAddress = recoverAddressFromRpcSignedPacked(sig,
                                                               {t: "address", v: workOrder.address.slice(2)},
                                                               {t: "string", v: "accept"},
                                                               {t: "uint256", v: 1});
    console.log(`Worker work order delegated accept! workOrder.address: ${workOrder.address}, sig: ${sig}, workerOwner: ${workerOwner}, recoveredAddress: ${recoveredAddress}`);
    await workOrder.delegatedAccept(1, sig, { from: businessOwner, gas: NEW_JOBPOST_GAS });
    const isAccepted = await workOrder.isAccepted();
    console.log(`Is accepted: ${isAccepted}`);
    assert.isTrue(isAccepted);

    // fund the contract and check it's funded
    const lockedAmount = common.noiaTokensToWeis(1);
    const marketplace = await NoiaMarketplace.at(await jobPost.marketplace());
    const token = await ERC20Token.at(await marketplace.tokenContract());
    console.log(`Work order initial tokens balance: ${await token.balanceOf(workOrder.address)}, businessOwner balance: ${await token.balanceOf(businessOwner)}`);
    await token.transfer(workOrder.address, lockedAmount, {from: businessOwner}); // funded by business
    const oldWorkerBalance = await token.balanceOf(workerOwner);
    console.log(`Work order funded! Tokens balance: ${await token.balanceOf(workOrder.address)}, worker wallet balance: ${oldWorkerBalance}`);

    // now timelock the tokens & release
    const currentTimeSec = parseInt(new Date().getTime() / 1000); // in secs
    const lockedSpanSec = 5; // 5 sec for testing
    const lockUntil = (currentTimeSec + lockedSpanSec);
    console.log(`Timelock! lockedAmount: ${lockedAmount.toFixed(2)}, lockUntil: ${lockUntil}, locked time (s): ${lockedSpanSec}`);
    await workOrder.timelock(lockedAmount, lockUntil);
    console.log(`Timelock finished!`);
    console.log(`Timelocks: ${JSON.stringify(await workOrder.getTimelocks())}`);

    // release the timelocked amount
    await new Promise((resolve, reject) => {
      const waitSec = 7; // secs
      console.log(`Waiting ${waitSec} (s) to release the tokens! Locked time (s): ${lockedSpanSec}`);
      setTimeout(() => {
        resolve();
      }, waitSec * 1000);
    });
    sig = await rpcSignPacked(web3, workerOwner, // sign with acc1 - which created worker0
                              {t: "address", v: workOrder.address.slice(2)}, // "69a6df83fdfa5f75d9e631bc1d36c7573b5fa52e"
                              {t: "string", v: "release"},
                              {t: "address", v: workerOwner.slice(2)},
                              {t: "uint256", v: 1});
    await workOrder.delegatedRelease(workerOwner, 1, sig, { from: businessOwner });
    const totalFunds = await workOrder.totalFunds();
    const totalVested = await workOrder.totalVested();
    const newWorkerBalance = await token.balanceOf(workerOwner);
    const workerBalanceDiff = newWorkerBalance.minus(oldWorkerBalance);
    console.log(`Work order! totalFunds: ${totalFunds}, totalVested: ${totalVested}, worker wallet balance: ${newWorkerBalance}, balance diff: ${workerBalanceDiff}, lockedAmount: ${lockedAmount}`);
    console.log(`Timelocks: ${JSON.stringify(await workOrder.getTimelocks())}`);
    assert.isTrue(totalVested.equals(0));
    assert.isTrue(workerBalanceDiff.equals(lockedAmount));
  });
});
