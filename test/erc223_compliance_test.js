var ERC223Interface = artifacts.require('ERC223Interface');
var ERC223NoFallback = artifacts.require('ERC223NoFallback');
var ERC223WithFallback = artifacts.require('ERC223WithFallback');
var NoiaNetwork = artifacts.require('NoiaNetwork');

const should = require('should');

contract('ERC223 Compliance Test', function (accounts) {
    let tokenContract;
    let acc0 = accounts[0];
    let acc1 = accounts[1];
    let acc2 = accounts[1];

    before(async () => {
        let noia = await NoiaNetwork.deployed();
        tokenContract = ERC223Interface.at(await noia.tokenContract.call());
    });

    it('transfer 100 sample tokens to acc1', async () => {
        let oldBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();
        await tokenContract.transfer(acc1, 100, { from: acc0 });
        //assert.isTrue(result);
        let newBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();
        assert.equal(oldBalance + 100, newBalance);
    });

    it('transfer 100 sample tokens to a contract without tokenFallback', async () => {
        let badContract = await ERC223NoFallback.new({from: acc2});
        await tokenContract.transfer(badContract.address, 100, { from: acc0 }).should.be.rejected()
    });

    it('transfer 100 sample tokens to a contract with tokenFallback', async () => {
        let goodContract = await ERC223WithFallback.new({from: acc2});
        await tokenContract.transfer(goodContract.address, 100, { from: acc0 });
        assert.equal(100, (await goodContract.tokenReceived.call()).toNumber());
    });
});
