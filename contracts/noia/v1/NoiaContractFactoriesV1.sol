pragma solidity ^0.4.20;

import "./NoiaBusinessV1.sol";
import "./NoiaNodeV1.sol";
import "./NoiaCertificateV1.sol";
import "./NoiaJobPostV1.sol";

contract NoiaBaseContractFactoryV1 {
    NoiaMarketplace marketplace;
    function setMarketplace(NoiaMarketplace marketplace_) public {
        marketplace = marketplace_;
    }
    event NoiaContractV1Created(address contractInstance);
}

contract NoiaBusinessContractFactoryV1 is NoiaBaseContractFactoryV1 {
    function create(bytes32 infoType, bytes infoData) public {
        NoiaBusinessV1 business = new NoiaBusinessV1(this, marketplace, infoType, infoData);
        business.changeOwner(msg.sender);
        marketplace.businessRegistry().addEntry(business);
        emit NoiaContractV1Created(address(business));
    }
}

contract NoiaNodeContractFactoryV1 is NoiaBaseContractFactoryV1 {
    function create(bytes32 infoType, bytes infoData) public {
        NoiaNodeV1 node = new NoiaNodeV1(this, marketplace, infoType, infoData);
        node.changeOwner(msg.sender);
        marketplace.nodeRegistry().addEntry(node);
        emit NoiaContractV1Created(address(node));
    }
}

contract NoiaCertificateContractFactoryV1 is NoiaBaseContractFactoryV1 {
    function create(bytes32 certificateName, NoiaBusinessV1 issuer, NoiaNodeV1 recipient) public {
        require(marketplace.businessRegistry().hasEntry(issuer), "Marketplace does not have provided issuer in business registry");
        require(marketplace.nodeRegistry().hasEntry(recipient), "Marketplace does not have provided recipient in node's registry");
        NoiaCertificateV1 cert = new NoiaCertificateV1(this, marketplace, certificateName, issuer, recipient);
        cert.changeOwner(msg.sender);
        marketplace.certificatesRegistry().addEntry(cert);
        emit NoiaContractV1Created(address(cert));
    }
}

contract NoiaJobPostContractFactoryV1 is NoiaBaseContractFactoryV1 {
    function create(NoiaBusinessV1 employer, bytes32 infoType, bytes infoData) public {
        require(marketplace.businessRegistry().hasEntry(employer), "Marketplace does not have employer in business registry");
        NoiaJobPostV1 jobPost = new NoiaJobPostV1(this, marketplace, employer, infoType, infoData);
        jobPost.changeOwner(msg.sender);
        marketplace.jobPostRegistry().addEntry(jobPost);
        emit NoiaContractV1Created(address(jobPost));
    }
}

contract NoiaContractFactoriesV1 {
    constructor(
        NoiaMarketplace marketplace,
        NoiaBusinessContractFactoryV1 business_,
        NoiaNodeContractFactoryV1 node_,
        NoiaCertificateContractFactoryV1 certificate_,
        NoiaJobPostContractFactoryV1 jobPost_) public {
        business = business_;
        node = node_;
        certificate = certificate_;
        jobPost = jobPost_;
        business.setMarketplace(marketplace);
        node.setMarketplace(marketplace);
        certificate.setMarketplace(marketplace);
        jobPost.setMarketplace(marketplace);
    }

    NoiaBusinessContractFactoryV1 public business;
    NoiaNodeContractFactoryV1 public node;
    NoiaCertificateContractFactoryV1 public certificate;
    NoiaJobPostContractFactoryV1 public jobPost;
}
