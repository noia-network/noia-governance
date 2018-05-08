pragma solidity ^0.4.11;

import '../../abstracts/Owned.sol';
import './NoiaBaseContractsFactory.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContract is Owned {
    NoiaBaseContractsFactory public factory;
    uint16 public version;

    function NoiaBaseContract(NoiaBaseContractsFactory factory_, uint16 version_) public {
        version = version_;
        factory = factory_;
    }
}
