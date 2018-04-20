pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Node Contract V1 (Draft)
 *
 */
contract NoiaNodeV1 is NoiaBaseContractV1 {
    NoiaMarketplace marketplace;

    address[] certificates;
    uint public certificatesCount;

    bytes32 public infoType;
    bytes public infoData;

    function NoiaNodeV1(
        NoiaMarketplace marketplace_,
        address factory,
        bytes32 infoType_, bytes infoData_)
        NoiaBaseContractV1(factory) public {
        marketplace = marketplace_;
        infoType = infoType_;
        infoData = infoData_;
    }

    //
    // Node Info
    //
    function setInfo(bytes32 infoType_, bytes infoData_) public {
        infoType = infoType_;
        infoData = infoData_;
    }

    //
    // Certificate Callback Functions
    //
    modifier fromCertificateV1(address certificateAddress) {
        require (msg.sender == certificateAddress);
        require(isContract(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        _;
    }

    function acceptIssuedCertificate(address certificateAddress)
        fromCertificateV1(certificateAddress) public {
        certificates.push(certificateAddress);
        ++certificatesCount;
    }

    function acceptCertificateUpdate(address certificateAddress)
        fromCertificateV1(certificateAddress) public view {
        // ignoring the data update callback
    }

    function receiveCertificateRevokeNotice(address certificateAddress)
        fromCertificateV1(certificateAddress) public {
        --certificatesCount;
    }

    //
    // Certificate Listing Functions
    //
    function getCertificates() public view returns (address[]) {
        address[] memory certs = new address[](certificatesCount);
        uint n = 0;
        for (uint i = 0; i < certificates.length; ++i) {
            address cert = certificates[i];
            if (isContract(cert)) certs[n++] = cert;
        }
        if (n < certificatesCount) {
            // shouldn't happen, but some business forgot to call sendCertificateRevokeNotice
        }
        return certs;
    }

    // TODO defrag

    //
    // misc
    // TODO, link misc library
    //
    function isContract(address addr) private view returns (bool) {
      uint size;
      assembly { size := extcodesize(addr) }
      return size > 0;
    }
}
