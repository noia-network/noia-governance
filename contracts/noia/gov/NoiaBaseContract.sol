pragma solidity ^0.4.11;

import '../../abstracts/Owned.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContract is Owned {
    address public factory;
    uint16 public version;

    function NoiaBaseContract(address factory_, uint16 version_) public {
        version = version_;
        factory = factory_;
    }
}
