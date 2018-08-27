pragma solidity ^0.4.11;

import '../gov/NoiaBaseContract.sol';

/**
 * Base contract for Noia Contracts
 */
contract NoiaBaseContractV1 is NoiaBaseContract {
    uint16 private constant CURRENT_VERSION = 1;

    constructor(address factory, NoiaMarketplace marketplace)
        NoiaBaseContract(factory, marketplace, CURRENT_VERSION) public {
    }
}
