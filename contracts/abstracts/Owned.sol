pragma solidity ^0.4.0;

contract Owned {
    /// Allows only the owner to call a function
    modifier onlyOwner {
        require (msg.sender == owner, "Sender is not an owner");
        _;
    }

    address public owner;

    constructor() public { owner = msg.sender;}

    function changeOwner(address _newOwner) public onlyOwner {
        owner = _newOwner;
    }
}
