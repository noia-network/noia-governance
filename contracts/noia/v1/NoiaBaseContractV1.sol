pragma solidity ^0.4.11;

import '../gov/NoiaBaseContract.sol';
import '../gov/NoiaBaseContractsFactory.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContractV1 is NoiaBaseContract {
    uint16 private constant CURRENT_VERSION = 1;

    function NoiaBaseContractV1(NoiaBaseContractsFactory factory)
        NoiaBaseContract(factory, CURRENT_VERSION) public {
        require(msg.sender == address(factory));
    }
}
