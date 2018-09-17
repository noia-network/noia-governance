pragma solidity ^0.4.11;

contract ERC223Interface {
    uint public totalSupply;
    function name() public view returns (string);
    function symbol() public view returns (string);
    function decimals() public view returns (uint);
    function balanceOf(address who) public view returns (uint);
    function transfer(address to, uint value) public;
    function transfer(address to, uint value, bytes data) public;
    event Transfer(address indexed from, address indexed to, uint value, bytes data);
    // for ERC20 compatibility
    event Transfer(address indexed from, address indexed to, uint value);
}
