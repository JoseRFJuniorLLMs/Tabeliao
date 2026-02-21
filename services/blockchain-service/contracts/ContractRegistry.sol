// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContractRegistry
 * @notice Registers and verifies document hashes on-chain for the Tabeliao digital notary platform.
 * @dev Each contract ID maps to a Registration struct containing the document hash, timestamp,
 *      and the address that performed the registration. Only the owner can register documents.
 */
contract ContractRegistry {
    struct Registration {
        bytes32 documentHash;
        uint256 timestamp;
        address registeredBy;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => Registration) public registrations;

    event DocumentRegistered(
        bytes32 indexed contractId,
        bytes32 documentHash,
        uint256 timestamp,
        address registeredBy
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ContractRegistry: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Registers a document hash for a given contract ID.
     * @param contractId The unique identifier of the contract (keccak256 hash).
     * @param documentHash The SHA-256 hash of the document content.
     */
    function registerDocument(
        bytes32 contractId,
        bytes32 documentHash
    ) external onlyOwner {
        require(documentHash != bytes32(0), "ContractRegistry: document hash cannot be zero");
        require(
            !registrations[contractId].exists,
            "ContractRegistry: contract already registered"
        );

        registrations[contractId] = Registration({
            documentHash: documentHash,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        emit DocumentRegistered(contractId, documentHash, block.timestamp, msg.sender);
    }

    /**
     * @notice Verifies whether a document hash matches the on-chain registration for a contract.
     * @param contractId The unique identifier of the contract.
     * @param documentHash The document hash to verify against the registration.
     * @return isValid True if the hash matches the registered hash.
     * @return timestamp The timestamp when the document was registered (0 if not found).
     */
    function verifyDocument(
        bytes32 contractId,
        bytes32 documentHash
    ) external view returns (bool isValid, uint256 timestamp) {
        Registration memory reg = registrations[contractId];
        if (!reg.exists) {
            return (false, 0);
        }
        bool matches = reg.documentHash == documentHash;
        return (matches, reg.timestamp);
    }

    /**
     * @notice Retrieves the full registration details for a contract.
     * @param contractId The unique identifier of the contract.
     * @return reg The Registration struct containing all registration details.
     */
    function getRegistration(
        bytes32 contractId
    ) external view returns (Registration memory reg) {
        return registrations[contractId];
    }

    /**
     * @notice Transfers ownership to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ContractRegistry: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
