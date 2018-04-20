pragma solidity ^0.4.11;

import '../gov/NoiaMarketplace.sol';
import './NoiaBusinessV1.sol';
import './NoiaNodeV1.sol';

contract NoiaContractsFactoryV1 {
    NoiaMarketplace marketplace;

    function NoiaContractsFactoryV1(NoiaMarketplace marketplace_) public {
        marketplace = marketplace_;
    }

    function createBusiness() public {
        NoiaBusinessV1 business = new NoiaBusinessV1(marketplace, this);
        business.changeOwner(msg.sender);
        marketplace.businessRegistry().addEntry(business);
        emit NoiaBusinessCreatedV1(address(business));
    }

    event NoiaBusinessCreatedV1(address businessAddress);

    function createNode(bytes32 infoType, bytes infoData) public {
        NoiaNodeV1 node = new NoiaNodeV1(marketplace, this, infoType, infoData);
        node.changeOwner(msg.sender);
        marketplace.nodeRegistry().addEntry(node);
        emit NoiaNodeCreatedV1(address(node));
    }

    event NoiaNodeCreatedV1(address nodeAddress);

    function createCertificate(bytes32 certificateName, NoiaBusinessV1 issuer, NoiaNodeV1 recipient) public {
        require(marketplace.businessRegistry().hasEntry(issuer));
        require(marketplace.nodeRegistry().hasEntry(recipient));
        NoiaCertificateV1 cert = new NoiaCertificateV1(this, certificateName, issuer, recipient);
        cert.changeOwner(msg.sender);
        marketplace.certificatesRegistry().addEntry(cert);
        emit NoiaCertificateCreatedV1(address(cert));
    }

    event NoiaCertificateCreatedV1(address certAddress);
}
