pragma solidity ^0.4.11;

import '../../abstracts/Owned.sol';
import './NoiaMarketplace.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContract is Owned {
    address public factory;
    NoiaMarketplace public marketplace;
    uint16 public version;

    constructor(
        address factory_,
        NoiaMarketplace marketplace_,
        uint16 version_) public {
        // factory nees to prove its identity
        require(msg.sender == factory_);
        version = version_;
        factory = factory_;
        marketplace = marketplace_;
    }
}
