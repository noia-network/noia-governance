pragma solidity ^0.4.11;

import { ERC777Token } from "noia-token/contracts/erc777/contracts/ERC777Token.sol";
import "./NoiaRegulation.sol";
import "./NoiaRegistry.sol";

/**
 * Noia Marketplace
 *
 * Including:
 * - node registry
 * - business registry
 * - job post registry
 */
contract NoiaMarketplace {
    ERC777Token public tokenContract;

    NoiaRegistry public nodeRegistry;
    NoiaRegistry public businessRegistry;
    NoiaRegistry public certificatesRegistry;
    NoiaRegistry public jobPostRegistry;

    constructor(ERC777Token tokenContract_, NoiaRegulation regulation) public {
        tokenContract = tokenContract_;
        nodeRegistry = new NoiaRegistry(regulation);
        businessRegistry = new NoiaRegistry(regulation);
        certificatesRegistry = new NoiaRegistry(regulation);
        jobPostRegistry = new NoiaRegistry(regulation);
    }
}
