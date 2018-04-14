const path = require('path');
const config = require('./config.js');

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: Object.assign({
        local: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*" // Match any network id
        }
    }, config.networks),

    contracts_build_directory: path.resolve(__dirname, 'sdk', 'contracts'),
    build: "make build"
};
