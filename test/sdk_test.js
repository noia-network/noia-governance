const sdk = require('../src/sdk.js');
const config = require('../config.js');

const Web3 = require('web3');
const HDWalletProvider = require("truffle-hdwallet-provider");

contract('NOIA Governance SDK Test', () => {
    var mnemonic = "forward fade tumble theme love upset next since rude bounce fan black";
    let provider = new Web3.providers.HttpProvider("http://localhost:7545");

    before(async () => {
        await sdk.init(provider);
    })

    it("Create new tokens", async () => {
    })
});
