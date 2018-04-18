pragma solidity ^0.4.11;

import '../gov/NoiaBaseContract.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContractV1 is NoiaBaseContract {
    uint16 private constant CURRENT_VERSION = 1;

    function NoiaBaseContractV1() NoiaBaseContract(CURRENT_VERSION) public {
    }
}
