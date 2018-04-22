const Web3 = require('web3');
const HDWalletProvider = require("truffle-hdwallet-provider");
const path = require('path');
const config = require('./config.js');

// NOTE! Configure your ganache with the same mnemonic
const mnemonic = 'ill song party come kid carry calm captain state purse weather ozone';

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: Object.assign({
        local: {
            provider: () => new HDWalletProvider(
                mnemonic,
                'http://127.0.0.1:7545',
                0, 3),
            network_id: "*" // Match any network id
        }
    }, config.networks),

    contracts_build_directory: path.resolve(__dirname, 'sdk', 'contracts'),
    build: "make build"
};
