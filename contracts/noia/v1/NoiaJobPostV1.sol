pragma solidity ^0.4.11;

import './NoiaBaseContractV1.sol';
import './NoiaNodeV1.sol';
import './NoiaWorkContractV1.sol';

/**
 * Standard Noia Job Post Contract V1 (Draft)
 *
 */
contract NoiaJobPostV1
    is NoiaBaseContractV1 {
    ERC223Interface public tokenContract;
    address public employerAddress;

    mapping(address => NoiaWorkContractV1) employerCreatedContracts;
    mapping(address => NoiaWorkContractV1) workerCreatedContracts;

    function NoiaJobPostV1(ERC223Interface tokenContract_) public {
        tokenContract = tokenContract_;
    }

    function createContract(address workerAddress) public {
        NoiaWorkContractV1.Initiator initiator;
        NoiaWorkContractV1 workContract;
        if (msg.sender == employerAddress) {
            initiator = NoiaWorkContractV1.Initiator.Employer;
            workContract = new NoiaWorkContractV1(this, initiator, workerAddress);
            employerCreatedContracts[workerAddress] = workContract;
        } else if (msg.sender == workerAddress) {
            initiator = NoiaWorkContractV1.Initiator.Worker;
            workContract = new NoiaWorkContractV1(this, initiator, workerAddress);
            workerCreatedContracts[workerAddress] = workContract;
        } else {
            require(false);
        }
    }

    function proposeContract(address workerAddress) public {
        address workContractAddress;
        if (msg.sender == employerAddress) {
            workContractAddress = employerCreatedContracts[workerAddress];
        } else if (msg.sender == workerAddress) {
            workContractAddress = workerCreatedContracts[workerAddress];
        } else {
            require(false);
        }
        emit NoiaContractProposedV1(this, workerAddress, workContractAddress);
    }

    /**
     * Get proposed contracts from employer and worker
     *
     * [0] - contract proposal from employer
     * [1] - contract proposal from worker
     */
    function getProposedContracts(address workerAddress) public view returns (address[2] proposals) {
        proposals[0] = employerCreatedContracts[workerAddress];
        proposals[1] = employerCreatedContracts[workerAddress];
    }

    event NoiaContractProposedV1(
        address indexed jobPostAddress,
        address indexed workerAddress,
        address workContractAddress);
}
