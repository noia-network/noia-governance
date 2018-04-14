const Migrations = artifacts.require("Migrations");
const NoiaNetwork = artifacts.require("NoiaNetwork");
const NOIATestToken = artifacts.require("NOIATestToken");

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

module.exports = function (deployer, network, accounts) {
    const web3 = new Web3(deployer.provider);

    console.log(`accounts: ${accounts}`);

    deployer.then(async () => {
        console.log(`Deploying Migrations contract...`);
        await deployer.deploy(Migrations, { gas: 300000 });
        let migrations = await Migrations.deployed();
        console.log(`Migrations deployed at ${migrations.address}, gasUsed ${await getGasUsedForContractCreation(migrations)}`);

        // deploy token contract
        let tokenContract;
        if (network === "local" || network === "dev" || network === "ropsten") {
            // test token
            console.log(`Creating NOIATestToken contract...`);
            tokenContract = await NOIATestToken.new({ gas: 1000000 });
            console.log(`NOIATestToken deployed at ${tokenContract.address}, gasUsed ${await getGasUsedForContractCreation(tokenContract)}`);

            console.log(`Creating tokens for ${accounts.length} accounts`);
            await asyncForEach(accounts, async account => {
                console.log(`Creating 100000 token for account ${account} ...`);
                let tx = await tokenContract.createTokens(account, 100000, { gas: 100000 });
                console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
            });

            console.log(`Transfering 1000 token from account0 to account1 ...`);
            let tx = await tokenContract.transfer(accounts[1], 1000, { from: accounts[0], gas: 100000 });
            console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
        } else {
            // real token
        }

        // deploy noia network
        console.log(`Deploying NoiaNetwork contract...`);
        await deployer.deploy(NoiaNetwork, tokenContract.address, { gas: 2000000 });
        let noia = await NoiaNetwork.deployed();
        console.log(`NoiaNetwork contract deployed at ${noia.address}`);

        console.log(`Deployment finished.`);
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
