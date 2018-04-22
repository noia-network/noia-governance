'use strict';

const contract = require("truffle-contract");

const NodeClient = require('./node_client.js');
const BusinessClient = require('./business_client.js');

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    recoverAddressFromRpcSignedMessage,
} = require('../common/web3_utils.js');

var contracts = {};
var owner;
var noia;
var factory;
var tokenContract;
var marketplace;
var nodeRegistry;
var businessRegistry;
var web3;

module.exports = {
    init: async (provider_, owner_, noia_, factory_) => {
        // initialize contracts
        {
            contracts.ERC223Interface = contract(require("./contracts/ERC223Interface.json"));
            contracts.Owned = contract(require("./contracts/Owned.json"));
            contracts.NoiaNetwork = contract(require("./contracts/NoiaNetwork.json"));
            contracts.NoiaRegistry = contract(require("./contracts/NoiaRegistry.json"));
            contracts.NoiaMarketplace = contract(require("./contracts/NoiaMarketplace.json"));
            contracts.NoiaContractsFactory = contract(require("./contracts/NoiaContractsFactoryV1.json"));
            contracts.NoiaNode = contract(require("./contracts/NoiaNodeV1.json"));
            contracts.NoiaBusiness = contract(require("./contracts/NoiaBusinessV1.json"));
            for (var i in contracts) contracts[i].setProvider(provider_);
        }

        if (provider_.addresses) {
            owner = provider_.addresses[0];
        }
        if (typeof owner_ !== 'undefined') {
            owner = owner_;
        }

        if (typeof noia_ === 'undefined') {
            noia = await contracts.NoiaNetwork.deployed();
        } else {
            noia = noia_;
        }
        if (typeof factory_ === 'undefined') {
            factory = await contracts.NoiaContractsFactory.deployed();
        } else {
            factory = factory_;
        }

        tokenContract = contracts.ERC223Interface.at(await noia.tokenContract.call());
        marketplace = contracts.NoiaMarketplace.at(await noia.marketplace.call());
        nodeRegistry = contracts.NoiaRegistry.at(await marketplace.nodeRegistry.call());
        businessRegistry = contracts.NoiaRegistry.at(await marketplace.businessRegistry.call());

        web3 = marketplace.constructor.web3;
    },

    uninit: () => {
    },

    // if nodeAddress is undefined, new node contract will be created
    createBusinessClient: async (businessInfo) => {
        let client = new BusinessClient(contracts, owner, marketplace, factory, null, businessInfo);
        await client.init();
        return client;
    },

    getBusinessClient: async businessAddress => {
        let client = new BusinessClient(contracts, owner, marketplace, factory, businessAddress);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    createNodeClient: async (nodeInfo) => {
        let client = new NodeClient(contracts, owner, marketplace, factory, null, nodeInfo);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    getNodeClient: async (nodeAddress) => {
        let client = new NodeClient(contracts, owner, marketplace, factory, nodeAddress);
        await client.init();
        return client;
    },

    isBusinessRegistered: async businessAddress => {
        return await businessRegistry.hasEntry.call(businessAddress);
    },

    isNodeRegistered: async nodeAddress => {
        return await nodeRegistry.hasEntry.call(nodeAddress);
    },

    getOwnerAddress: async address => {
        let owned = await contracts.Owned.at(address);
        return await owned.owner();
    },

    recoverAddressFromRpcSignedMessage: (msg, sgn) => {
        return recoverAddressFromRpcSignedMessage(msg, sgn);
    },

    balanceOf: async owner => {
        return (await tokenContract.balanceOf.call(owner)).toNumber();
    },

    transfer: async (from, to, value) => {
        await tokenContract.transfer(to, value, { from : from, gas: 200000 });
    }
};
