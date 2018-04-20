// wrap truffle conract test into the mocha describe function
if (typeof global.contract === 'undefined') {
    const truffleConfig = require('../../truffle.js');
    const Web3 = require('web3');

    global.contract = function (name, testsuite) {
        describe(name, function (done) {
            this.timeout(300000);
            // NOTE! configure your network.provider as a function
            let network = truffleConfig.networks[process.env.NETWORK];
            let provider = network.provider();
            global.web3 = new Web3();
            web3.setProvider(network.provider());
            if (provider.addresses) {
                // hd wallet
                accounts = provider.addresses;
            } else {
                // local ganache
                const Web3 = require('web3');
                accounts = web3.eth.accounts;
            }
            testsuite(accounts, web3);
        });
    };
}
