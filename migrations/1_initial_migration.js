var Migrations = artifacts.require("Migrations");
var NOIA = artifacts.require("NOIA");
var NOIATestToken = artifacts.require("NOIATestToken");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Migrations);
    if (network === "local") {
        deployer.then(() => {
            return NOIATestToken.new();
        }).then(tokenContract => {
            return deployer.deploy(NOIA, tokenContract.address);
        }).then(async () => {
            let noia = await NOIA.deployed();
            console.log(`NOIA contract deployed at ${noia.address}`);
            let tokenContract = NOIATestToken.at(await noia.tokenContract.call());
            accounts.forEach(async account => {
                console.log(`Create 100000 token for account ${account}`);
                await tokenContract.createTokens(account, 100000);
            });
        }).catch(err => {
            console.error(`NOIA contract deployment failed ${err}`);
        })
    }
};
