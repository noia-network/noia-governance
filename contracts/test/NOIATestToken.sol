pragma solidity ^0.4.11;

import { NOIAToken } from "noia-token/contracts/NOIAToken.sol";

contract NOIATestToken is NOIAToken {
    constructor() public NOIAToken() {}
}
