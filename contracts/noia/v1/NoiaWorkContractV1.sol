pragma solidity ^0.4.11;

import "../../abstracts/ERC223Interface.sol";
import "./NoiaJobPostV1.sol";

contract NoiaWorkContractV1 {
    enum Initiator { Employer, Worker  }

    NoiaJobPostV1 public jobPost;
    Initiator initiator;
    address public workerAddress;

    // contract conditionss
    uint upfrontFee;
    uint totalTokenWorth;
    uint forcedReleaseInNumBlocks;

    // contract status
    bool public signedByEmployer = false;
    bool public signedByWorker = false;
    uint public tokenReceived = 0;

    constructor(
        NoiaJobPostV1 jobPost_,
        Initiator initiator_,
        address workerAddress_) public {
        // can be created by a job post only
        require(msg.sender == address(jobPost_), "Only a job post can create a new work order");
        jobPost = jobPost_;
        initiator = initiator_;
        workerAddress = workerAddress_;
    }

    function signByEmployer() public {
        require(address(jobPost.employer()) == msg.sender, "Only an employer can call 'signByEmployer'");
        signedByEmployer = true;
    }

    function signByWorker() public {
        require(workerAddress == msg.sender, "Only a worker can call 'signByWorker'");
        signedByWorker = true;
    }

    function isSigned() public view returns (bool) {
        return signedByEmployer && signedByWorker;
    }

    function isFunded() public view returns (bool) {
        return tokenReceived >= totalTokenWorth;
    }

    function tokenFallback(address /*from*/, uint value, bytes /*_data*/) public {
        // token `from` anyone is welcome :)
        require(msg.sender == address(jobPost.marketplace().tokenContract()), "Only our token contract can fund our work order");
        tokenReceived += value;
    }
}
