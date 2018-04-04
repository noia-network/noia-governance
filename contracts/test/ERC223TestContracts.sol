pragma solidity ^0.4.11;

contract ERC223NoFallback {
}

contract ERC223WithFallback {
    uint public tokenReceived = 0;

    function tokenFallback(address /*_from*/, uint _value, bytes /*_data*/) public {
        tokenReceived += _value;
    }
}
