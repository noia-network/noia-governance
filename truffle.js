const Web3 = require('web3');
const Web3HDWalletProvider = require("web3-hdwallet-provider");
const path = require('path');
const config = require('./config.js');

// NOTE! Configure your ganache with the same mnemonic
const mnemonic = 'ill song party come kid carry calm captain state purse weather ozone';
var provider;

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: Object.assign({
        local: {
            provider: () => {
                if (!provider) {
                    let httpProvider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
                    provider = new Web3HDWalletProvider(
                        httpProvider,
                        mnemonic,
                        0, 3);
                }
                return provider;
            },
            network_id: "*" // Match any network id
        }
    }, config.networks),

    contracts_build_directory: path.resolve(__dirname, 'sdk', 'contracts'),
    build: "make build"
};
