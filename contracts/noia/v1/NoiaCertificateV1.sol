pragma solidity ^0.4.11;

import "./NoiaBaseContractV1.sol";
import "./NoiaNodeV1.sol";
import "./NoiaBusinessV1.sol";

contract NoiaCertificateV1 is NoiaBaseContractV1 {

    NoiaBusinessV1 public issuer;
    NoiaNodeV1 public recipient;
    bool public signed;
    bool public issued;

    bytes32 public certificateName;
    bytes32 public payloadType;
    bytes public payloadData;

    constructor(
                address factory,
                NoiaMarketplace marketplace,
                bytes32 certificateName_,
                NoiaBusinessV1 issuer_,
                NoiaNodeV1 recipient_)
        NoiaBaseContractV1(factory, marketplace) public {
        // the factory has guranteed that issuer and recipient are regulated contracts
        certificateName = certificateName_;
        issuer = issuer_;
        recipient = recipient_;
    }

    function isInEffect() public view returns (bool) {
        return signed && issued;
    }

    function sign() public {
        require(msg.sender == address(issuer), "Signer is not certificate issuer");
        signed = true;
        emit NoiaCertificateSignedV1(certificateName, issuer, recipient, this);
    }

    function issue() public onlyOwner {
        issued = true;
        recipient.acceptIssuedCertificate(this);
        emit NoiaCertificateIssuedV1(certificateName, issuer, recipient, this);
    }

    function update(bytes32 payloadType_, bytes payloadData_) public onlyOwner {
        payloadType = payloadType_;
        payloadData = payloadData_;

        if (issued) {
            recipient.acceptCertificateUpdate(this);
            emit NoiaCertificateUpdatedV1(certificateName, issuer, recipient, this);
        }
    }

    function revoke() public onlyOwner {
        if (issued) {
            recipient.receiveCertificateRevokeNotice(this);
            emit NoiaCertificateRevokedV1(certificateName, issuer, recipient, this);
        }
        // we give back ether to the owner
        selfdestruct(owner);

    }

    event NoiaCertificateSignedV1(bytes32 indexed certificateName, address indexed issuer, address indexed recipient, address certificate);

    event NoiaCertificateIssuedV1(bytes32 indexed certificateName, address indexed issuer, address indexed recipient, address certificate);

    event NoiaCertificateUpdatedV1(bytes32 indexed certificateName, address indexed issuer, address indexed recipient, address certificate);

    event NoiaCertificateRevokedV1(bytes32 indexed certificateName, address indexed issuer, address indexed recipient, address certificate);
}
