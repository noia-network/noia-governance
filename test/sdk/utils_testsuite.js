'use strict';

require('./test_common.js');

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    bytesToString,
    signMessage,
    recoverAddressFromSignedMessage,
    rpcSignMessage,
    recoverAddressFromRpcSignedMessage,
} = require('../../common/web3_utils.js');

const util = require('util');
const assert = require('chai').assert;
const should = require('should');
const TruffleContract = require("truffle-contract");

contract('Common utils tests: ', function (accounts) {
    let TestContract;
    const acc0 = accounts[0];
    const acc1 = accounts[1];

    before(function () {
        TestContract = TruffleContract(require("../../sdk/contracts/Owned.json"));
        TestContract.setProvider(web3.currentProvider);
        web3.currentProvider.start && web3.currentProvider.start();
    })

    after(function () {
        web3.currentProvider.stop && web3.currentProvider.stop();
    })

    it('isContract function', async () => {
        assert.isFalse(await isContract(web3, acc0));
        console.log('Creating a test contract...');
        let testContract = await TestContract.new({ from : acc0, gas: 300000 });
        console.log(`Test contract created at ${testContract.address}, gas used ${await getGasUsedForContractCreation(testContract)}`);
        assert.isTrue(await isContract(web3, testContract.address));
    })

    it('getGasUsedForTransaction function', async () => {
        console.log('Creating a test contract...');
        let testContract = await TestContract.new({ from : acc0, gas: 300000 });
        console.log(`Test contract created at ${testContract.address}, gas used ${await getGasUsedForContractCreation(testContract)}`);
        let tx = await testContract.changeOwner(acc1, { from: acc0, gas: 100000 });
        assert.isTrue(getGasUsedForTransaction(tx) > 0);
    })

    it('bytesToString function', async () => {
        assert.equal('hello', bytesToString('68656c6c6f'));
        assert.equal('hello', bytesToString('0x68656c6c6f'));
        assert.equal('hello', bytesToString('0x68656c6c6f\x00\x00\x00'));
    })

    it('rpc message signing & validation', async () => {
        let msg = "good weather in vilnius";
        let sgn = await rpcSignMessage(web3, msg, acc0);
        console.log(`rpc signed message with account ${acc0}: ${sgn}`);
        assert.equal(acc0, recoverAddressFromRpcSignedMessage(msg, sgn));
    })

    it('local message signing & validation', async () => {
        let msg = "good weather in vilnius";
        // taking an example pair from https://github.com/vkobel/ethereum-generate-wallet
        let acc = '0x5fe3062b24033113fbf52b2b75882890d7d8ca54';
        let pkey = new Buffer('981679905857953c9a21e1807aab1b897a395ea0c5c96b32794ccb999a3cd781', 'hex');
        let sig = signMessage(msg, pkey);
        console.log(`local signed message with account ${acc0}: ${JSON.stringify(sig)}`);
        assert.equal(acc, recoverAddressFromSignedMessage(msg, sig));
    })
});
