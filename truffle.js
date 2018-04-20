const Web3 = require('web3');
const path = require('path');
const config = require('./config.js');

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: Object.assign({
        local: {
            provider: () => new Web3.providers.HttpProvider('http://127.0.0.1:7545'),
            network_id: "*" // Match any network id
        }
    }, config.networks),

    contracts_build_directory: path.resolve(__dirname, 'sdk', 'contracts'),
    build: "make build"
};
