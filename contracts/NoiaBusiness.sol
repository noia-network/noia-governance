pragma solidity ^0.4.11;

contract NoiaBusiness {
    uint16 constant CURRENT_VERSION = 1;

    uint16 public version;

    function NoiaBusiness() public {
        version = CURRENT_VERSION;
    }

    //function tokenFallback(address _from, uint _value, bytes _data) public;
}
