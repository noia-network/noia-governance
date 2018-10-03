pragma solidity ^0.4.11;

library Misc {
    function isContract(address addr) private view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}
