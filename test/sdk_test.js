const sdk = require('../src/sdk.js');
const truffleConfig = require('../truffle.js');

const Web3 = require('web3');
const should = require('should');

contract('NOIA Governance SDK Test', (accounts) => {
    let acc0 = accounts[0];
    let acc1 = accounts[1];
    let provider = new Web3.providers.HttpProvider(`http://${truffleConfig.networks.local.host}:${truffleConfig.networks.local.port}`);

    before(async () => {
        noia = await artifacts.require('NoiaNetwork').deployed();
        await sdk.init(provider, noia);
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
        await sdk.transfer(acc0, acc1, maxBalance + 1).should.be.rejected();
    })
});
