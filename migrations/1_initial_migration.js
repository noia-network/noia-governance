const Migrations = artifacts.require("Migrations");
const NoiaNetwork = artifacts.require("NoiaNetwork");
const NoiaContractsFactoryV1 = artifacts.require("NoiaContractsFactoryV1");
// for testing
const NOIATestToken = artifacts.require("NOIATestToken");
const NoiaSimpleRegulation = artifacts.require("NoiaSimpleRegulation");

const {
    getGasUsedForContractCreation,
    getGasUsedForTransaction
} = require('../common/web3_utils.js');

const Web3 = require('web3');

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function isTestNetwork(network) {
    return network === "local" || network === "dev" || network === "ropsten";
}

module.exports = function (deployer, network, accounts) {
    const web3 = new Web3(deployer.provider);

    console.log(`accounts: ${accounts}`);

    deployer.then(async () => {
        var tx;

        console.log(`Deploying Migrations contract...`);
        await deployer.deploy(Migrations, { gas: 300000 });
        let migrations = await Migrations.deployed();
        console.log(`Migrations deployed at ${migrations.address}, gasUsed ${await getGasUsedForContractCreation(migrations)}`);

        // deploy token contract
        let tokenContract;
        let regulation;
        if (isTestNetwork(network)) {
            if (network == "ropsten") {
                // https://ropsten.etherscan.io/token/0xdfcec63cb1438f25e4795f7240032b95bcfc38a9#balances
                tokenContract = await NOIATestToken.at('0xdfcec63cb1438f25e4795f7240032b95bcfc38a9');
            } else {
                // create new test token contracts for local/dev networks
                console.log(`Creating NOIATestToken contract...`);
                tokenContract = await NOIATestToken.new({ gas: 1000000 });
                console.log(`NOIATestToken deployed at ${tokenContract.address}, gasUsed ${await getGasUsedForContractCreation(tokenContract)}`);
            }

            if (network != "ropsten") {
                console.log(`Creating tokens for ${accounts.length} accounts`);
                await asyncForEach(accounts, async account => {
                    console.log(`Creating 100000 token for account ${account} ...`);
                    let tx = await tokenContract.createTokens(account, 100000, { gas: 100000 });
                    console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
                });

                console.log(`Transfering 1000 token from account0 to account1 ...`);
                tx = await tokenContract.transfer(accounts[1], 1000, { from: accounts[0], gas: 100000 });
                console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
            }

            console.log(`Creating NoiaSimpleRegulation contract...`);
            regulation = await NoiaSimpleRegulation.new({ gas: 500000 });
            console.log(`Created at ${regulation.address}, gasUsed ${await getGasUsedForContractCreation(regulation)}`);
        } else {
            // real token
        }

        // deploy noia network
        console.log(`Deploying NoiaNetwork contract...`);
        await deployer.deploy(NoiaNetwork, tokenContract.address, regulation.address, { gas: 4000000 });
        let noia = await NoiaNetwork.deployed();
        console.log(`NoiaNetwork contract deployed at ${noia.address}`);

        console.log(`Deploying NoiaContractsFactoryV1 contract...`);
        await deployer.deploy(NoiaContractsFactoryV1, await noia.marketplace.call(), { gas: 4000000 });
        let factory = await NoiaContractsFactoryV1.deployed();
        console.log(`Deployed at ${factory.address}`);

        if (isTestNetwork(network)) {
            console.log(`Adding contractsFactory to regulation whitelist...`);
            tx = await regulation.addApprovedFactory(factory.address);
            console.log(`Done, gasUsed ${await getGasUsedForTransaction(tx)}`);
        }

        console.log(`Deployment finished.`);
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
