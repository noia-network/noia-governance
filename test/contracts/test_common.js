let MAX_TRANSACTION_TIMEOUT;
const EXTRA_TIMEOUT = 20000;
const MIGRATION_TRANSACTIONS = 5;

switch (process.env.NETWORK) {
    case 'ropsten':
        MAX_TRANSACTION_TIMEOUT = 120000;
        break;
    default:
        MAX_TRANSACTION_TIMEOUT = 1000;
        break;
}

module.exports = {
    setBeforeAllTimeout: function (testsuite, ntransactions) {
        ntransactions = ntransactions || 0;
        testsuite.timeout((MIGRATION_TRANSACTIONS + ntransactions) * MAX_TRANSACTION_TIMEOUT + EXTRA_TIMEOUT);
    },

    setTestTimeout: function (test, ntransactions) {
        ntransactions = ntransactions || 1;
        test.timeout(ntransactions * MAX_TRANSACTION_TIMEOUT + EXTRA_TIMEOUT);
    }
}
