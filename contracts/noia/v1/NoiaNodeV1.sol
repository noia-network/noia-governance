pragma solidity ^0.4.11;

import "./NoiaBaseContractV1.sol";
import "./NoiaCertificateV1.sol";

/**
 * Standard Noia Node Contract V1 (Draft)
 *
 */
contract NoiaNodeV1 is NoiaBaseContractV1 {
    address[] certificates;
    uint public certificatesCount;

    bytes32 public infoType;
    bytes public infoData;

    constructor(address factory, NoiaMarketplace marketplace, bytes32 infoType_, bytes infoData_)
        NoiaBaseContractV1(factory, marketplace) public {
        infoType = infoType_;
        infoData = infoData_;
    }

    //
    // Node Info
    //
    function setInfo(bytes32 infoType_, bytes infoData_) public onlyOwner {
        infoType = infoType_;
        infoData = infoData_;
    }

    //
    // Certificate Callback Functions
    //
    modifier fromCertificateV1(address certificateAddress) {
        require (msg.sender == certificateAddress, "Only a certificate can call 'fromCertificateV1'");
        require(isContract(certificateAddress), "Only a contract can call 'fromCertificateV1'");
        require(NoiaBaseContract(certificateAddress).version() == 1, "Contract must have version 1");
        _;
    }

    function acceptIssuedCertificate(address certificateAddress) public fromCertificateV1(certificateAddress) {
        certificates.push(certificateAddress);
        ++certificatesCount;
    }

    function acceptCertificateUpdate(address certificateAddress) public view fromCertificateV1(certificateAddress) {
        // ignoring the data update callback
    }

    function receiveCertificateRevokeNotice(address certificateAddress) public fromCertificateV1(certificateAddress) {
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
        // if (n < certificatesCount) { // shouldn't happen, but some business forgot to call sendCertificateRevokeNotice }
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
