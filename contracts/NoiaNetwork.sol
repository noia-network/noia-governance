pragma solidity ^0.4.11;

import './abstracts/ERC223_interface.sol';
import './NoiaMarketplace.sol';

contract NoiaNetwork {
    ERC223Interface public tokenContract;
    NoiaMarketplace public marketplace;

    function NoiaNetwork(ERC223Interface _tokenContract) public {
        tokenContract = _tokenContract;
        marketplace = new NoiaMarketplace();
    }
}
