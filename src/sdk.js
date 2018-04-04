const contract = require("truffle-contract");
const Web3 = require('web3');

const NoiaNetwork = contract(require("../build/contracts/NoiaNetwork.json"));
const ERC223Interface = contract(require("../build/contracts/ERC223Interface.json"));


var web3;
var accounts;
var noia;
var tokenContract;

module.exports = {
    init: async (provider) => {
        NoiaNetwork.setProvider(provider);
        web3 = new Web3(provider);
        await new Promise((resolve, reject) => {
            web3.eth.getAccounts((error, result) => {
                if (error) reject(error);
                accounts = result;
                resolve();
            });
        });
        noia = await NoiaNetwork.deployed();
        tokenContract = ERC223Interface.at(await noia.tokenContract.call());
    },

    balanceOf: async owner => {
        return 0;
    },

    createTokens: async (to, num) => {

    }
};
