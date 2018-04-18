pragma solidity ^0.4.11;

import './NoiaBaseContractV1.sol';
import './NoiaCertificateV1.sol';

/**
 * Standard Noia Business Contract V1 (Draft)
 */
contract NoiaBusinessV1
    is NoiaBaseContractV1 {
    //
    // Certificate Functions
    //
    modifier ofCertificateV1(address certificateAddress) {
        require(isContract(certificateAddress));
        require(NoiaBaseContract(certificateAddress).version() == 1);
        _;
    }

    function signCertificate(NoiaCertificateV1 certificate)
        ofCertificateV1(address(certificate)) onlyOwner public {
        certificate.sign();
        emit CertificateSignedV1(certificate.issuer(), certificate.recipient(), address(certificate));
    }

    function updateCertificate(
        NoiaCertificateV1 certificate,
        bytes32 payloadType, bytes payloadData)
        ofCertificateV1(address(certificate)) onlyOwner public {
        certificate.update(payloadType, payloadData);
        emit CertificateUpdatedV1(certificate.issuer(), certificate.recipient(), address(certificate));
    }

    function sendCertificateRevokeNotice(NoiaCertificateV1 certificate)
        ofCertificateV1(address(certificate)) onlyOwner public {
        certificate.revokeNotice();
    }

    function revokeCertificate(NoiaCertificateV1 certificate)
        ofCertificateV1(address(certificate)) onlyOwner public {
        certificate.revoke();
        emit CertificateRevokedV1(certificate.issuer(), certificate.recipient(), address(certificate));
    }

    event CertificateSignedV1(
        address indexed issuer,
        address indexed recipient,
        address certificate);

    event CertificateUpdatedV1(
        address indexed issuer,
        address indexed recipient,
        address certificate);

    event CertificateRevokedV1(
        address indexed issuer,
        address indexed recipient,
        address certificate);

    //
    // misc
    //
    function isContract(address addr) private view returns (bool) {
      uint size;
      assembly { size := extcodesize(addr) }
      return size > 0;
    }
}
