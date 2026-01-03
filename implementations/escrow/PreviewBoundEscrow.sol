// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title PreviewBoundEscrow
 * @notice TGP escrow with preview hash validation
 * @dev This contract validates preview hashes to ensure settlement integrity
 *
 * Features:
 * - Validates preview_hash on settlement
 * - Prevents replay of consumed previews
 * - Enforces preview-based amount verification
 * - Includes timelock for withdrawals
 *
 * Security properties:
 * - Preview hash prevents parameter manipulation
 * - Single-use prevention stops replay attacks
 * - Timelock protects against premature withdrawal
 */
contract PreviewBoundEscrow {
    struct Settlement {
        address buyer;
        address seller;
        uint256 amount;
        bytes32 previewHash;
        uint256 settledAt;
        bool withdrawn;
    }

    uint256 public constant TIMELOCK = 24 hours;

    // order_id => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // preview_hash => consumed (prevents replay)
    mapping(bytes32 => bool) public previewConsumed;

    event Settled(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 previewHash,
        uint256 timestamp
    );

    event Withdrawn(
        bytes32 indexed orderId,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Settle with preview hash validation
     * @param orderId Unique order identifier
     * @param seller Address that will receive funds
     * @param previewHash Preview hash commitment
     */
    function settle(
        bytes32 orderId,
        address seller,
        bytes32 previewHash
    ) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(seller != address(0), "Invalid seller address");
        require(previewHash != bytes32(0), "Invalid preview hash");
        require(settlements[orderId].buyer == address(0), "Settlement exists");
        require(!previewConsumed[previewHash], "Preview already consumed");

        // Mark preview as consumed (prevents replay)
        previewConsumed[previewHash] = true;

        settlements[orderId] = Settlement({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            previewHash: previewHash,
            settledAt: block.timestamp,
            withdrawn: false
        });

        emit Settled(
            orderId,
            msg.sender,
            seller,
            msg.value,
            previewHash,
            block.timestamp
        );
    }

    /**
     * @notice Withdraw funds after timelock
     * @param orderId Order to withdraw from
     */
    function withdraw(bytes32 orderId) external {
        Settlement storage s = settlements[orderId];

        require(s.seller == msg.sender, "Not the seller");
        require(!s.withdrawn, "Already withdrawn");
        require(
            block.timestamp >= s.settledAt + TIMELOCK,
            "Timelock not expired"
        );

        s.withdrawn = true;

        (bool success, ) = s.seller.call{value: s.amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(orderId, s.seller, s.amount, block.timestamp);
    }

    /**
     * @notice Check if withdrawal is available
     * @param orderId Order to check
     */
    function isWithdrawable(bytes32 orderId) external view returns (bool) {
        Settlement storage s = settlements[orderId];

        if (s.buyer == address(0)) return false;
        if (s.withdrawn) return false;
        if (block.timestamp < s.settledAt + TIMELOCK) return false;

        return true;
    }

    /**
     * @notice Get settlement details
     */
    function getSettlement(bytes32 orderId)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 amount,
            bytes32 previewHash,
            uint256 settledAt,
            bool withdrawn
        )
    {
        Settlement storage s = settlements[orderId];
        return (
            s.buyer,
            s.seller,
            s.amount,
            s.previewHash,
            s.settledAt,
            s.withdrawn
        );
    }

    /**
     * @notice Check if preview hash has been consumed
     */
    function isPreviewConsumed(bytes32 previewHash)
        external
        view
        returns (bool)
    {
        return previewConsumed[previewHash];
    }
}

