pragma solidity ^0.4.11;

import './NoiaBaseContractV1.sol';
import './NoiaContractsFactoryV1.sol';
import './NoiaBusinessV1.sol';
import './NoiaNodeV1.sol';
import './NoiaWorkContractV1.sol';

/**
 * Standard Noia Job Post Contract V1 (Draft)
 *
 */
contract NoiaJobPostV1
    is NoiaBaseContractV1 {
    NoiaBusinessV1 public employer;
    bytes32 public infoType;
    bytes public infoData;

    mapping(address => NoiaWorkContractV1) employerCreatedContracts;
    mapping(address => NoiaWorkContractV1) workerCreatedContracts;

    function NoiaJobPostV1(NoiaContractsFactoryV1 factory,
        NoiaBusinessV1 employer_,
        bytes32 infoType_, bytes infoData_)
        NoiaBaseContractV1(factory) public {
        employer = employer_;
        infoType = infoType_;
        infoData = infoData_;
    }

    function createContract(address workerAddress) public {
        NoiaWorkContractV1.Initiator initiator;
        NoiaWorkContractV1 workContract;
        if (msg.sender == address(employer)) {
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
        if (msg.sender == address(employer)) {
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
