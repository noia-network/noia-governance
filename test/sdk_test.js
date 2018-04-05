const sdk = require('../src/sdk.js');
const config = require('../config.js');

const Web3 = require('web3');
const should = require('should');

contract('NOIA Governance SDK Test', (accounts) => {
    let acc0 = accounts[0];
    let acc1 = accounts[1];
    let provider = new Web3.providers.HttpProvider("http://localhost:7545");

    before(async () => {
        await sdk.init(provider);
    })

    after(() => {
        sdk.uninit();
    })

    it("Transfer tokens", async () => {
        let oldBalance = await sdk.balanceOf(acc1);
        await sdk.transfer(acc0, acc1, 100);
        let newBalance = await sdk.balanceOf(acc1);
        assert.equal(oldBalance + 100, newBalance);
    })

    it("Transfer too many tokens", async () => {
        let maxBalance = await sdk.balanceOf(acc0);
        sdk.transfer(acc0, acc1, maxBalance + 1).should.be.rejected();
    })
});
