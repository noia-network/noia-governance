pragma solidity ^0.4.11;

import './NoiaNode.sol';
import './NoiaBusiness.sol';
import './NoiaCertificate.sol';

contract NoiaMarketplace {
    uint16 constant CURRENT_REGISTRY_VERSION = 1;

    struct RegistryEntry {
        uint16 registryVersion;
        uint16 contractVersion;
    }

    //
    // Node Registry
    //
    mapping(address => RegistryEntry) nodes;

    function registerNode(NoiaNode node) public {
        address nodeAddress = address(node);
        nodes[nodeAddress]  = RegistryEntry({
            registryVersion: CURRENT_REGISTRY_VERSION,
            contractVersion: node.version()
        });
        emit NodeRegistered(address(this), nodeAddress);
    }

    function getNodeRegistryVersion(address nodeAddress) public view returns (uint16) {
        return nodes[nodeAddress].registryVersion;
    }

    function getNodeContractVersion(address nodeAddress) public view returns (uint16) {
        return nodes[nodeAddress].contractVersion;
    }

    event NodeRegistered(address indexed marketplace, address nodeAddress);

    //
    // Business Registry
    //
    mapping(address => RegistryEntry) businesses;

    function registerBusiness(NoiaBusiness business) public {
        address businessAddress = address(business);
        businesses[businessAddress]  = RegistryEntry({
            registryVersion: CURRENT_REGISTRY_VERSION,
            contractVersion: business.version()
        });
        emit BusinessRegistered(address(this), businessAddress);
    }

    function getBusinessRegistryVersion(address businessAddress) public view returns (uint16) {
        return businesses[businessAddress].registryVersion;
    }

    function getBusinessContractVersion(address businessAddress) public view returns (uint16) {
        return businesses[businessAddress].contractVersion;
    }

    event BusinessRegistered(address indexed marketplace, address businessAddress);

    //
    // Certificate Registry
    //
    mapping(address => RegistryEntry) certificates;
    mapping(address => address[]) nodeCertificates;

    function registerCertificate(NoiaCertificate certificate) public {
        address certificateAddress = address(certificate);
        certificates[certificateAddress]  = RegistryEntry({
            registryVersion: CURRENT_REGISTRY_VERSION,
            contractVersion: certificate.version()
        });
        nodeCertificates[certificate.recipient()].push(certificateAddress);
        emit CertificateRegistered(
            address(this),
            certificate.issuer(),
            certificate.recipient(),
            certificateAddress);
    }

    function getCertificateRegistryVersion(address certificateAddress) public view returns (uint16) {
        return certificates[certificateAddress].registryVersion;
    }

    function getCertificateContractVersion(address certificateAddress) public view returns (uint16) {
        return certificates[certificateAddress].contractVersion;
    }

    event CertificateRegistered(address indexed marketplace, address indexed issuer, address indexed recipient, address certificate);
}
