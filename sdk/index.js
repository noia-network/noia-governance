'use strict';

const contract = require("truffle-contract");

const NodeClient = require('./node_client.js');
const BusinessClient = require('./business_client.js');

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    singMessage,
    recoverAddressFromSignedMessage
} = require('../common/web3_utils.js');

var contracts = {};
var accounts;
var noia;
var tokenContract;
var marketplace;
var factory;
var web3;

module.exports = {
    init: async (provider, accounts_, noia_, factory_) => {
        contracts.ERC223Interface = contract(require("./contracts/ERC223Interface.json"));
        contracts.Owned = contract(require("./contracts/Owned.json"));
        contracts.NoiaNetwork = contract(require("./contracts/NoiaNetwork.json"));
        contracts.NoiaRegistry = contract(require("./contracts/NoiaRegistry.json"));
        contracts.NoiaMarketplace = contract(require("./contracts/NoiaMarketplace.json"));
        contracts.NoiaContractsFactory = contract(require("./contracts/NoiaContractsFactoryV1.json"));
        contracts.NoiaNode = contract(require("./contracts/NoiaNodeV1.json"));
        contracts.NoiaBusiness = contract(require("./contracts/NoiaBusinessV1.json"));
        for (var i in contracts) contracts[i].setProvider(provider);

        accounts = accounts_;

        if (typeof noia_ === 'undefined') {
            noia = await NoiaNetwork.deployed();
        } else {
            noia = noia_;
        }
        if (typeof factory_ === 'undefined') {
            factory = await NoiaContractsFactory.deployed();
        } else {
            factory = factory_;
        }

        tokenContract = contracts.ERC223Interface.at(await noia.tokenContract.call());
        marketplace = contracts.NoiaMarketplace.at(await noia.marketplace());

        web3 = marketplace.constructor.web3;
    },

    uninit: () => {
    },

    getBusinessClient: async businessAddress => {
        let client = new BusinessClient(contracts, accounts[0], marketplace, factory, businessAddress);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    createNodeClient: async (nodeInfo) => {
        let client = new NodeClient(contracts, accounts[0], marketplace, factory, nodeAddress);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    getNodeClient: async (nodeAddress) => {
        let client = new NodeClient(contracts, accounts[0], marketplace, factory, nodeAddress);
        await client.init();
        return client;
    },

    isBusinessRegistered: async nodeAddress => {

    },

    isNodeRegistered: async nodeAddress => {

    },

    getOwnerAddress: async address => {
        let owned = await contracts.Owned.at(address);
        return await owned.owner();
    },

    recoverAddressFromSignedMessage: (msg, sgn) => {
        return recoverAddressFromSignedMessage(web3, msg, sgn);
    },

    balanceOf: async owner => {
        return (await tokenContract.balanceOf.call(owner)).toNumber();
    },

    transfer: async (from, to, value) => {
        await tokenContract.transfer(to, value, { from : from, gas: 200000 });
    }
};
