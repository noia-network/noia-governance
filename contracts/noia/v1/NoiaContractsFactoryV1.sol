pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaBusinessV1.sol';
import './NoiaNodeV1.sol';

contract NoiaContractsFactoryV1 {
    NoiaMarketplace marketplace;

    function NoiaContractsFactoryV1(NoiaMarketplace marketplace_) public {
        marketplace = marketplace_;
    }

    function createBusiness() public {
        NoiaBusinessV1 business = new NoiaBusinessV1();
        business.changeOwner(msg.sender);
        marketplace.businessRegistry().addEntry(business);
        emit NoiaBusinessCreatedV1(address(business));
    }

    event NoiaBusinessCreatedV1(address businessAddress);

    function createNode() public {
        NoiaNodeV1 node = new NoiaNodeV1();
        node.changeOwner(msg.sender);
        marketplace.nodeRegistry().addEntry(node);
        emit NoiaNodeCreatedV1(address(node));
    }

    event NoiaNodeCreatedV1(address nodeAddress);
}
