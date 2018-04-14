const contract = require("truffle-contract");

const NoiaNetwork = contract(require("./contracts/NoiaNetwork.json"));
const ERC223Interface = contract(require("./contracts/ERC223Interface.json"));

var noia;
var tokenContract;

module.exports = {
    init: async (provider, noia) => {
        NoiaNetwork.setProvider(provider);
        ERC223Interface.setProvider(provider);

        if (typeof noia === 'undefined') {
            noia = await NoiaNetwork.deployed();
        }
        tokenContract = ERC223Interface.at(await noia.tokenContract.call());
    },

    uninit: () => {
    },

    balanceOf: async owner => {
        return (await tokenContract.balanceOf.call(owner)).toNumber();
    },

    transfer: async (from, to, value) => {
        await tokenContract.transfer(to, value, { from : from, gas: 200000 });
    }
};
