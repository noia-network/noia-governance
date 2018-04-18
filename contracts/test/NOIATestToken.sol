pragma solidity ^0.4.11;

import "../abstracts/ERC223Interface.sol";
import "../abstracts/ERC223ReceivingContract.sol";
import "../lib/SafeMath.sol";

contract NOIATestToken is ERC223Interface {
    using SafeMath for uint;

    mapping(address => uint) balances; // List of user balances.

    function name() constant public returns (string) { return "NOIA Test Token"; }
    function symbol() constant public returns (string) { return "NOIA_TEST"; }
    function decimals() constant public returns (uint) { return 0; }

    /**
    * @dev Transfer the specified amount of tokens to the specified address.
    *      Invokes the `tokenFallback` function if the recipient is a contract.
    *      The token transfer fails if the recipient is a contract
    *      but does not implement the `tokenFallback` function
    *      or the fallback function to receive funds.
    *
    * @param _to    Receiver address.
    * @param _value Amount of tokens that will be transferred.
    * @param _data  Transaction metadata.
    */
    function transfer(address _to, uint _value, bytes _data) public {
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        if (isContract(_to)) {
            ERC223ReceivingContract receiver = ERC223ReceivingContract(_to);
            receiver.tokenFallback(msg.sender, _value, _data);
        }
        emit Transfer(msg.sender, _to, _value);
        emit Transfer(msg.sender, _to, _value, _data);
    }

    /**
    * @dev Transfer the specified amount of tokens to the specified address.
    *      This function works the same with the previous one
    *      but doesn't contain `_data` param.
    *      Added due to backwards compatibility reasons.
    *
    * @param _to    Receiver address.
    * @param _value Amount of tokens that will be transferred.
    */
    function transfer(address _to, uint _value) public {
        bytes memory empty;
        transfer(_to, _value, empty);
    }

    /**
    * @dev Returns balance of the `_owner`.
    *
    * @param _owner   The address whose balance will be returned.
    * @return balance Balance of the `_owner`.
    */
    function balanceOf(address _owner) constant public returns (uint balance) {
        return balances[_owner];
    }

    // create test tokens
    function createTokens(address beneficiary, uint amount) public {
        bytes memory empty;
        balances[beneficiary] += amount;               // Give the creator all initial tokens
        totalSupply += amount;                        // Update total supply
        emit Transfer(0, beneficiary, amount);
        emit Transfer(0, beneficiary, amount, empty);
    }

    function isContract(address _to) private view returns (bool) {
        uint codeLength;
        assembly {
            // Retrieve the size of the code on target address, this needs assembly .
            codeLength := extcodesize(_to)
        }
        return codeLength > 0;
    }
}
