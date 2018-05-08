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
var contracts;
var web3;
var instances;

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
     *   - web3 - web3 configuration
     *     - (optional) web3.provider_url - provider_url
     *     - (optional) web3.provider - provide the external web3 provider instead
     *   - account - account configuration
     *     - (optional) account.mnemonic - account mnemonic if external provider is not used
     *     - (optional) account.owner - provider the default address to fund all transactions
     *   - deployed_contracts - designated contracts to be used
     *     - deployed_contracts.noia - designated NoiaNetwork contract
     *     - deployed_contracts.factory = designated NoiaContractsFactory contract
     *
     *  Example options:
     *  * Using external provider:
        {
            web3: {
                provider : web3.currentProvider,
            },
            account: {
                owner: acc0
            }
        }
    *  * Using internal provider:
           {
               web3: {
                   provider_url : web3.currentProvider,
               },
               account: {
                   mnemonic: "xxx yyy zzz"
               }
           }
     */
    init: async (options) => {
        let provider;

        // web3 and account
        if (typeof options.web3.provider === 'undefined') {
            if (options.web3.provider_url && options.account.mnemonic) {
                provider = new HDWalletProvider(options.account.mnemonic, options.web3.provider_url);
                owner = provider.addresses[0];
            } else {
                throw new Error('Neither an external provider nor a pair of (web3.provider_url, account.mnemonic) is not provided');
            }
        } else {
            provider = options.web3.provider;
            owner = options.account.owner;
            if (typeof owner === 'undefined') {
                throw new Error('account.owner must be defined when an external provider is set');
            }
        }

        // account

        // initialize contracts code
        {
            contracts = {};
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
        {
            instances = {};
            if (typeof options.deployed_contracts === 'undefined') {
                options.deployed_contracts = {};
            }
            if (typeof options.deployed_contracts.noia === 'undefined') {
                instances.noia = await contracts.NoiaNetwork.deployed();
            } else {
                instances.noia = options.deployed_contracts.noia;
            }
            if (typeof options.deployed_contracts.factory === 'undefined') {
                instances.factory = await contracts.NoiaContractsFactory.deployed();
            } else {
                instances.factory = options.deployed_contracts.factory;
            }
            instances.tokenContract = contracts.ERC223Interface.at(await instances.noia.tokenContract.call());
            instances.marketplace = contracts.NoiaMarketplace.at(await instances.noia.marketplace.call());
            instances.nodeRegistry = contracts.NoiaRegistry.at(await instances.marketplace.nodeRegistry.call());
            instances.businessRegistry = contracts.NoiaRegistry.at(await instances.marketplace.businessRegistry.call());
        }
    },

    uninit: () => {
        owner = undefined;
        contracts = undefined;
        web3 = undefined;
        instances = undefined;
    },

    // if nodeAddress is undefined, new node contract will be created
    createBusinessClient: async (businessInfo) => {
        let client = new BusinessClient(contracts, owner, instances.marketplace, instances.factory, null, businessInfo);
        await client.init();
        return client;
    },

    getBusinessClient: async businessAddress => {
        let client = new BusinessClient(contracts, owner, instances.marketplace, instances.factory, businessAddress);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    createNodeClient: async (nodeInfo) => {
        let client = new NodeClient(contracts, owner, instances.marketplace, instances.factory, null, nodeInfo);
        await client.init();
        return client;
    },

    // if nodeAddress is undefined, new node contract will be created
    getNodeClient: async (nodeAddress) => {
        let client = new NodeClient(contracts, owner, instances.marketplace, instances.factory, nodeAddress);
        await client.init();
        return client;
    },

    isBusinessRegistered: async businessAddress => {
        return await instances.businessRegistry.hasEntry.call(businessAddress);
    },

    isNodeRegistered: async nodeAddress => {
        return await instances.nodeRegistry.hasEntry.call(nodeAddress);
    },

    getOwnerAddress: async address => {
        let owned = await contracts.Owned.at(address);
        return await owned.owner();
    },

    recoverAddressFromRpcSignedMessage: (msg, sgn) => {
        return recoverAddressFromRpcSignedMessage(msg, sgn);
    },

    balanceOf: async owner => {
        return (await instances.tokenContract.balanceOf.call(owner)).toNumber();
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
        await instances.tokenContract.transfer(to, value, { from : from, gas: 200000 });
    }
};
