var MAX_TRANSACTION_TIMEOUT;
const EXTRA_TIMEOUT = 20000;
const MIGRATION_TRANSACTIONS = 10;

switch (process.env.NETWORK) {
    case 'ropsten':
        MAX_TRANSACTION_TIMEOUT = 120000;
        break;
    default:
        MAX_TRANSACTION_TIMEOUT = 5000;
        break;
}

module.exports = {
    beforeAllTests: function (testsuite, ntransactions) {
        testsuite.timeout((MIGRATION_TRANSACTIONS + ntransactions) * MAX_TRANSACTION_TIMEOUT + EXTRA_TIMEOUT);
        web3.currentProvider.start && web3.currentProvider.start();
    },

    afterAllTests: function (testsuite) {
        web3.currentProvider.stop && web3.currentProvider.stop();
    },

    setTestTimeout: function (test, ntransactions) {
        ntransactions = ntransactions || 1;
        test.timeout(ntransactions * MAX_TRANSACTION_TIMEOUT + EXTRA_TIMEOUT);
    }
}
