// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Escrow
 * @notice Manages escrow funds between a depositor and beneficiary for the Tabeliao platform.
 * @dev Supports full release, refund, freeze (for disputes), and partial release (milestone-based).
 *      The arbiter (platform) can intervene in disputes, freeze funds, or execute partial releases.
 */
contract Escrow {
    enum State {
        AWAITING_DEPOSIT,
        FUNDED,
        RELEASED,
        REFUNDED,
        FROZEN,
        DISPUTED
    }

    address public depositor;
    address public beneficiary;
    address public arbiter;
    uint256 public amount;
    bytes32 public contractId;
    State public state;

    bool public depositorApproval;
    bool public beneficiaryApproval;

    event Deposited(address indexed depositor, uint256 amount);
    event Released(address indexed beneficiary, uint256 amount);
    event Refunded(address indexed depositor, uint256 amount);
    event Frozen(address indexed arbiter);
    event PartialRelease(address indexed beneficiary, uint256 amount);
    event ApprovalGiven(address indexed approver);

    modifier onlyDepositor() {
        require(msg.sender == depositor, "Escrow: caller is not the depositor");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Escrow: caller is not the arbiter");
        _;
    }

    modifier onlyPartyOrArbiter() {
        require(
            msg.sender == depositor ||
            msg.sender == beneficiary ||
            msg.sender == arbiter,
            "Escrow: caller is not a party or arbiter"
        );
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Escrow: invalid state for this operation");
        _;
    }

    /**
     * @notice Creates a new escrow instance.
     * @param _contractId The contract ID this escrow is associated with.
     * @param _depositor The address that will deposit funds.
     * @param _beneficiary The address that will receive funds on release.
     * @param _arbiter The platform arbiter address for dispute resolution.
     */
    constructor(
        bytes32 _contractId,
        address _depositor,
        address _beneficiary,
        address _arbiter
    ) {
        require(_depositor != address(0), "Escrow: depositor is the zero address");
        require(_beneficiary != address(0), "Escrow: beneficiary is the zero address");
        require(_arbiter != address(0), "Escrow: arbiter is the zero address");
        require(_depositor != _beneficiary, "Escrow: depositor and beneficiary must differ");

        contractId = _contractId;
        depositor = _depositor;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        state = State.AWAITING_DEPOSIT;
    }

    /**
     * @notice Deposits funds into the escrow. Only the depositor can call this.
     */
    function deposit() external payable onlyDepositor inState(State.AWAITING_DEPOSIT) {
        require(msg.value > 0, "Escrow: deposit amount must be greater than zero");

        amount = msg.value;
        state = State.FUNDED;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Approves release of funds. Both depositor and beneficiary must approve,
     *         or the arbiter can unilaterally release.
     */
    function release() external onlyPartyOrArbiter inState(State.FUNDED) {
        if (msg.sender == arbiter) {
            _releaseFunds();
            return;
        }

        if (msg.sender == depositor) {
            depositorApproval = true;
        } else if (msg.sender == beneficiary) {
            beneficiaryApproval = true;
        }

        emit ApprovalGiven(msg.sender);

        if (depositorApproval && beneficiaryApproval) {
            _releaseFunds();
        }
    }

    /**
     * @notice Refunds funds to the depositor. Only the arbiter can initiate a refund,
     *         or both parties must agree (depositor calls after beneficiary approves).
     */
    function refund() external onlyPartyOrArbiter {
        require(
            state == State.FUNDED || state == State.FROZEN,
            "Escrow: can only refund when funded or frozen"
        );

        if (msg.sender != arbiter) {
            require(
                depositorApproval && beneficiaryApproval,
                "Escrow: both parties must approve refund"
            );
        }

        uint256 refundAmount = amount;
        amount = 0;
        state = State.REFUNDED;

        (bool success, ) = payable(depositor).call{value: refundAmount}("");
        require(success, "Escrow: refund transfer failed");

        emit Refunded(depositor, refundAmount);
    }

    /**
     * @notice Freezes the escrow. Only the arbiter can freeze, typically when a dispute is filed.
     */
    function freeze() external onlyArbiter inState(State.FUNDED) {
        state = State.FROZEN;
        emit Frozen(msg.sender);
    }

    /**
     * @notice Releases a partial amount to the beneficiary. Only the arbiter can do partial releases.
     * @param _amount The amount to release in this partial payment.
     */
    function releasePartial(uint256 _amount) external onlyArbiter {
        require(
            state == State.FUNDED || state == State.FROZEN,
            "Escrow: invalid state for partial release"
        );
        require(_amount > 0, "Escrow: amount must be greater than zero");
        require(_amount <= amount, "Escrow: amount exceeds escrow balance");

        amount -= _amount;

        (bool success, ) = payable(beneficiary).call{value: _amount}("");
        require(success, "Escrow: partial release transfer failed");

        if (amount == 0) {
            state = State.RELEASED;
        }

        emit PartialRelease(beneficiary, _amount);
    }

    /**
     * @notice Returns the current balance held in the escrow contract.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Internal function to release full funds to the beneficiary.
     */
    function _releaseFunds() private {
        uint256 releaseAmount = amount;
        amount = 0;
        state = State.RELEASED;

        (bool success, ) = payable(beneficiary).call{value: releaseAmount}("");
        require(success, "Escrow: release transfer failed");

        emit Released(beneficiary, releaseAmount);
    }

    /**
     * @notice Prevents accidental direct ETH/MATIC transfers.
     */
    receive() external payable {
        revert("Escrow: use deposit() to send funds");
    }
}
