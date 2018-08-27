pragma solidity ^0.4.24;

import { NoiaBaseContractV1 } from './NoiaBaseContractV1.sol';
import { NoiaBusinessV1 } from './NoiaBusinessV1.sol';
import { NoiaWorkOrderV1 } from "./NoiaWorkOrderV1.sol";
import { NoiaMarketplace } from "../gov/NoiaMarketplace.sol";
import { Owned } from "../../abstracts/Owned.sol";

/**
 * Standard Noia Job Post Contract V1 (Draft)
 *
 */
contract NoiaJobPostV1 is NoiaBaseContractV1 {
    NoiaBusinessV1 public employer;
    bytes32 public infoType;
    bytes public infoData;

    mapping(address => NoiaWorkOrderV1) employerCreatedOrders;
    mapping(address => NoiaWorkOrderV1) workerCreatedOrders;

    constructor(
        address factory,
        NoiaMarketplace marketplace,
        NoiaBusinessV1 employer_,
        bytes32 infoType_, bytes infoData_)
        NoiaBaseContractV1(factory, marketplace) public {
        employer = employer_;
        infoType = infoType_;
        infoData = infoData_;
    }

    function createWorkOrder(address _worker) public {
        NoiaWorkOrderV1.Initiator initiator;
        NoiaWorkOrderV1 workOrder;
        Owned worker = Owned(_worker);
        if (msg.sender == address(employer.owner())) {
            initiator = NoiaWorkOrderV1.Initiator.Employer;
            workOrder = new NoiaWorkOrderV1(this, initiator, worker);
            employerCreatedOrders[worker] = workOrder;
        } else if (msg.sender == worker.owner()) {
            initiator = NoiaWorkOrderV1.Initiator.Worker;
            workOrder = new NoiaWorkOrderV1(this, initiator, worker);
            workerCreatedOrders[worker] = workOrder;
        } else {
            require(false);
        }
        emit NoiaContractV1Created(workOrder);
    }

    function proposeWorkOrder(address _worker) public {
        Owned worker = Owned(_worker);
        address workOrderAddress;
        if (msg.sender == address(employer.owner())) {
            workOrderAddress = employerCreatedOrders[worker];
        } else if (msg.sender == worker.owner()) {
            workOrderAddress = workerCreatedOrders[worker];
        } else {
            require(false);
        }
        emit NoiaWorkOrderProposedV1(this, worker, workOrderAddress);
    }

    /**
     * Get proposed contracts from employer and worker
     *
     * [0] - contract proposal from employer
     * [1] - contract proposal from worker
     */
    function getProposedWorkOrders(address _worker) public view returns (address[2] proposals) {
        proposals[0] = employerCreatedOrders[_worker];
        proposals[1] = workerCreatedOrders[_worker];
    }

    event NoiaContractV1Created(address contractInstance);

    event NoiaWorkOrderProposedV1(
        address indexed jobPostAddress,
        address indexed workerAddress,
        address workOrderAddress);
}
