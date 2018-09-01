const fs = require('fs');
const util = require('util');
const txDecoder = require('ethereum-tx-decoder');

const readFileAsync = util.promisify(fs.readFile);

async function main() {
  // get the contract abi-s and deployed addresses
  const NOIAWorkOrderJson = JSON.parse(await readFile('../noia-governance/sdk/contracts/NoiaWorkOrderV1.json'));

  // contract abi
  const fnDecoder = new txDecoder.FunctionDecoder(NOIAWorkOrderJson.abi);

  // transaction params
  const raw = '0xf8a950843b9aca008301fc80943ff8599be0942cbd50e0e527222996c48b838ea180b844ba3e095c0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000005b87f98a1ba073eee872e5567fe77631b317a40aee91d4ee77908bbac7cc88101bf2e308e744a0718a05df6b2aeb35f0a2e2aaf3a57732df606a4778be5d31b021c6794a8436b1';
  const dtx = txDecoder.decodeTx(raw);
  console.log(dtx);

  // decode the function
  const df = fnDecoder.decodeFn(dtx.data);
  console.log(df);
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
