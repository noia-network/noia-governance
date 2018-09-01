const Web3 = require("web3");
const Web3HDWalletProvider = require("web3-hdwallet-provider");

var mnemonic = 'xxx'; // https://en.bitcoin.it/wiki/Mnemonic_phrase
var infura_api_key = 'yyy'; // https://infura.io/
var provider;

module.exports = {
    networks: {
        ropsten: {
            provider: () => {
                let httpProvider = new Web3.providers.HttpProvider('https://ropsten.infura.io/' + infura_api_key);               
                if (!provider) {
                    provider = new Web3HDWalletProvider(
                        httpProvider,
                        mnemonic,
                        0, 3);               
                }
                return provider;
            },
            network_id: '3', // NOTE!! network_id '*' is not supported by the hdwallet
            gas: 4700000
        }
    }
}
