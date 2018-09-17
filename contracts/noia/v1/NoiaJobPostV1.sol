pragma solidity ^0.4.24;

import { NoiaBaseContractV1 } from "./NoiaBaseContractV1.sol";
import { NoiaBusinessV1 } from "./NoiaBusinessV1.sol";
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

    function createWorkOrder(address _workerOwner) public {
        NoiaWorkOrderV1.Initiator initiator;
        NoiaWorkOrderV1 workOrder;
        if (msg.sender == address(employer.owner())) {
            initiator = NoiaWorkOrderV1.Initiator.Employer;
            workOrder = new NoiaWorkOrderV1(this, initiator, _workerOwner);
            employerCreatedOrders[_workerOwner] = workOrder;
        } else {
            require(false, "Only a job post owner/employer can create a work order");
        }
        emit NoiaContractV1Created(workOrder);
    }

    /**
     * Get created work order from employer
     */
    function getWorkOrder(address _workerOwner) public view returns (address) {
        return employerCreatedOrders[_workerOwner];
    }

    event NoiaContractV1Created(address contractInstance);
}
