// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

/**
 * @title ArbitrationManager
 * @notice Manages dispute filing and resolution for escrow contracts on the Tabeliao platform.
 * @dev When a dispute is resolved, triggers either a release to the beneficiary or a refund
 *      to the depositor on the associated escrow contract.
 */
contract ArbitrationManager {
    struct Dispute {
        bytes32 contractId;
        address escrowAddress;
        address plaintiff;
        address defendant;
        string resolution;
        bool resolved;
        uint256 filedAt;
        uint256 resolvedAt;
    }

    address public owner;
    address public authorizedArbiter;

    mapping(bytes32 => Dispute) public disputes;
    bytes32[] public disputeIds;

    event DisputeFiled(
        bytes32 indexed disputeId,
        bytes32 indexed contractId,
        address escrowAddress,
        address plaintiff,
        address defendant,
        uint256 filedAt
    );

    event DisputeResolved(
        bytes32 indexed disputeId,
        bytes32 indexed contractId,
        string resolution,
        bool releaseToBeneficiary,
        uint256 resolvedAt
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event ArbiterUpdated(
        address indexed previousArbiter,
        address indexed newArbiter
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ArbitrationManager: caller is not the owner");
        _;
    }

    modifier onlyArbiter() {
        require(
            msg.sender == authorizedArbiter || msg.sender == owner,
            "ArbitrationManager: caller is not authorized to arbitrate"
        );
        _;
    }

    /**
     * @notice Creates the ArbitrationManager with the deployer as owner and arbiter.
     */
    constructor() {
        owner = msg.sender;
        authorizedArbiter = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Files a new dispute for an escrow contract.
     * @param disputeId Unique identifier for this dispute.
     * @param contractId The contract ID the dispute is related to.
     * @param escrow The address of the Escrow contract.
     * @param plaintiff The address of the party filing the dispute.
     * @param defendant The address of the party being disputed against.
     */
    function fileDispute(
        bytes32 disputeId,
        bytes32 contractId,
        address escrow,
        address plaintiff,
        address defendant
    ) external {
        require(
            !disputes[disputeId].resolved && disputes[disputeId].filedAt == 0,
            "ArbitrationManager: dispute already exists"
        );
        require(escrow != address(0), "ArbitrationManager: escrow is the zero address");
        require(plaintiff != address(0), "ArbitrationManager: plaintiff is the zero address");
        require(defendant != address(0), "ArbitrationManager: defendant is the zero address");
        require(
            msg.sender == plaintiff || msg.sender == owner || msg.sender == authorizedArbiter,
            "ArbitrationManager: caller must be plaintiff, owner, or arbiter"
        );

        disputes[disputeId] = Dispute({
            contractId: contractId,
            escrowAddress: escrow,
            plaintiff: plaintiff,
            defendant: defendant,
            resolution: "",
            resolved: false,
            filedAt: block.timestamp,
            resolvedAt: 0
        });

        disputeIds.push(disputeId);

        // Freeze the escrow
        Escrow escrowContract = Escrow(payable(escrow));
        try escrowContract.freeze() {
            // Escrow frozen successfully
        } catch {
            // Escrow might already be frozen or in invalid state - continue filing dispute
        }

        emit DisputeFiled(
            disputeId,
            contractId,
            escrow,
            plaintiff,
            defendant,
            block.timestamp
        );
    }

    /**
     * @notice Resolves a dispute and triggers either release or refund on the escrow.
     * @param disputeId The dispute ID to resolve.
     * @param resolution A textual description of the resolution decision.
     * @param releaseToBeneficiary If true, releases funds to beneficiary; if false, refunds to depositor.
     */
    function resolveDispute(
        bytes32 disputeId,
        string calldata resolution,
        bool releaseToBeneficiary
    ) external onlyArbiter {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.filedAt > 0, "ArbitrationManager: dispute does not exist");
        require(!dispute.resolved, "ArbitrationManager: dispute already resolved");

        dispute.resolution = resolution;
        dispute.resolved = true;
        dispute.resolvedAt = block.timestamp;

        Escrow escrowContract = Escrow(payable(dispute.escrowAddress));

        if (releaseToBeneficiary) {
            // Release to beneficiary via arbiter role on escrow
            escrowContract.release();
        } else {
            // Refund to depositor via arbiter role on escrow
            escrowContract.refund();
        }

        emit DisputeResolved(
            disputeId,
            dispute.contractId,
            resolution,
            releaseToBeneficiary,
            block.timestamp
        );
    }

    /**
     * @notice Returns the full dispute details.
     * @param disputeId The dispute ID to look up.
     */
    function getDispute(bytes32 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    /**
     * @notice Returns the total number of disputes filed.
     */
    function getDisputeCount() external view returns (uint256) {
        return disputeIds.length;
    }

    /**
     * @notice Updates the authorized arbiter address.
     * @param newArbiter The new arbiter address.
     */
    function setArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "ArbitrationManager: new arbiter is the zero address");
        emit ArbiterUpdated(authorizedArbiter, newArbiter);
        authorizedArbiter = newArbiter;
    }

    /**
     * @notice Transfers ownership of this contract.
     * @param newOwner The new owner address.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ArbitrationManager: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
