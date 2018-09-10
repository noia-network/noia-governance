'use strict';

require('./test_common.js');
const { hexRemove0x } = require('../../common/web3_utils.js');

const { NoiaSdk } = require('../../');
const sdk = require('../../');
const sdk2 = new NoiaSdk();

const util = require('util');
const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('should');

contract('NOIA Governance SDK functional tests: ', function (accounts) {
    const acc0 = accounts[0];
    const acc1 = accounts[1];

    console.log("account 1", acc0);
    console.log("account 2", acc1);

    var baseClient;
    var nodeClient;
    var businessClient;

    async function initSdk(sdk, acc) {
        let noia, factory;
        let initOptions = {
            web3 : {
                provider : web3.currentProvider,
            },
            account : {
                owner: acc,
            }
        };
        if (typeof artifacts !== 'undefined') {
            initOptions.deployed_contracts = {
                noia : await artifacts.require('NoiaNetwork').deployed(),
                factories : await artifacts.require("NoiaContractFactoriesV1").deployed()
            };
        }

        await sdk.init(initOptions);
    }

    before(async function () {
        await Promise.all([initSdk(sdk, acc0), initSdk(sdk2, acc1)]);
        baseClient = await sdk.getBaseClient();
        nodeClient = await sdk.createNodeClient({host : '127.0.0.1'});
        console.log(`Node client created at ${nodeClient.address}`);
        businessClient = await sdk.createBusinessClient({/* business info missing */});
        console.log(`Business client created at ${businessClient.address}`);
    })

    after(function () {
        sdk.uninit();
        sdk2.uninit();
    })

    it('rpc message signing & validation', async () => {
        let msg = "good weather in vilnius";
        let sgn = await baseClient.rpcSignMessage(msg);
        console.log(`signed: ${sgn} by base at ${baseClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(baseClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromRpcSignedMessage(msg, sgn));
    })

    it('message signing & validation', async () => {
        let msg = "good weather in vilnius too";
        let sgn = baseClient.signMessage(msg);
        console.log(`signed: ${sgn} by base at ${baseClient.address}`);
        let ownerAddress = await sdk.getOwnerAddress(baseClient.address);
        console.log(`owner: ${ownerAddress}`);
        assert.equal(ownerAddress, sdk.recoverAddressFromSignedMessage(msg, sgn));
    })

    it('business client registration', async () => {
        let businessClient1 = await sdk.createBusinessClient({/* business info missing */});
        console.log(`Business client 1 created at ${businessClient1.address}`);
        assert.isTrue(await sdk.isBusinessRegistered(businessClient1.address));
        let businessClient2 = await sdk.getBusinessClient(businessClient1.address);
        assert.isTrue(await sdk.isBusinessRegistered(businessClient2.address));
    })

    it('node registration event watching', async () => {
        console.log(`start watching node events`);
        await baseClient.startWatchingNodeEvents({
            pollingInterval: 1000 // faster!!
        });
        let nodeAddresses = {};
        await new Promise(async function (resolve, reject) { try {
            let nodeClient1;

            baseClient.on('node_entry_added', function (nodeAddress) {
                console.log('node_entry_added', nodeAddress);
                nodeAddresses[nodeAddress] = true;
                if (nodeClient1 && nodeClient1.address in nodeAddresses) resolve();
            });

            console.log('creating new node client');
            nodeClient1 = await sdk.createNodeClient({host : '127.0.0.1'});
            console.log(`Created new node client at ${nodeClient1.address}`);
            assert.isTrue(await sdk.isNodeRegistered(nodeClient1.address));
            expect(nodeClient1.info).to.deep.equal({host : '127.0.0.1'});
            let nodeClient2 = await sdk.getNodeClient(nodeClient1.address);
            assert.isTrue(await sdk.isNodeRegistered(nodeClient2.address));
            expect(nodeClient2.info).to.deep.equal({host : '127.0.0.1'});

            // in case registratino is fast
            if (nodeClient1.address in nodeAddresses) resolve();
        } catch(err) {
            reject(err);
        }});
        baseClient.stopWatchingNodeEvents();
    })

    it('node registration with different owner', async () => {
        sdk.uninit();
        await initSdk(sdk, acc1);
        let nodeClient2 = await sdk.createNodeClient({host : '127.0.0.1'});
        sdk.uninit();

        await initSdk(sdk, acc0);
        let nodeClient2_2 = await sdk.getNodeClient(nodeClient2.address);
        assert.equal(acc1, await nodeClient2_2.getOwnerAddress());
    })

    it('job post creation and event watching', async function () {
        console.log(`start watching job post events`);
        await baseClient.startWatchingJobPostAddedEvents({
            pollingInterval: 1000 // faster!!
        });
        let jobPostAddresses = {};
        try {
            await new Promise(async function (resolve, reject) { try {
                let jobPost1;

                baseClient.on('job_post_added', function (jobPostAddress) {
                    console.log('job_post_added', jobPostAddress);
                    jobPostAddresses[jobPostAddress] = true;
                    if (jobPost1 && jobPost1.address in jobPostAddresses) resolve();
                });

                jobPost1 = await businessClient.createJobPost({ employer_address : businessClient.address });
                expect(jobPost1.info).to.deep.equal({ employer_address : businessClient.address });
                let jobPost2 = await sdk.getJobPost(jobPost1.address);
                expect(jobPost2.info).to.deep.equal({ employer_address : businessClient.address });

                let employerAddress = await jobPost1.getEmployerAddress();
                assert.equal(businessClient.address, employerAddress);

                // in case registratino is fast
                if (jobPost1.address in jobPostAddresses) resolve();
            } catch(err) {
                reject(err);
            }});
        } catch (e) {
            console.error("Error", e);
            baseClient.stopWatchingJobPostAddedEvents();
            assert.isTrue(false);
        }
        baseClient.stopWatchingJobPostAddedEvents();
    });

    it("Transfer ether", async () => {
        let ethBalanceOldAcc0 = await sdk.getEtherBalance(acc0);
        let ethBalanceOldAcc1 = await sdk.getEtherBalance(acc1);

        await sdk.transferEther(acc1, 0.001);

        let ethBalanceNewAcc0 = await sdk.getEtherBalance(acc0);
        let ethBalanceNewAcc1 = await sdk.getEtherBalance(acc1);

        assert.isTrue(ethBalanceNewAcc0 < ethBalanceOldAcc0);
        assert.isTrue(ethBalanceNewAcc1 > ethBalanceOldAcc1);
    });

    it("Transfer noia tokens", async () => {
        let oldBalance = await sdk.getNoiaBalance(acc1);
        await sdk.transferNoiaToken(acc1, 100);
        let newBalance = await sdk.getNoiaBalance(acc1);
        assert.equal(oldBalance + 100, newBalance);
    });

    it("Transfer too many tokens", async () => {
        let maxBalance = await sdk.getNoiaBalance(acc0);
        await sdk.transferNoiaToken(acc1, maxBalance + 1).should.be.rejected();
    });

    it("Work order process", async () => {
        console.log(`Creating worker ...`);
        const worker = await sdk.createNodeClient({host : '127.0.0.1'});
        console.log(`Creating business ...`);
        const business = await sdk2.createBusinessClient({
            "node_ip": "127.0.0.1",
            "node_ws_port": 7677
        });

        // Business creating a job post
        console.log(`Creating job post ...`);
        const jobPost = await business.createJobPost({});

        // NOTE! Nodes will pick up the job posts, find them interesting based on locked in amount
        // and then connect to businesses to create a work orders
        // Business creates the work order

        //const workerAddress = worker.address;
        console.log(`Creating work order ... for worker owner (wallet address): ${worker.accountOwner}`);
        const workOrder = await jobPost.createWorkOrder(worker.accountOwner);

        // Business funds the contract
        await sdk2.transferNoiaToken(workOrder.address, 1);
        const oldWorkerBalance = await sdk.getNoiaBalance(worker.accountOwner);
        console.log(`Work order funded! Tokens balance: ${await sdk.getNoiaBalance(workOrder.address)}, worker wallet balance: ${oldWorkerBalance}`);

        // Business now timelock's the tokens & releases later for the worker if work is done
        const currentTimeSec = parseInt(new Date().getTime() / 1000); // in secs
        const lockedSpanSec = 5; // 5 sec for Ganache testing
        const lockedAmount = 1;
        const lockUntil = (currentTimeSec + lockedSpanSec);
        console.log(`Timelock! lockedAmount: ${lockedAmount}, lockUntil: ${lockUntil}, locked time (s): ${lockedSpanSec}`);
        await workOrder.timelock(lockedAmount, lockUntil);
        console.log(`Timelock finished!`);
        console.log(`Timelocks: ${JSON.stringify(await workOrder.getTimelocks())}`);

        // Business accepts work order
        console.log(`Business accepting work order ...`);
        await workOrder.accept();

        // Worker get's it's own work order instance and generates the signed accept request
        const clientSideWorkOrder = await worker.getWorkOrderAt(workOrder.address);
        const signedAcceptRequest = await clientSideWorkOrder.generateSignedAcceptRequest();
        console.log(`Worker signed accept request: ${JSON.stringify(signedAcceptRequest)}`);

        // Business executes the delegated work order "accept request" from worker
        await workOrder.delegatedAccept(signedAcceptRequest.nonce, signedAcceptRequest.sig);
        const isAccepted = await workOrder.isAccepted();
        console.log(`Is accepted: ${isAccepted}`);
        assert.isTrue(isAccepted);

        // wait for the time locked tokens to be available
        await new Promise((resolve, reject) => {
            const waitSec = 7; // secs
            console.log(`Waiting ${waitSec} (s) to release the tokens! Locked time (s): ${lockedSpanSec}`);
            setTimeout(() => {
                resolve();
            }, waitSec * 1000);
        });

        // Worker generates the signed release request
        console.log(`Generating signed release request!`);
        const signedReleaseRequest = await clientSideWorkOrder.generateSignedReleaseRequest(worker.accountOwner);
        console.log(`Worker signed release request: ${JSON.stringify(signedReleaseRequest)}`);

        // Business release's the timelocked amount to worker based on a "Release request" from worker
        console.log(`Releasing tokens!`);
        await workOrder.delegatedRelease(signedReleaseRequest.beneficiary, signedReleaseRequest.nonce, signedReleaseRequest.sig);
        console.log(`Funds released!`);
        const totalVested = await workOrder.totalVested();
        const newWorkerBalance = await sdk.getNoiaBalance(worker.accountOwner);
        const workerBalanceDiff = newWorkerBalance - oldWorkerBalance;
        console.log(`Work order! totalFunds: ${await workOrder.totalFunds()}, totalVested: ${totalVested}, worker wallet balance: ${newWorkerBalance}, balance diff: ${workerBalanceDiff}`);
        console.log(`Timelocks: ${JSON.stringify(await workOrder.getTimelocks())}`);
        assert.isTrue(totalVested == 0);
        assert.isTrue(workerBalanceDiff == lockedAmount);
    });
});
