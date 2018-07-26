pragma solidity ^0.4.11;

import './NoiaBaseContract.sol';
import './NoiaRegulation.sol';

/**
 * Shared Noia Registry
 *
 * Features/Limitations:
 * - can add base contract to entry
 *   - only allow creator of the contract to add it to entries
 *   - only allow contracts passing the regulation to be added
 * - emit NoiaRegistryEntryAdded when adding entry
 * - can query entry existence
 * - count total entries
 * - does not track base contract deletion
 */
contract NoiaRegistry {
    NoiaRegulation regulation;
    mapping(address => uint) entries;
    uint nEntries;

    constructor(NoiaRegulation regulation_) public {
        regulation = regulation_;
    }

    function addEntry(NoiaBaseContract baseContract) public {
        // validate that sender is from the same factory
        require(msg.sender == address(baseContract.factory()));
        require(regulation.isContractValid(baseContract));
        entries[address(baseContract)] = 1;
        ++nEntries;
        emit NoiaRegistryEntryAdded(address(baseContract));
    }

    function hasEntry(address baseContract) public view returns (bool) {
        return entries[address(baseContract)] > 0;
    }

    function count() public view returns (uint) {
        return nEntries;
    }

    event NoiaRegistryEntryAdded(
        address baseContract);
}
