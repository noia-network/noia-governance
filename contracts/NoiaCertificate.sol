pragma solidity ^0.4.11;

import './NoiaNode.sol';
import './NoiaBusiness.sol';

contract NoiaCertificate {
    uint16 constant CURRENT_VERSION = 1;

    uint16 public version;

    NoiaBusiness public issuer;
    NoiaNode public recipient;

    function NoiaCertificate(NoiaBusiness issuer_, NoiaNode recipient_) public {
        version = CURRENT_VERSION;
        issuer = issuer_;
        recipient = recipient_;
    }
}
