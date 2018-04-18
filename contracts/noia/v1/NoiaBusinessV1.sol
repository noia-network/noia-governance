pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaContractsFactoryV1.sol';
import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Business Contract V1 (Draft)
 */
contract NoiaBusinessV1 is NoiaBaseContractV1 {
    NoiaMarketplace marketplace;

    function NoiaBusinessV1(NoiaMarketplace marketplace_, address factory)
        NoiaBaseContractV1(factory) public {
        marketplace = marketplace_;
    }

    function signCertificate(address certificateAddress) onlyOwner public {
        require(marketplace.certificatesRegistry().hasEntry(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        NoiaCertificateV1(certificateAddress).sign();
    }
}
