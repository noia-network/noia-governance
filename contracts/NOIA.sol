pragma solidity ^0.4.11;

import "./abstracts/ERC223_interface.sol";

contract NOIA {
    ERC223Interface public tokenContract;

    function NOIA(ERC223Interface _tokenContract) public {
        tokenContract = _tokenContract;
    }
}
