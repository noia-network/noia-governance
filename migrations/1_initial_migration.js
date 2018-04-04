const Migrations = artifacts.require("Migrations");
const NoiaNetwork = artifacts.require("NoiaNetwork");
const NOIATestToken = artifacts.require("NOIATestToken");

const Web3 = require('web3');

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports = function (deployer, network, accounts) {
    const web3 = new Web3(deployer.provider);

    function getGasUsed(transactionHash) {
        return new Promise((resolve, reject) => {
            if (!transactionHash) return resolve(-1);
            web3.eth.getTransactionReceipt(transactionHash, (error, result) => {
                if (error) reject(error); else resolve(result.gasUsed);
            })
        });
    }

    deployer.then(async () => {
        await deployer.deploy(Migrations, { gas: 300000 });
        let migrations = await Migrations.deployed();
        console.log(`Migrations deployed at ${migrations.address}`);
        if (network === "local" || network === "ropsten") {
            let tokenContract = await NOIATestToken.new({ gas: 1000000 });
            console.log(`NOIATestToken deployed at ${tokenContract.address}, gasUsed ${await getGasUsed(tokenContract.transactionHash)}`);
            await deployer.deploy(NoiaNetwork, tokenContract.address, { gas: 200000 });
            let noia = await NoiaNetwork.deployed();
            console.log(`NOIA contract deployed at ${noia.address}`);
            console.log(`Creating tokens for ${accounts.length} accounts`);
            await asyncForEach(accounts, async account => {
                console.log(`Creating 100000 token for account ${account} ...`);
                let tx = await tokenContract.createTokens(account, 100000, { gas: 100000 });
                console.log(`Done, gasUsed ${tx.receipt.gasUsed}`);
            });
            console.log(`Transfering 1000 token from account0 to account1 ...`);
            let tx = await tokenContract.transfer(accounts[1], 1000, { from: accounts[0], gas: 100000 });
            console.log(`Done, gasUsed ${tx.receipt.gasUsed}`);
        }
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
