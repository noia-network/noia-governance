pragma solidity ^0.4.11;

import '../../abstracts/Owned.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContract is Owned {
    uint16 public version;

    function NoiaBaseContract(uint16 version_) public {
        version = version_;
    }
}
