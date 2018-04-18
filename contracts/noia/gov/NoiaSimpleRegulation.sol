pragma solidity ^0.4.11;

import './NoiaRegulation.sol';

/**
 * Noia Regulation Rules
 */
contract NoiaSimpleRegulation
    is NoiaRegulation, Owned {
    mapping(address => bool) approvedContractFactory;

    function addApprovedFactory(address contractFactory) onlyOwner public {
        approvedContractFactory[contractFactory] = true;
    }

    // NOTE! baseContract.factory() has to be validated by the caller!
    function isContractValid(NoiaBaseContract baseContract) public view returns (bool) {
        return approvedContractFactory[baseContract.factory()];
    }
}
