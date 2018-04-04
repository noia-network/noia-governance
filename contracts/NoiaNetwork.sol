pragma solidity ^0.4.11;

import "./abstracts/ERC223_interface.sol";

contract NoiaNetwork {
    ERC223Interface public tokenContract;

    function NoiaNetwork(ERC223Interface _tokenContract) public {
        tokenContract = _tokenContract;
    }
}
