pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaContractsFactoryV1.sol';
import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Business Contract V1 (Draft)
 */
contract NoiaBusinessV1 is NoiaBaseContractV1 {
    function NoiaBusinessV1(NoiaContractsFactoryV1 factory)
        NoiaBaseContractV1(factory) public {
    }

    function signCertificate(address certificateAddress) onlyOwner public {
        require(factory.marketplace().certificatesRegistry().hasEntry(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        NoiaCertificateV1(certificateAddress).sign();
    }
}
