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

    before(async () => {
        TestContract = TruffleContract(require("../../sdk/contracts/Owned.json"));
        TestContract.setProvider(web3.currentProvider);
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
        let pkey = web3.currentProvider.wallets[acc0].getPrivateKey();
        let sig = signMessage(msg, pkey);
        console.log(`local signed message with account ${acc0}: ${JSON.stringify(sig)}`);
        assert.equal(acc0, recoverAddressFromSignedMessage(msg, sig));
    })
});
