pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Business Contract V1 (Draft)
 */
contract NoiaBusinessV1 is NoiaBaseContractV1 {
    bytes32 public infoType;
    bytes public infoData;

    constructor(address factory,
        NoiaMarketplace marketplace,
        bytes32 infoType_, bytes infoData_)
        NoiaBaseContractV1(factory, marketplace) public {
        infoType = infoType_;
        infoData = infoData_;
    }

    function setInfo(bytes32 infoType_, bytes infoData_) public {
        infoType = infoType_;
        infoData = infoData_;
    }

    function signCertificate(address certificateAddress) onlyOwner public {
        require(marketplace.certificatesRegistry().hasEntry(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        NoiaCertificateV1(certificateAddress).sign();
    }
}
