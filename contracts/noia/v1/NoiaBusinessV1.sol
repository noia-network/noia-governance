pragma solidity ^0.4.11;

import "../gov/NoiaMarketplace.sol";
import "./NoiaBaseContractV1.sol";
import "./NoiaCertificateV1.sol";

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

    function setInfo(bytes32 infoType_, bytes infoData_) public onlyOwner {
        infoType = infoType_;
        infoData = infoData_;
    }

    function signCertificate(address certificateAddress) public onlyOwner {
        require(marketplace.certificatesRegistry().hasEntry(certificateAddress), "Provided certificate address is not in marketplace registry");
        require(NoiaBaseContract(certificateAddress).version() == 1, "Provided certificate must have version 1");
        NoiaCertificateV1(certificateAddress).sign();
    }
}
