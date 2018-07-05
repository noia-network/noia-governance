'use strict';

const debug = require('debug');
const contract = require("truffle-contract");
const Web3 = require("web3");
const Web3HDWalletProvider = require("web3-hdwallet-provider");

const BaseClient = require('./base_client.js');
const NodeClient = require('./node_client.js');
const BusinessClient = require('./business_client.js');
const JobPost = require('./job_post.js');

const util = require('util');

const {
    isContract,
    getGasUsedForContractCreation,
    getGasUsedForTransaction,
    waitEventsFromWatcher,
    recoverAddressFromSignedMessage,
    recoverAddressFromRpcSignedMessage,
    getTransactionReceiptMined,
    sendTransactionAndWaitForReceiptMined
} = require('../../common/web3_utils.js');

var provider;
var owner;
var ownerPrivateKey;
var contracts;
var web3;
var instances;
var logger;

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
     *  Mandatory options:
     *
     *  - Using external provider:
     *    {
     *        web3: {
     *            provider : web3.currentProvider,
     *        },
     *        account: {
     *            owner: acc0
     *        }
     *    }
     *
     *  - Using internal provider:
     *    {
     *        web3: {
     *            provider_url : <provider_url>, // only http(s) supported
     *            provider_options: {
     *                timeout: ...,
     *                user: ...,
     *                password: ...,
     *                headers: ...
     *            }
     *
     *        },
     *        account: {
     *            mnemonic: "xxx yyy zzz"
     *        }
     *    }
     *
     *  Logger option:
     *  - Default: using debug module, with logger name 'noiagov:<level>'
     *
     *  - Supplied:
     *    logger: {
     *        info: [func],
     *        warn: [func],
     *        error: [func],
     *    }
     */
    init: async (options) => {
        // web3 and account
        if (typeof options.web3.provider === 'undefined') {
            if (options.web3.provider_url && options.account.mnemonic) {
                let providerOptions = options.web3.provider_options || {};
                let httpProvider = new Web3.providers.HttpProvider(options.web3.provider_url);
                provider = new Web3HDWalletProvider(httpProvider, options.account.mnemonic);
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
            // validate provider interface
            if (!provider.wallets) {
                throw new Error('provider must have wallets defined');
            }
        }

        ownerPrivateKey = provider.wallets[owner].getPrivateKey();
        if (typeof provider.start === 'function') {
            provider.start();
        }

        // initialize contracts code
        {
            contracts = {};
            contracts.ERC223Interface = contract(require("../contracts/ERC223Interface.json"));
            contracts.Owned = contract(require("../contracts/Owned.json"));
            contracts.NoiaNetwork = contract(require("../contracts/NoiaNetwork.json"));
            contracts.NoiaRegistry = contract(require("../contracts/NoiaRegistry.json"));
            contracts.NoiaMarketplace = contract(require("../contracts/NoiaMarketplace.json"));
            contracts.NoiaContractFactories = contract(require("../contracts/NoiaContractFactoriesV1.json"));
            contracts.NoiaBusinessContractFactory = contract(require("../contracts/NoiaBusinessContractFactoryV1.json"));
            contracts.NoiaNodeContractFactory = contract(require("../contracts/NoiaNodeContractFactoryV1.json"));
            contracts.NoiaCertificateContractFactory = contract(require("../contracts/NoiaCertificateContractFactoryV1.json"));
            contracts.NoiaJobPostContractFactory = contract(require("../contracts/NoiaJobPostContractFactoryV1.json"));
            contracts.NoiaNode = contract(require("../contracts/NoiaNodeV1.json"));
            contracts.NoiaBusiness = contract(require("../contracts/NoiaBusinessV1.json"));
            contracts.NoiaJobPost = contract(require("../contracts/NoiaJobPostV1.json"));
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
            let factories;
            if (typeof options.deployed_contracts.factories === 'undefined') {
                factories = await contracts.NoiaContractFactories.deployed();
            } else {
                factories = options.deployed_contracts.factories;
            }
            instances.tokenContract = await contracts.ERC223Interface.at(await instances.noia.tokenContract.call());
            instances.marketplace = await contracts.NoiaMarketplace.at(await instances.noia.marketplace.call());
            instances.nodeRegistry = await contracts.NoiaRegistry.at(await instances.marketplace.nodeRegistry.call());
            instances.businessRegistry = await contracts.NoiaRegistry.at(await instances.marketplace.businessRegistry.call());
            instances.jobPostRegistry = await contracts.NoiaRegistry.at(await instances.marketplace.jobPostRegistry.call());
            instances.factories = {};
            instances.factories.business = await contracts.NoiaBusinessContractFactory.at(await factories.business.call());
            instances.factories.node = await contracts.NoiaNodeContractFactory.at(await factories.node.call());
            instances.factories.certificate = await contracts.NoiaCertificateContractFactory.at(await factories.certificate.call());
            instances.factories.jobPost = await contracts.NoiaJobPostContractFactory.at(await factories.jobPost.call());
        }

        if (options.logger) {
            if (typeof options.logger.info !== 'function' ||
                typeof options.logger.warn !== 'function' ||
                typeof options.logger.error !== 'function') {
                throw new Error('invalid logger option');
            }
            logger = options.logger;
        } else {
            logger =  {
                info : debug('noiagov:info'),
                warn : debug('noiagov:warn'),
                error : debug('noiagov:error')
            };
            logger.info.log = console.info.bind(console);
            logger.warn.log = console.warn.bind(console);
            logger.error.log = console.error.bind(console);
        }

    },

    /**
     * Unitialize the sdk and release all resources
     */
    uninit: () => {
        if (typeof provider.stop === 'function') {
            provider.stop();
        }
        provider = undefined;
        owner = undefined;
        ownerPrivateKey = undefined;
        contracts = undefined;
        web3 = undefined;
        instances = undefined;
        logger = undefined;
    },

    /**
     * Return owner address used for all transactions
     */
    getOwnerAddress: () => {
        return owner;
    },

    /**
     * [async] Get a base client
     *
     * With a base client you could interact with noia and watch noia events
     * without having a business or node client.
     *
     * @return the base client
     */
    getBaseClient: async () => {
        return await new BaseClient({
            logger: logger,
            web3: web3,
            account: {
                owner: owner,
                ownerPrivateKey: ownerPrivateKey
            },
            contracts: contracts,
            instances: instances
        });
    },

    /**
     * [async] Create new business client contract
     *
     * @param businessInfo - meta info about the business
     * @return new client created
     */
    createBusinessClient: async businessInfo => {
        return await new BusinessClient({
            logger: logger,
            web3: web3,
            account: {
                owner: owner,
                ownerPrivateKey: ownerPrivateKey
            },
            contracts: contracts,
            instances: instances,
            info: businessInfo
        });
    },

    /**
     * [async] Get the business client contract at the address
     *
     * @param businessAddress - address of the business client contract
     * @return the business client
     */
    getBusinessClient: async businessAddress => {
        return await new BusinessClient({
            logger: logger,
            web3: web3,
            account: {
                owner: owner,
                ownerPrivateKey: ownerPrivateKey
            },
            contracts: contracts,
            instances: instances,
            at: businessAddress
        });
    },


    /**
     * [async] Create new node client contract
     *
     * @param nodeInfo - meta info about the node
     */
    createNodeClient: async nodeInfo => {
        return await new NodeClient({
            logger: logger,
            web3: web3,
            account: {
                owner: owner,
                ownerPrivateKey: ownerPrivateKey
            },
            contracts: contracts,
            instances: instances,
            info: nodeInfo
        });
    },

    /**
     * [async] Get the node client contract at the address
     *
     * @param nodeAddress - address of the node client contract
     * @return the node client
     */
    getNodeClient: async nodeAddress => {
        return await new NodeClient({
            logger: logger,
            web3: web3,
            account: {
                owner: owner,
                ownerPrivateKey: ownerPrivateKey
            },
            contracts: contracts,
            instances: instances,
            at: nodeAddress
        });
    },

    isAddress: address => {
        return web3.isAddress(address);
    },

    /**
     * [async] Get the job post contract at the address
     *
     * @param nodeAddress - address of job post contract
     * @return the job post
     */
    getJobPost: async jobPostAddress => {
        return await JobPost.getInstance(contracts, jobPostAddress, logger);
    },

    /**
     * [async] Check if there is a business client contract at the address
     *
     * @param nodeAddress - address of the business client contract
     * @return true/false
     */
    isBusinessRegistered: async businessAddress => {
        return await instances.businessRegistry.hasEntry.call(businessAddress);
    },

    /**
     * [async] Check if there is a node client contract at the address
     *
     * @param nodeAddress - address of the node client contract
     * @return true/false
     */
    isNodeRegistered: async nodeAddress => {
        return await instances.nodeRegistry.hasEntry.call(nodeAddress);
    },

    /**
     * [async] Get the owner at a Owner contract
     *
     * @param address - The Owner contract's address
     * @return owner address of the Owner contract
     */
    getOwnerOfContract: async address => {
        let owned = await contracts.Owned.at(address);
        return await owned.owner();
    },

    /**
     * Recover address of the signer who signed the message with its private key
     *
     * @param string msg - original message
     * @param Signature sgn - signature object returned by client.signMessage
     * @return address of the signer
     */
    recoverAddressFromSignedMessage: (msg, sgn) => {
        return recoverAddressFromSignedMessage(msg, sgn);
    },

    /**
     * Recover address of the signer who signed the message through rpc call
     *
     * @param string msg - original message
     * @param Signature sgn - signature object returned by client.rpcSignMessage
     * @return address of the signer
     */
    recoverAddressFromRpcSignedMessage: (msg, sgn) => {
        return recoverAddressFromRpcSignedMessage(msg, sgn);
    },

    /**
     * [async] Get ethereum coin balance of anyone
     *
     * @return Number with unit in ether
     */
    getEtherBalance: async who => {
        return await new Promise(function (resolve, reject) {
            web3.eth.getBalance(who, function (err, result) {
                if (err) reject(err);
                else resolve(web3.fromWei(result, 'ether').toNumber());
            });
        })
    },

    /**
     * [async] Transfer ethereum coin from owner to others
     *
     * @param to - transfer ether to this account
     * @param value - amount of ethereum coin to be transferred, in unit of ether
     */
    transferEther: async (to, value) => {
        return await new Promise(function (resolve, reject) {
            let valueInWei = web3.toWei(value, 'ether');
            web3.eth.sendTransaction({
                from: owner,
                to: to,
                value: valueInWei
            }, async function (err, txHash) {
                if (err) reject(err);
                else {
                    try {
                        await getTransactionReceiptMined(web3, txHash);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
            });
        });
    },

    /**
     * [async] Get Noia token balance of anyone
     *
     * @return Number with floating point
     */
    getNoiaBalance: async who => {
        return (await instances.tokenContract.balanceOf.call(who)).toNumber();
    },

    /**
     * [async] Transfer noia token from owner to others
     *
     * @param to - transfer ether to this account
     * @param value - amount of noia token to be transferred
     */
    transferNoiaToken: async (to, value) => {
        await sendTransactionAndWaitForReceiptMined(web3,instances.tokenContract.transfer,
            { from : owner },
            to, value);
    }
};
