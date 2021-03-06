const Web3 = require('web3');
const Web3HDWalletProvider = require("web3-hdwallet-provider");
const path = require('path');
let config = {
  networks: {}
};
try {
  config = require('./config.js');
} catch (e) {
  console.warn('config.js not available or returned error', e);
}

// NOTE! Configure your ganache with the same mnemonic
const mnemonic = 'ill song party come kid carry calm captain state purse weather ozone';
var provider;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: Object.assign({
    local: {
      provider: () => {
        // if provider is already initialized (multiple calls to provider() can happen) then return it
        if (provider) { return provider;}

        // build the provider
        const providerUrl = 'http://127.0.0.1:7545';
        provider = new Web3HDWalletProvider(
          new Web3.providers.HttpProvider(providerUrl),
          mnemonic,
          0, 3);
        provider.url = providerUrl;
        return provider;
      },
      network_id: "*" // Match any network id
    }
  }, config.networks),

  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },

  contracts_build_directory: path.resolve(__dirname, 'sdk', 'contracts'),
  build: "make build"
};
