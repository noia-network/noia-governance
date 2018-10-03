pragma solidity ^0.4.11;

import "./NoiaBaseContract.sol";

/**
 * Noia Regulation Rules
 */
contract NoiaRegulation {
    function isContractValid(NoiaBaseContract baseContract) public view returns (bool);
}
