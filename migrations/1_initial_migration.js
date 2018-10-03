const truffleConfig = require('../truffle.js');
const Web3 = require('web3');
const EIP820 = require("eip820");

const Migrations = artifacts.require("Migrations");
const NoiaNetwork = artifacts.require("NoiaNetwork");
const NoiaBusinessContractFactoryV1 = artifacts.require("NoiaBusinessContractFactoryV1");
const NoiaNodeContractFactoryV1 = artifacts.require("NoiaNodeContractFactoryV1");
const NoiaCertificateContractFactoryV1 = artifacts.require("NoiaCertificateContractFactoryV1");
const NoiaJobPostContractFactoryV1 = artifacts.require("NoiaJobPostContractFactoryV1");
const NoiaContractFactoriesV1 = artifacts.require("NoiaContractFactoriesV1");
// for testing
// const ERC777Token = artifacts.require("ERC777Token");
const NOIAToken = artifacts.require("NOIAToken");
const NoiaSimpleRegulation = artifacts.require("NoiaSimpleRegulation");

const {
  getGasUsedForContractCreation,
  getGasUsedForTransaction,
  sendTransactionAndWaitForReceiptMined
} = require('../common/web3_utils.js');
const common = require('../common/web3_utils.js');

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function isTestNetwork(network) {
  return network === "local" || network === "dev" || network === "priv" || network === "ropsten";
}

module.exports = function (deployer, network, accounts) {
  console.log(`accounts: ${accounts}`);

  const provider = truffleConfig.networks[network].provider();
  const web3 = new Web3();
  web3.setProvider(provider);

  let providerUrl = provider.url;
  if (!provider) {
    throw new Error('provider.url not configured in truffle provider configuration!');
  }
  console.log(`Provider url:`, provider.url);

  deployer.then(async () => {
    var tx;

    console.log(`Deploying Migrations contract...`);
    await deployer.deploy(Migrations, { gas: 600000 });
    let migrations = await Migrations.deployed();
    console.log(`Migrations deployed at ${migrations.address}, gasUsed ${await getGasUsedForContractCreation(migrations)}`);

    // deploy token contract
    let tokenContract;
    let regulation;
    if (isTestNetwork(network)) {
      if (network == "ropsten") {
        // OLD NoiaTestToken - https://ropsten.etherscan.io/token/0xdfcec63cb1438f25e4795f7240032b95bcfc38a9#balances
        // ERC777 NOIAToken - https://ropsten.etherscan.io/address/0x045b075752c42255a183f9a854f97590e0766894
        // tokenContract = await ERC777Token.at('0x045b075752c42255a183f9a854f97590e0766894');
        tokenContract = await NOIAToken.at('0x045b075752c42255a183f9a854f97590e0766894');
      } else {
        // EIP820 Registry is required by ERC777 NOIAToken implementation before deployment
        const Web3Latest = require("noia-token/node_modules/web3");
        const web3latest = new Web3Latest(providerUrl);
        // const web3LatestAccount = web3latest.eth.getAccounts()[0];
        const eip820Registry = await EIP820.deploy(web3latest, accounts[0]);
        console.log(`EIP820Registry deployed at ${eip820Registry.$address}`);

        // create new test token contracts for local/dev networks
        console.log(`Creating ERC777 NOIAToken contract...`);
        tokenContract = await NOIAToken.new({ gas: 3000000 });
        console.log(`ERC777Token deployed at ${tokenContract.address}, gasUsed ${await getGasUsedForContractCreation(tokenContract)}`);
      }
      console.log(`NOIAToken state: ${await tokenContract.state.call()}`);

      if (network != "ropsten") {
        console.log(`Creating tokens for ${accounts.length} accounts`);
        await asyncForEach(accounts, async account => {
          console.log(`Creating 100000 token for account ${account} ...`);
          let tx = await tokenContract.mint(account, common.noiaTokensToWeis(100000), { gas: 100000 });
          console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
        });
        await tokenContract.finishMinting();
        console.log(`NOIAToken state: ${await tokenContract.state.call()}`);

        console.log(`Transfering 1000 token from ${accounts[0]} to ${accounts[1]} ...`);
        tx = await tokenContract.transfer(accounts[1], common.noiaTokensToWeis(1000), { from: accounts[0], gas: 100000 });
        console.log(`Done, gasUsed ${getGasUsedForTransaction(tx)}`);
      }

      console.log(`Creating NoiaSimpleRegulation contract...`);
      regulation = await NoiaSimpleRegulation.new({ gas: 600000 });
      console.log(`Created at ${regulation.address}, gasUsed ${await getGasUsedForContractCreation(regulation)}`);
    } else {
      // real token
    }

    // deploy noia network
    console.log(`Deploying NoiaNetwork contract...`);
    await deployer.deploy(NoiaNetwork, tokenContract.address, regulation.address, { gas: 4000000 });
    let noia = await NoiaNetwork.deployed();
    console.log(`NoiaNetwork contract deployed at ${noia.address}`);

    // deploying factories
    {
      console.log(`Deploying NoiaBusinessContractFactoryV1 contract...`);
      let businessFactory = await NoiaBusinessContractFactoryV1.new({gas: 2000000});
      console.log(`NoiaBusinessContractFactoryV1 deployed at ${businessFactory.address}, gasUsed ${await getGasUsedForContractCreation(businessFactory)}`);
      console.log(`Deploying NoiaNodeContractFactoryV1 contract...`);
      let nodeFactory = await NoiaNodeContractFactoryV1.new({gas: 2000000});
      console.log(`NoiaNodeContractFactoryV1 deployed at ${nodeFactory.address}, gasUsed ${await getGasUsedForContractCreation(nodeFactory)}`);
      console.log(`Deploying NoiaCertificateContractFactoryV1 contract...`);
      let certificateFactory = await NoiaCertificateContractFactoryV1.new({gas: 2000000});
      console.log(`NoiaCertificateContractFactoryV1 deployed at ${certificateFactory.address}, gasUsed ${await getGasUsedForContractCreation(certificateFactory)}`);
      console.log(`Deploying NoiaJobPostContractFactoryV1 contract...`);
      let jobPostFactory = await NoiaJobPostContractFactoryV1.new({gas: 3000000});
      console.log(`NoiaJobPostContractFactoryV1 deployed at ${jobPostFactory.address}, gasUsed ${await getGasUsedForContractCreation(jobPostFactory)}`);
      console.log(`Deploying NoiaContractFactoriesV1 contract...`);
      await deployer.deploy(NoiaContractFactoriesV1,
                            await noia.marketplace.call(),
                            businessFactory.address,
                            nodeFactory.address,
                            certificateFactory.address,
                            jobPostFactory.address,
                            { gas: 2000000 });
      let factories = await NoiaContractFactoriesV1.deployed();
      console.log(`Deployed at ${factories.address}`);

      if (isTestNetwork(network)) {
        console.log(`Adding businessFactory to regulation whitelist...`);
        tx = await sendTransactionAndWaitForReceiptMined(web3, regulation.addApprovedFactory, {},
                                                         businessFactory.address);
        console.log(`Added businessFactory, gasUsed ${await getGasUsedForTransaction(tx)}`);

        console.log(`Adding nodeFactory to regulation whitelist...`);
        tx = await sendTransactionAndWaitForReceiptMined(web3, regulation.addApprovedFactory, {},
                                                         nodeFactory.address);
        console.log(`Added nodeFactory, gasUsed ${await getGasUsedForTransaction(tx)}`);

        console.log(`Adding certificateFactory to regulation whitelist...`);
        tx = await sendTransactionAndWaitForReceiptMined(web3, regulation.addApprovedFactory, {},
                                                         certificateFactory.address);
        console.log(`Added certificateFactory, gasUsed ${await getGasUsedForTransaction(tx)}`);

        console.log(`Adding jobPostFactory to regulation whitelist...`);
        tx = await sendTransactionAndWaitForReceiptMined(web3,regulation.addApprovedFactory, {},
                                                         jobPostFactory.address);
        console.log(`Added jobPostFactory, gasUsed ${await getGasUsedForTransaction(tx)}`);
      }
    }

    console.log(`Deployment finished.`);
  }).catch(err => {
    console.log(`deployment failed: ${err.message}\n${err.stack}`);
  });
};
