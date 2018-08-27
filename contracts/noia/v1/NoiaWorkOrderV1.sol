pragma solidity ^0.4.24;

import { NoiaJobPostV1} from "./NoiaJobPostV1.sol";
import { ERC223ReceivingContract } from "../../abstracts/ERC223ReceivingContract.sol";
import { ERC223Interface } from "../../abstracts/ERC223Interface.sol";
import { ECRecovery } from "../../lib/ECRecovery.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { Owned } from "../../abstracts/Owned.sol";

contract NoiaWorkOrderV1 is ERC223ReceivingContract {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    enum Initiator { Employer, Worker  }

    address public jobPost;
    Initiator initiator;
    ERC223Interface token;
    Owned public employer;
    Owned public worker;
    mapping(bytes => bool) private signatures;

    struct Timelock {
        uint256 until;
        uint256 amount;
    }
    Timelock[] timelocks;
    uint256 public totalVested;

    // contract status
    bool public acceptedByEmployer = false;
    bool public acceptedByWorker = false;

    constructor(NoiaJobPostV1 _jobPost, Initiator _initiator, address _worker) public {
        require(msg.sender == address(_jobPost)); // can be created by a job post only
        require(_worker != address(0));
        token = ERC223Interface(address(_jobPost.marketplace().tokenContract()));
        initiator = _initiator;
        employer = _jobPost.employer();
        worker = Owned(_worker);
        jobPost = address(_jobPost);
    }

    function accept() public {
        doAccept(msg.sender);
    }

    function delegatedAccept(uint256 _nonce, bytes _sig) public {
        require(signatures[_sig] == false, "Signature already exists!");
        signatures[_sig] = true;

        bytes memory msgPacked = abi.encodePacked(address(this), "accept", _nonce);
        address signer = keccak256(msgPacked).toEthSignedMessageHash().recover(_sig);
        require(signer != address(0), "Signer not recognized!");

        doAccept(signer);
    }

    function doAccept(address signer) private {
        bool isWorker = signer == worker.owner();
        bool isEmployer = signer == employer.owner();
        require(isWorker || isEmployer, "Signer must be a worker or employee!");

        // mark the status
        bool oldStatus = isAccepted();
        if (isWorker) {
            acceptedByWorker = true;
        }
        if (isEmployer) {
            acceptedByEmployer = true;
        }
        if (oldStatus == false && isAccepted()) {
            emit Accepted(employer, worker);
        }
    }

    function isAccepted() public view returns (bool) {
        return acceptedByWorker && acceptedByEmployer;
    }

    function totalFunds() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function timelock(uint256 _amount, uint256 _lockUntil) public {
        require(msg.sender == employer.owner()); // allow only employer to timelock the funds
        require(_lockUntil > now);
        require(token.balanceOf(address(this)) >= totalVested.add(_amount));
        totalVested = totalVested.add(_amount);

        timelocks.push(Timelock({until: _lockUntil, amount: _amount}));
    }

    function getTimelocks() public view returns(uint256[], uint256[]) {
        uint256[] memory amounts = new uint256[](timelocks.length);
        uint256[] memory untils = new uint256[](timelocks.length);

        for (uint256 i = 0; i < timelocks.length; i++) {
            Timelock storage tl = timelocks[i];
            amounts[i] = tl.amount;
            untils[i] = tl.until;
        }

        return (amounts, untils);
    }

    // have a signature (from a worker wallet) and saying there to release funds to this beneficiary address
    function delegatedRelease(address beneficiary, uint256 _nonce, bytes _sig) public {
        require(isAccepted());
        require(beneficiary != address(0));

        require(signatures[_sig] == false);
        signatures[_sig] = true;

        bytes memory msgPacked = abi.encodePacked(address(this), "release", beneficiary, _nonce);
        address signer = keccak256(msgPacked).toEthSignedMessageHash().recover(_sig);
        require(signer != address(0));
        require(signer == worker.owner()); // we only allow the signer to be a worker owner

        // release the ones that can be released
        address to = beneficiary;
        uint256 tokens = 0;
        uint256 until;
        uint256 n = timelocks.length;
        uint256 timestamp = now;
        for (uint256 i = 0; i < n; i++) {
            Timelock storage tl = timelocks[i];
            until = tl.until;
            if (until > 0 && until < timestamp) {
                tokens = tokens.add(tl.amount);
                tl.amount = 0;
                tl.until = 0;
            }
        }
        if (tokens > 0) {
            totalVested = totalVested.sub(tokens);
            token.transfer(to, tokens);
            emit Released(to, tokens);
        }
    }

    function tokenFallback(address /*_from*/, uint /*_value*/, bytes /*_data*/) public {
        require(msg.sender == address(token));
    }

    event Accepted(address employer, address worker);
    event Released(address to, uint256 amount);
}
