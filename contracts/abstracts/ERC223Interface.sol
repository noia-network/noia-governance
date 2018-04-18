pragma solidity ^0.4.11;

contract ERC223Interface {
    uint public totalSupply;
    function name() constant public returns (string);
    function symbol() constant public returns (string);
    function decimals() constant public returns (uint);
    function balanceOf(address who) constant public returns (uint);
    function transfer(address to, uint value) public;
    function transfer(address to, uint value, bytes data) public;
    event Transfer(address indexed from, address indexed to, uint value, bytes data);
    // for ERC20 compatibility
    event Transfer(address indexed from, address indexed to, uint value);
}
