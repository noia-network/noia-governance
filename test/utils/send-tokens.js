const fs = require('fs');
const util = require('util');
const path = require('path');
const Web3 = require('web3');

const readFileAsync = util.promisify(fs.readFile);

// const walletProvider = new Web3.providers.HttpProvider('http://eth.oja.me:3304/');
const walletProvider = new Web3.providers.HttpProvider('http://localhost:7545/');
const web3 = new Web3(walletProvider);

async function main() {
  if (process.argv.length <= 2) {
    console.log(`Usage: node <script.js> <0x-toaddress>`);
    return;
  }
  const args = process.argv.splice(2);
  const to = args[0];
  // const to = '0x8517156cbdf189a1531b808d1069efc46af49e01';

  const rootDir = path.resolve(__dirname, '../../');

  // get the contract abi-s and deployed addresses
  const NOIANetworkJson = JSON.parse(await readFile(path.join(rootDir, 'sdk/contracts/NoiaNetwork.json')));
  const NOIATestTokenJson = JSON.parse(await readFile(path.join(rootDir, 'sdk/contracts/NOIATestToken.json')));
  // console.log(NOIANetworkJson);

  // get noia instance
  const noiaAddress = NOIANetworkJson.networks["5777"].address;
  console.log(`NOIA local network address: ${noiaAddress}`);
  const noia = web3.eth.contract(NOIANetworkJson.abi).at(noiaAddress);
  // console.log(noia);

  // get the token instance
  const tokenAddress = await noia.tokenContract.call();
  console.log(`token contract address: ${tokenAddress}`);
  const token = web3.eth.contract(NOIATestTokenJson.abi).at(tokenAddress);
  // console.log(token);

  // send tokens
  const from = web3.eth.accounts[0];
  const amount = 500;
  const transactionHash = await token.createTokens.sendTransaction(to, amount, {from: from});
  console.log(`Created ${amount} NOIA tokens for: ${to}. Transaction hash: ${transactionHash}`);

  // checking the balance
  const balance = await token.balanceOf.call(to, {from: from});
  console.log(`Address: ${to}. NOIA tokens balance: ${balance}`);
}

async function readFile(path) {
  return await readFileAsync(path, "utf8");
}

// start it off
main().then(() => {
  console.log(`Finished!`);
}).catch((err) => {
  console.log(`Error: `, err);
});
