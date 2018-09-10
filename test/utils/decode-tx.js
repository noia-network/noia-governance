const fs = require('fs');
const util = require('util');
const path = require('path');
const txDecoder = require('ethereum-tx-decoder');

const readFileAsync = util.promisify(fs.readFile);

async function main() {
    const rootDir = path.resolve(__dirname, '../../');
    if (process.argv.length <= 3) {
        console.log(`Usage: node <script.js> <contract-path> <0x-raw-params>`);
        console.log(`Example: node test/utils/decode-tx.js sdk/contracts/NoiaWorkOrderV1.json 0xf8a950843b9aca008301fc80943ff8599be0942cbd50e0e527222996c48b838ea180b844ba3e095c0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000005b87f98a1ba073eee872e5567fe77631b317a40aee91d4ee77908bbac7cc88101bf2e308e744a0718a05df6b2aeb35f0a2e2aaf3a57732df606a4778be5d31b021c6794a8436b1`);
        return;
    }
    const args = process.argv.splice(2);
    const contractPath = args[0];
    const rawParams = args[1];
    // const contractPath = 'sdk/contracts/NoiaWorkOrderV1.json';
    // const rawParams = '0xf8a950843b9aca008301fc80943ff8599be0942cbd50e0e527222996c48b838ea180b844ba3e095c0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000005b87f98a1ba073eee872e5567fe77631b317a40aee91d4ee77908bbac7cc88101bf2e308e744a0718a05df6b2aeb35f0a2e2aaf3a57732df606a4778be5d31b021c6794a8436b1';

    // get the contract abi-s and deployed addresses
    const NOIAWorkOrderJson = JSON.parse(await readFile(path.join(rootDir, contractPath)));

    // contract abi
    const fnDecoder = new txDecoder.FunctionDecoder(NOIAWorkOrderJson.abi);

    // transaction params
    const dtx = txDecoder.decodeTx(rawParams);
    console.log(`Decoded transaction:`);
    console.log(dtx);

    // decode the function
    const df = fnDecoder.decodeFn(dtx.data);
    console.log(`\nDecoded transaction data:`);
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
