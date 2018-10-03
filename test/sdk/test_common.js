// wrap truffle conract test into the mocha describe function
if (typeof global.contract === 'undefined') {
    const truffleConfig = require('../../truffle.js');
    const Web3 = require('web3');

    global.contract = function (name, testsuite) {
        describe(name, function (done) {
            this.timeout(600000);
            // NOTE! configure your network.provider as a function
            let provider = truffleConfig.networks[process.env.NETWORK].provider();
            global.web3 = new Web3();
            web3.setProvider(provider);
            if (provider.addresses) {
                // hd wallet
                accounts = provider.addresses;
            } else {
                // local ganache
                const Web3 = require('web3');
                accounts = web3.eth.accounts;
            }
            testsuite(accounts);
        });
    };
}
