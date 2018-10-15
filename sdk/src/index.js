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
const common = require('../../common/web3_utils.js');

class NoiaSdk {
  constructor() {
    this.provider = undefined;
    this.owner = undefined;
    this.ownerPrivateKey = null;
    this.contracts = null;
    this.instances = null;
    this.logger = null;
    this.web3 = null;
  }

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
   *  - Using internal hdwallet provider with mnemonic:
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
   *  - Using internal http provider with owner address:
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
   *            owner: <account address>
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
  async init(options) {
    const {account, web3: web3Config} = options;
    let {mnemonic} = account;
    let {provider_url, provider_options} = web3Config;
    this.owner = account.owner;
    this.provider = web3Config.provider;

    // web3 and account
    if (typeof this.provider === 'undefined') {
      if (provider_url) {
        const providerOptions = provider_options || {};
        const {headers} = providerOptions;

        // check if http provider headers are provided
        let httpHeaders;
        if (headers) {
          if (Array.isArray(headers)) {
            // headers array coming in
            httpHeaders = headers;
          } else if (headers.name && headers.value) {
            // simple object with just name & value provided in options, convert it to an array
            httpHeaders = [headers];
          }
        }

        // setup the provider
        let httpProvider = new Web3.providers.HttpProvider(
          provider_url,
          undefined,
          undefined,
          undefined,
          httpHeaders
        );
        if (mnemonic) {
          this.provider = new Web3HDWalletProvider(httpProvider, mnemonic);
          this.owner = this.provider.addresses[0];
        } else if (account.owner) {
          this.provider = httpProvider;
          this.owner = account.owner;
        } else {
          throw new Error(`web3.provider_url without account.mnemonic or account.owner!`);
        }
      } else {
        throw new Error('Neither an external provider nor a pair of (web3.provider_url, account.mnemonic) is not provided');
      }
    } else {
      if (typeof this.owner === 'undefined') {
        throw new Error('account.owner must be defined when an external provider is set');
      }
      // validate provider interface
      if (!this.provider.wallets) {
        throw new Error('provider must have wallets defined');
      }
    }

    if (this.provider.wallets) {
      this.ownerPrivateKey = this.provider.wallets[this.owner].getPrivateKey();
    }

    if (typeof this.provider.start === 'function') {
      await this.provider.start();
    }

    // initialize contracts code
    const contracts = this.contracts = {};
    {
      contracts.ERC20Token = contract(require("../contracts/ERC20Token.json"));
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
      contracts.NoiaWorkOrder = contract(require("../contracts/NoiaWorkOrderV1.json"));
      for (let i in contracts) contracts[i].setProvider(this.provider);
    }

    this.web3 = contracts.NoiaNetwork.web3;

    // intialize contract instances
    const instances = this.instances = {};
    {
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
      instances.tokenContract = await contracts.ERC20Token.at(await instances.noia.tokenContract.call());
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
      this.logger = options.logger;
    } else {
      const logger = this.logger =  {
        info : debug('noiagov:info'),
        warn : debug('noiagov:warn'),
        error : debug('noiagov:error')
      };
      logger.info.log = console.info.bind(console);
      logger.warn.log = console.warn.bind(console);
      logger.error.log = console.error.bind(console);
    }
  }

  /**
   * Unitialize the sdk and release all resources
   */
  uninit() {
    if (typeof this.provider.stop === 'function') {
      this.provider.stop();
    }
    this.provider = undefined;
    this.owner = undefined;
    this.ownerPrivateKey = undefined;
    this.contracts = undefined;
    this.web3 = undefined;
    this.instances = undefined;
    this.logger = undefined;
  }

  /**
   * Return owner address used for all transactions
   */
  getOwnerAddress() {
    return this.owner;
  }

  /**
   * [async] Get a base client
   *
   * With a base client you could interact with noia and watch noia events
   * without having a business or node client.
   *
   * @return the base client
   */
  async getBaseClient() {
    return await new BaseClient({
      logger: this.logger,
      web3: this.web3,
      account: {
        owner: this.owner,
        ownerPrivateKey: this.ownerPrivateKey
      },
      contracts: this.contracts,
      instances: this.instances
    });
  }

  /**
   * [async] Create new business client contract
   *
   * @param businessInfo - meta info about the business
   * @return new client created
   */
  async createBusinessClient(businessInfo) {
    return await new BusinessClient({
      logger: this.logger,
      web3: this.web3,
      account: {
        owner: this.owner,
        ownerPrivateKey: this.ownerPrivateKey
      },
      contracts: this.contracts,
      instances: this.instances,
      info: businessInfo
    });
  }

  /**
   * [async] Get the business client contract at the address
   *
   * @param businessAddress - address of the business client contract
   * @return the business client
   */
  async getBusinessClient(businessAddress) {
    return await new BusinessClient({
      logger: this.logger,
      web3: this.web3,
      account: {
        owner: this.owner,
        ownerPrivateKey: this.ownerPrivateKey
      },
      contracts: this.contracts,
      instances: this.instances,
      at: businessAddress
    });
  }


  /**
   * [async] Create new node client contract
   *
   * @param nodeInfo - meta info about the node
   */
  async createNodeClient(nodeInfo) {
    return await new NodeClient({
      logger: this.logger,
      web3: this.web3,
      account: {
        owner: this.owner,
        ownerPrivateKey: this.ownerPrivateKey
      },
      contracts: this.contracts,
      instances: this.instances,
      info: nodeInfo
    });
  }

  /**
   * [async] Get the node client contract at the address
   *
   * @param nodeAddress - address of the node client contract
   * @return the node client
   */
  async getNodeClient(nodeAddress) {
    return await new NodeClient({
      logger: this.logger,
      web3: this.web3,
      account: {
        owner: this.owner,
        ownerPrivateKey: this.ownerPrivateKey
      },
      contracts: this.contracts,
      instances: this.instances,
      at: nodeAddress
    });
  }

  isAddress(address) {
    return this.web3.isAddress(address);
  }

  /**
   * [async] Get the job post contract at the address
   *
   * @param nodeAddress - address of job post contract
   * @return the job post
   */
  async getJobPost(jobPostAddress) {
    return await JobPost.getInstance(this.owner, this.contracts, jobPostAddress, this.logger);
  }

  /**
   * [async] Check if there is a business client contract at the address
   *
   * @param nodeAddress - address of the business client contract
   * @return true/false
   */
  async isBusinessRegistered(businessAddress) {
    return await this.instances.businessRegistry.hasEntry.call(businessAddress);
  }

  /**
   * [async] Check if there is a node client contract at the address
   *
   * @param nodeAddress - address of the node client contract
   * @return true/false
   */
  async isNodeRegistered(nodeAddress) {
    return await this.instances.nodeRegistry.hasEntry.call(nodeAddress);
  }

  /**
   * [async] Get the owner at a Owner contract
   *
   * @param address - The Owner contract's address
   * @return owner address of the Owner contract
   */
  async getOwnerOfContract(address) {
    let owned = await this.contracts.Owned.at(address);
    return await owned.owner();
  }

  /**
   * Recover address of the signer who signed the message with its private key
   *
   * @param string msg - original message
   * @param Signature sgn - signature object returned by client.signMessage
   * @return address of the signer
   */
  recoverAddressFromSignedMessage(msg, sgn) {
    return recoverAddressFromSignedMessage(msg, sgn);
  }

  /**
   * Recover address of the signer who signed the message through rpc call
   *
   * @param string msg - original message
   * @param Signature sgn - signature object returned by client.rpcSignMessage
   * @return address of the signer
   */
  recoverAddressFromRpcSignedMessage(msg, sgn) {
    return recoverAddressFromRpcSignedMessage(msg, sgn);
  }

  /**
   * [async] Get ethereum coin balance of anyone
   *
   * @return Number with unit in ether
   */
  async getEtherBalance(who) {
    const web3 = this.web3;
    return await new Promise(function (resolve, reject) {
      web3.eth.getBalance(who, function (err, result) {
        if (err) reject(err);
        else resolve(web3.fromWei(result, 'ether').toNumber());
      });
    })
  }

  /**
   * [async] Transfer ethereum coin from owner to others
   *
   * @param to - transfer ether to this account
   * @param value - amount of ethereum coin to be transferred, in unit of ether
   */
  async transferEther(to, value) {
    const web3 = this.web3;
    const owner = this.owner;
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
  }

  /**
   * [async] Get Noia token balance of anyone
   *
   * @return Number with floating point
   */
  async getNoiaBalance(who) {
    const balance = await this.getNoiaBalanceBN(who);
    return balance.dividedBy(common.noiaTokenDecimals).toNumber();
  }

    /**
   * [async] Get Noia token balance of anyone
   *
   * @return BigNumber
   */
  async getNoiaBalanceBN(who) {
    return await this.instances.tokenContract.balanceOf.call(who);
  }

  /**
   * [async] Transfer noia token from owner to others
   *
   * @param to - transfer ether to this account
   * @param value - amount of noia token to be transferred
   */
  async transferNoiaToken(to, value) {
    return await sendTransactionAndWaitForReceiptMined(this.web3, this.instances.tokenContract.transfer,
                                                       { from : this.owner },
                                                       to, value);
  }

  async getNetworkId() {
    return new Promise((resolve, reject) => {
      this.web3.version.getNetwork((err, netId) => {
        if (err) {
          return reject(err);
        }
        resolve(netId);
      });
    });
  }

  noiaTokensToWeis(tokens) {
    return common.noiaTokensToWeis(tokens);
  }

  noiaTokensFromWeis(weis) {
    return common.noiaTokensFromWeis(tokens);
  }
}

const sdk = new NoiaSdk();
const api = {
  NoiaSdk: NoiaSdk
};

// export all the functions and bind the default sdk instance to them
const ownProps = Object.getOwnPropertyNames(NoiaSdk.prototype);
for (let i=0; i < ownProps.length; i++) {
  const propName = ownProps[i];
  const propValue = sdk[propName];
  // console.log(`Prop type: ${typeof propValue}`);
  if (typeof propValue === "function") {
    if (propName === "constructor") { continue; }
    // console.log(`Exporting the sdk function: ${propName} and binding default sdk instance to it!`);
    api[propName] = propValue.bind(sdk);
  }
}

module.exports = api;
