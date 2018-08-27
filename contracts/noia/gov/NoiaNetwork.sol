pragma solidity ^0.4.11;

import '../../abstracts/ERC223Interface.sol';
import './NoiaRegistry.sol';
import './NoiaMarketplace.sol';

/**
 * Entrypoint of the Noia Network, including:
 *
 * - token contract (ERC223)
 * - Regulation: what node/business/jobPosts are valid contracts
 * - Marketplace: node/business/jobPosts registries
 * - Legislative Body: TODO, how regulation can evovle in time
 */
contract NoiaNetwork {
    ERC223Interface public tokenContract;
    NoiaRegulation public regulation;
    NoiaMarketplace public marketplace;

    constructor(
        ERC223Interface tokenContract_,
        NoiaRegulation regulation_) public {
        tokenContract = tokenContract_;
        regulation = regulation_;
        marketplace = new NoiaMarketplace(tokenContract, regulation);
    }
}
