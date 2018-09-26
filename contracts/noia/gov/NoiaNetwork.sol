pragma solidity ^0.4.11;

import { ERC777Token } from "noia-token/contracts/erc777/contracts/ERC777Token.sol";
import "./NoiaRegistry.sol";
import "./NoiaMarketplace.sol";

/**
 * Entrypoint of the Noia Network, including:
 *
 * - token contract (ERC777)
 * - Regulation: what node/business/jobPosts are valid contracts
 * - Marketplace: node/business/jobPosts registries
 * - Legislative Body: TODO, how regulation can evovle in time
 */
contract NoiaNetwork {
    ERC777Token public tokenContract;
    NoiaRegulation public regulation;
    NoiaMarketplace public marketplace;

    constructor(
        ERC777Token tokenContract_,
        NoiaRegulation regulation_) public {
        tokenContract = tokenContract_;
        regulation = regulation_;
        marketplace = new NoiaMarketplace(tokenContract, regulation);
    }
}
