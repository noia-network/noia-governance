pragma solidity ^0.4.11;

import './NoiaMarketplace.sol';

contract NoiaBaseContractsFactory {
    NoiaMarketplace public marketplace;

    function NoiaBaseContractsFactory(NoiaMarketplace marketplace_) public {
        marketplace = marketplace_;
    }
}
