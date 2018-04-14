pragma solidity ^0.4.11;

contract NoiaNode {
    uint16 constant CURRENT_VERSION = 1;

    uint16 public version;

    function NoiaNode() public {
        version = CURRENT_VERSION;
    }
}
