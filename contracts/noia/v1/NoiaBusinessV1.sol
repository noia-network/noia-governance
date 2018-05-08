pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Business Contract V1 (Draft)
 */
contract NoiaBusinessV1 is NoiaBaseContractV1 {
    function NoiaBusinessV1(address factory, NoiaMarketplace marketplace)
        NoiaBaseContractV1(factory, marketplace) public {
    }

    function signCertificate(address certificateAddress) onlyOwner public {
        require(marketplace.certificatesRegistry().hasEntry(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        NoiaCertificateV1(certificateAddress).sign();
    }
}
