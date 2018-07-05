const Web3 = require("web3");
const Web3HDWalletProvider = require("web3-hdwallet-provider");

var mnemonic = 'xxx'; // https://en.bitcoin.it/wiki/Mnemonic_phrase
var infura_api_key = 'yyy'; // https://infura.io/

module.exports = {
    mnemonic: mnemonic,
    infura_api_key: infura_api_key,
    networks: {
        ropsten: {
            provider: () => {
                return new HDWalletProvider(
                    new Web3.providers.HttpProvider('https://ropsten.infura.io/' + infura_api_key),
                    httpProvider,
                    mnemonic,
                    0, 3);
            },
            network_id: '3', // NOTE!! network_id '*' is not supported by the hdwallet
            gas: 4700000
        }
    }
}
