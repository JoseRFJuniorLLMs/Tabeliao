// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @notice Factory contract that deploys new Escrow instances for the Tabeliao platform.
 * @dev Maintains a mapping of contract IDs to deployed escrow addresses.
 *      Only the owner (platform) can create new escrows.
 */
contract EscrowFactory {
    address public owner;
    address public arbiter;

    mapping(bytes32 => address) public escrows;
    bytes32[] public escrowIds;

    event EscrowCreated(
        bytes32 indexed contractId,
        address escrowAddress,
        address depositor,
        address beneficiary
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
        require(msg.sender == owner, "EscrowFactory: caller is not the owner");
        _;
    }

    /**
     * @notice Creates the factory with the deployer as owner and arbiter.
     */
    constructor() {
        owner = msg.sender;
        arbiter = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Creates a new Escrow contract for a given contract ID.
     * @param contractId The unique identifier for this contract (keccak256 hash).
     * @param depositor The address of the party depositing funds.
     * @param beneficiary The address of the party receiving funds.
     * @return escrowAddress The address of the newly deployed Escrow contract.
     */
    function createEscrow(
        bytes32 contractId,
        address depositor,
        address beneficiary
    ) external onlyOwner returns (address escrowAddress) {
        require(
            escrows[contractId] == address(0),
            "EscrowFactory: escrow already exists for this contract"
        );
        require(depositor != address(0), "EscrowFactory: depositor is the zero address");
        require(beneficiary != address(0), "EscrowFactory: beneficiary is the zero address");

        Escrow newEscrow = new Escrow(contractId, depositor, beneficiary, arbiter);
        escrowAddress = address(newEscrow);

        escrows[contractId] = escrowAddress;
        escrowIds.push(contractId);

        emit EscrowCreated(contractId, escrowAddress, depositor, beneficiary);

        return escrowAddress;
    }

    /**
     * @notice Returns the escrow address for a given contract ID.
     * @param contractId The contract ID to look up.
     * @return The address of the deployed Escrow contract, or address(0) if none exists.
     */
    function getEscrow(bytes32 contractId) external view returns (address) {
        return escrows[contractId];
    }

    /**
     * @notice Returns the total number of escrows created.
     */
    function getEscrowCount() external view returns (uint256) {
        return escrowIds.length;
    }

    /**
     * @notice Updates the arbiter address used for new escrow deployments.
     * @param newArbiter The address of the new arbiter.
     */
    function setArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "EscrowFactory: new arbiter is the zero address");
        emit ArbiterUpdated(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    /**
     * @notice Transfers factory ownership.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "EscrowFactory: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
