const config =require('./config.js');

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

    contracts_build_directory: './src/contracts',
    build: "make build"
};
