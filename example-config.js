const HDWalletProvider = require("@noia-network/truffle-hdwallet-provider");

var mnemonic = 'xxx'; // https://en.bitcoin.it/wiki/Mnemonic_phrase
var infura_api_key = 'yyy'; // https://infura.io/

module.exports = {
    mnemonic: mnemonic,
    infura_api_key: infura_api_key,
    networks: {
        ropsten: {
            provider: () => new HDWalletProvider(
                mnemonic,
                'https://ropsten.infura.io/' + infura_api_key,
                0, 3),
            network_id: '3',
            gas: 4700000
        }
    }
}
