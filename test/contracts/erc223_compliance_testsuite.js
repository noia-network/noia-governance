var ERC223Interface = artifacts.require('ERC223Interface');
var ERC223NoFallback = artifacts.require('ERC223NoFallback');
var ERC223WithFallback = artifacts.require('ERC223WithFallback');
var NoiaNetwork = artifacts.require('NoiaNetwork');

const {
    setBeforeAllTimeout,
    setTestTimeout
} = require('./test_common.js');

const {
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher
} = require('../../common/web3_utils.js');

const should = require('should');

contract('ERC223 Compliance Test', function (accounts) {
    let tokenContract;
    let acc0 = accounts[0];
    let acc1 = accounts[1];
    let acc2 = accounts[1];

    before(async function () {
        setBeforeAllTimeout(this);

        let noia = await NoiaNetwork.deployed();
        tokenContract = ERC223Interface.at(await noia.tokenContract.call());
    });

    it('transfer 100 sample tokens to acc1', async function() {
        setTestTimeout(this, 1);

        let tx;

        let oldBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();

        console.log(`Transfering 100 token from account0 to account1 ...`);
        tx = await tokenContract.transfer(acc1, 100, { from: acc0, gas: 100000 });
        console.log(`Done, gas used ${await getGasUsedForTransaction(tx)}`);

        let newBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();
        assert.equal(oldBalance + 100, newBalance);
    });

    it('transfer 100 sample tokens to a contract without tokenFallback', async function() {
        setTestTimeout(this, 2);

        console.log(`Creating ERC223NoFallback ...`);
        let badContract = await ERC223NoFallback.new({ from: acc0, gas: 200000 });
        console.log(`Done, gas used ${await getGasUsedForContractCreation(badContract)}`);

        console.log(`Transfering token to ERC223NoFallback ...`);
        await tokenContract.transfer(badContract.address, 100, { from: acc0, gas: 100000 }).should.be.rejected();
    });

    it('transfer 100 sample tokens to a contract with tokenFallback', async function() {
        setTestTimeout(this, 2);

        let tx;

        console.log(`Creating ERC223WithFallback ...`);
        let goodContract = await ERC223WithFallback.new(tokenContract.address, { from: acc0, gas: 400000 });
        console.log(`Done, gas used ${await getGasUsedForContractCreation(goodContract)}`);

        console.log('Calling fallback from wrong addresss should fail ...');
        await goodContract.tokenFallback(acc0, 100, "").should.be.rejected();

        console.log(`Transfering token to ERC223WithFallback ...`);
        let balance0 = (await tokenContract.balanceOf.call(acc0)).toNumber();
        tx = await tokenContract.transfer(goodContract.address, 100, { from: acc0, gas: 100000 });
        let balance1 = (await tokenContract.balanceOf.call(acc0)).toNumber();
        console.log(`Done, gas used ${await getGasUsedForTransaction(tx)}`);
        assert.equal(acc0, await goodContract.originator.call());
        assert.equal(100, (await goodContract.tokenReceived.call()).toNumber());
        assert.equal(balance1 + 100, balance0);

        console.log(`Refund token back to acc1 should fail`);
        await goodContract.requestRefund({ from: acc1, gas: 200000 }).should.be.rejected();

        console.log(`Refund token back to acc0 ...`);
        await goodContract.requestRefund({ from: acc0, gas: 200000 });
        console.log(`Done, refunded`);
        let balance2 = (await tokenContract.balanceOf.call(acc0)).toNumber();
        assert.equal(balance2, balance0);

        console.log('No more refund, Jose');
        await goodContract.requestRefund({ from: acc0, gas: 200000 }).should.be.rejected();
    });
});
