pragma solidity ^0.4.24;

import { NoiaJobPostV1} from "./NoiaJobPostV1.sol";
import { ERC777Token } from "noia-token/contracts/erc777/contracts/ERC777Token.sol";
import { ERC777TokensRecipient } from "noia-token/contracts/erc777/contracts/ERC777TokensRecipient.sol";
import { ERC820Implementer } from "noia-token/contracts/eip820/contracts/ERC820Implementer.sol";
import { ECRecovery } from "../../lib/ECRecovery.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { Owned } from "../../abstracts/Owned.sol";

contract NoiaWorkOrderV1 is ERC820Implementer, ERC777TokensRecipient {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    enum Initiator { Employer, Worker  }

    address public jobPost;
    Initiator initiator;
    ERC777Token token;
    Owned public employer;
    address public workerOwner;
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

    constructor(NoiaJobPostV1 _jobPost, Initiator _initiator, address _workerOwner) public {
        require(msg.sender == address(_jobPost), "Only a job post can create a work order");
        require(_workerOwner != address(0), "Worker address is 0");

        setInterfaceImplementation("ERC777TokensRecipient", this);
        address tokenAddress = interfaceAddr(address(_jobPost.marketplace().tokenContract()), "ERC777Token");
        require(tokenAddress != address(0), "Marketplace Token is not an ERC777Token");
        token = ERC777Token(tokenAddress);

        initiator = _initiator;
        employer = _jobPost.employer();
        workerOwner = _workerOwner;
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
        bool isWorker = signer == workerOwner;
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
            emit Accepted(employer, workerOwner);
        }
    }

    function isAccepted() public view returns (bool) {
        return acceptedByWorker && acceptedByEmployer;
    }

    function totalFunds() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function timelock(uint256 _amount, uint256 _lockUntil) public {
        require(msg.sender == employer.owner(), "Only an employer can timelock the funds");
//        require(_lockUntil > now);
        require(token.balanceOf(address(this)) >= totalVested.add(_amount), "Total vested cannot be lower than total funds in work order");
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
        require(isAccepted(), "Cannot release funds before work order is accepted");
        require(beneficiary != address(0), "Beneficiary address is 0");

        require(signatures[_sig] == false, "Multiple use of the same delegated message is not allowed");
        signatures[_sig] = true;

        bytes memory msgPacked = abi.encodePacked(address(this), "release", beneficiary, _nonce);
        address signer = keccak256(msgPacked).toEthSignedMessageHash().recover(_sig);
        require(signer != address(0), "Delegated release message signer is not recognized");
        require(signer == workerOwner, "Delegated release message signer must be a worker of the work order");

        // release the ones that can be released
        address to = beneficiary;
        uint256 tokens = 0;
        uint256 until;
        uint256 n = timelocks.length;
        uint256 timestamp = block.timestamp;
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
            token.send(to, tokens, "");
            emit Released(to, tokens);
        }
    }

    function tokensReceived(address /*operator*/, address /*from*/, address /*to*/, uint /*amount*/, bytes /*userData*/, bytes /*operatorData*/)
        public {
        require(msg.sender == address(token), "We only accept token transfers from our token contract");
    }

    event Accepted(address employer, address worker);
    event Released(address to, uint256 amount);
}
