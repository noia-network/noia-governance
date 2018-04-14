pragma solidity ^0.4.11;

contract NoiaReward {
    uint16 constant CURRENT_VERSION = 1;

    function tokenFallback(address _from, uint _value, bytes _data) public;
}
