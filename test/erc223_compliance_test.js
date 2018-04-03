var ERC223Interface = artifacts.require('ERC223Interface');
var NOIA = artifacts.require('NOIA');

contract('ERC223 Compliance Test', function (accounts) {
    let tokenContract;
    let acc0 = accounts[0];
    let acc1 = accounts[1];

    before(async () => {
        let noia = await NOIA.deployed();
        tokenContract = ERC223Interface.at(await noia.tokenContract.call());
    });

    it('transfer 100 sample tokens to acc1', async () => {
        let oldBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();
        await tokenContract.transfer(acc1, 100, { from: acc0 });
        //assert.isTrue(result);
        let newBalance = (await tokenContract.balanceOf.call(acc1)).toNumber();
        assert.equal(oldBalance + 100, newBalance);
    });
});
