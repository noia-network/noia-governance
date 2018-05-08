pragma solidity ^0.4.11;

import '../gov/NoiaBaseContractsFactory.sol';
import './NoiaBusinessV1.sol';
import './NoiaNodeV1.sol';
import './NoiaCertificateV1.sol';
import './NoiaJobPostV1.sol';

contract NoiaContractsFactoryV1 is NoiaBaseContractsFactory {
    function NoiaContractsFactoryV1(NoiaMarketplace marketplace)
        NoiaBaseContractsFactory(marketplace) public {
    }

    function createBusiness() public {
        NoiaBusinessV1 business = new NoiaBusinessV1(this);
        business.changeOwner(msg.sender);
        marketplace.businessRegistry().addEntry(business);
        emit NoiaBusinessCreatedV1(address(business));
    }
    event NoiaBusinessCreatedV1(address businessAddress);

    function createNode(bytes32 infoType, bytes infoData) public {
        NoiaNodeV1 node = new NoiaNodeV1(this, infoType, infoData);
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

    function createJobPost(NoiaBusinessV1 employer, bytes32 infoType, bytes infoData) public {
        require(marketplace.businessRegistry().hasEntry(employer));
        NoiaJobPostV1 jobPost = new NoiaJobPostV1(this, employer, infoType, infoData);
        jobPost.changeOwner(msg.sender);
        marketplace.jobPostRegistry().addEntry(jobPost);
        emit NoiaJobPostCreatedV1(address(jobPost));
    }
    event NoiaJobPostCreatedV1(address jobPostAddress);
}
