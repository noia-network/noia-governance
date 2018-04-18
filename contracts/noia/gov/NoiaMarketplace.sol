pragma solidity ^0.4.11;

import '../../abstracts/ERC223Interface.sol';
import './NoiaRegulation.sol';
import './NoiaRegistry.sol';

/**
 * Noia Marketplace
 *
 * Including:
 * - node registry
 * - business registry
 * - job post registry
 */
contract NoiaMarketplace {
    ERC223Interface public tokenContract;

    NoiaRegistry public nodeRegistry;
    NoiaRegistry public businessRegistry;
    NoiaRegistry public jobPostRegistry;

    function NoiaMarketplace(ERC223Interface tokenContract_, NoiaRegulation regulation) public {
        tokenContract = tokenContract_;
        nodeRegistry = new NoiaRegistry(regulation);
        businessRegistry = new NoiaRegistry(regulation);
        jobPostRegistry = new NoiaRegistry(regulation);
    }
}
