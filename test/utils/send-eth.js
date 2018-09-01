const Web3 = require('web3');

// const walletProvider = new Web3.providers.HttpProvider('http://eth.oja.me:3304/');
const walletProvider = new Web3.providers.HttpProvider('http://localhost:7545/');
const web3 = new Web3(walletProvider);

async function main() {
  const from = web3.eth.accounts[0];
  const to = '0x8517156cbdf189a1531b808d1069efc46af49e01'; // node wallet address
  // const to = '0xd5d21069f55a35c5ff9086babc5e3ee1e5b7aeab'; // business wallet address
  // const to = '0xd5d21069f55a35c5ff9086babc5e3ee1e5b7aeab'; // business wallet address
  const gas = 21000;
  const value = web3.toWei('1', 'ether');
  console.log(`Transferring ${value}Wei's from: ${from}, to: ${to}, ether: ${web3.fromWei(value, 'ether')}`);

  const transactionHash = await web3.eth.sendTransaction({
    from: from,
    to: to,
    value: value,
    gas: gas
  });
  console.log(`Transferred ${value}Wei's from: ${from}, to: ${to}, transaction hash: ${transactionHash}`);

  // const receipt = await new Promise((resolve, reject) => {
  //   web3.eth.getTransactionReceipt('0x84d8582b4f3b444db383606c49212a080c6701a047290e41d4d084512fc65796', (err, receipt) => {
  //     if (err) {
  //       return reject(err);
  //     }
  //     console.log(receipt);
  //     resolve(receipt);
  //   });
  // });
  // console.log(receipt);
  // return;

  // await new Promise((resolve, reject) => {
  //   web3.eth.getBalance('0xd5d21069f55a35c5ff9086babc5e3ee1e5b7aeab', (err, balance) => {
  //     console.log(balance.toString());
  //   });
  // });
  // return;

  // const temp = web3.toAscii("0x5b37e1506170706c69636174696f6e2f6a736f6e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002b7b226e6f64655f6970223a223132372e302e302e31222c226e6f64655f77735f706f7274223a373637377d000000000000000000000000000000000000000000")
  // console.log(temp)
  // return
}

// start it off
main().then(() => {
  console.log(`Finished!`);
}).catch((err) => {
  console.log(`Error: `, err);
});
