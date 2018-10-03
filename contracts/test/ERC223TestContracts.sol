pragma solidity ^0.4.11;

import "../abstracts/ERC223Interface.sol";

contract ERC223NoFallback {
}

contract ERC223WithFallback {
    ERC223Interface tokenContract;
    address public originator;
    uint public tokenReceived = 0;

    constructor(address tokenContract_) public {
        tokenContract = ERC223Interface(tokenContract_);
    }

    function tokenFallback(address from, uint value, bytes /*_data*/) public {
        require(msg.sender == address(tokenContract), "Sender is not our token contract");
        originator = from;
        tokenReceived += value;
    }

    function requestRefund() public {
        require(msg.sender == originator, "Requestor/Sender is not the one who originally transferred tokens");
        require(tokenReceived > 0, "Tokens received must be > 0");
        tokenContract.transfer(originator, tokenReceived);
        tokenReceived = 0;
    }
}
