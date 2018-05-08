'use strict';

const debug = require('debug')('noiagov');
const contract = require("truffle-contract");
const HDWalletProvider = require("truffle-hdwallet-provider");

const NodeClient = require('./node_client.js');
const BusinessClient = require('./business_client.js');

const util = require('util');

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    recoverAddressFromRpcSignedMessage,
} = require('../common/web3_utils.js');

var owner;
var contracts = {};
var web3;
var noia;
var factory;
var tokenContract;
var marketplace;
var nodeRegistry;
var businessRegistry;

module.exports = {
    /**
     * Initialize the SDK
     *
     * options:
     *   - (optional) account_mnemonic - account mnemonic
     *   - (optional) provider_url - provider_url
     *   - (optional) web3_provider - provide the external web3 provider instead
     *   - (optional) deployed_contracts - provide deployed noia, factory contracts
     *   - (optional) owner - provider the default address to fund all transactions
     */
    init: async (options) => {
        let provider;

        if (typeof options.web3_provider === 'undefined') {
            if (options.provider_url && options.account_mnemonic) {
                provider = new HDWalletProvider(options.account_mnemonic, options.provider_url);
                owner = provider.addresses[0];
            }
        } else {
            provider = options.web3_provider;
            owner = options.owner;
            if (typeof owner === 'undefined') {
                throw new Error('options.owner is not defined when an external provider is set');
            }
        }

        if (typeof provider === 'undefined') {
            throw new Error('Neither an external provider nor a pair of (provider_url, account_mnemonic) is not provided');
        }

        // initialize contracts code
        {
            contracts.ERC223Interface = contract(require("./contracts/ERC223Interface.json"));
            contracts.Owned = contract(require("./contracts/Owned.json"));
            contracts.NoiaNetwork = contract(require("./contracts/NoiaNetwork.json"));
            contracts.NoiaRegistry = contract(require("./contracts/NoiaRegistry.json"));
            contracts.NoiaMarketplace = contract(require("./contracts/NoiaMarketplace.json"));
            contracts.NoiaContractsFactory = contract(require("./contracts/NoiaContractsFactoryV1.json"));
            contracts.NoiaNode = contract(require("./contracts/NoiaNodeV1.json"));
            contracts.NoiaBusiness = contract(require("./contracts/NoiaBusinessV1.json"));
            for (var i in contracts) contracts[i].setProvider(provider);
        }

        web3 = contracts.NoiaNetwork.web3;

        // intialize contract instances
        if (typeof options.deployed_contracts.noia === 'undefined') {
            noia = await contracts.NoiaNetwork.deployed();
        } else {
            noia = options.deployed_contracts.noia;
        }
        if (typeof options.deployed_contracts.factory === 'undefined') {
            factory = await contracts.NoiaContractsFactory.deployed();
        } else {
            factory = options.deployed_contracts.factory;
        }
        tokenContract = contracts.ERC223Interface.at(await noia.tokenContract.call());
        marketplace = contracts.NoiaMarketplace.at(await noia.marketplace.call());
        nodeRegistry = contracts.NoiaRegistry.at(await marketplace.nodeRegistry.call());
        businessRegistry = contracts.NoiaRegistry.at(await marketplace.businessRegistry.call());
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

    ethBalanceOf: async owner => {
        return await new Promise(function (resolve, reject) {
            web3.eth.getBalance(owner, function (err, result) {
                if (err) reject(err);
                else resolve(web3.fromWei(result, 'ether').toNumber());
            });
        })
    },

    transfer: async (from, to, value) => {
        await tokenContract.transfer(to, value, { from : from, gas: 200000 });
    }
};
