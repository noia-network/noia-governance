pragma solidity ^0.4.11;

import './NoiaBaseContractV1.sol';
import './NoiaNodeV1.sol';
import './NoiaBusinessV1.sol';

contract NoiaCertificateV1
    is NoiaBaseContractV1 {
    /// Allows only the issuer to call a function
    modifier onlyIssuer {
        require (msg.sender == address(issuer));
        _;
    }

    NoiaBusinessV1 public issuer;
    NoiaNodeV1 public recipient;

    bool public signedByBusiness;
    bytes32 public certificateName;
    bytes32 public payloadType;
    bytes public payloadData;

    function NoiaCertificateV1(
        NoiaBusinessV1 issuer_,
        NoiaNodeV1 recipient_,
        bytes32 certificateName_,
        bytes32 payloadType_,
        bytes payloadData_) public {
        issuer = issuer_;
        recipient = recipient_;

        certificateName = certificateName_;
        payloadType = payloadType_;
        payloadData = payloadData_;
    }

    function sign() onlyIssuer public {
        signedByBusiness = true;

        // recipient may reject the certificate by revert()!!
        recipient.acceptSignedCertificate(this);
    }

    function update(bytes32 payloadType_, bytes payloadData_) onlyIssuer public {
        payloadType = payloadType_;
        payloadData = payloadData_;

        if (signedByBusiness) {
            // if the certificate has already been signed by the business
            // we issue an update request to the recipient
            // recipient may reject the certificate by revert()!!
            recipient.acceptCertificateUpdate(this);
        }
    }

    // recipient external calls are used in this function
    function revokeNotice() onlyIssuer public {
        recipient.receiveCertificateRevokeNotice(this);
    }

    // no recipient external calls are used in this function
    function revoke() onlyIssuer public {
        // we give back ether to the creator
        selfdestruct(owner);
    }
}
