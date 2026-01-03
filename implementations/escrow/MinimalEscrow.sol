// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title MinimalEscrow
 * @notice Basic escrow contract demonstrating TGP settlement flow
 * @dev This is a reference implementation for educational purposes only
 *
 * Features:
 * - Accepts settlements from buyers
 * - Holds funds until conditions met
 * - Allows seller withdrawal after timelock
 * - Prevents double-withdrawal
 *
 * Does NOT include:
 * - Preview hash validation (see PreviewBoundEscrow.sol)
 * - Dispute resolution
 * - Partial withdrawals
 */
contract MinimalEscrow {
    struct Settlement {
        address buyer;
        address seller;
        uint256 amount;
        uint256 settledAt;
        bool withdrawn;
    }

    // Timelock duration (e.g., 24 hours)
    uint256 public constant TIMELOCK = 24 hours;

    // order_id => Settlement
    mapping(bytes32 => Settlement) public settlements;

    event Settled(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    event Withdrawn(
        bytes32 indexed orderId,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Settle a transaction (buyer deposits funds)
     * @param orderId Unique order identifier
     * @param seller Address that will receive funds
     */
    function settle(bytes32 orderId, address seller) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(seller != address(0), "Invalid seller address");
        require(settlements[orderId].buyer == address(0), "Settlement already exists");

        settlements[orderId] = Settlement({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            settledAt: block.timestamp,
            withdrawn: false
        });

        emit Settled(orderId, msg.sender, seller, msg.value, block.timestamp);
    }

    /**
     * @notice Withdraw funds (seller claims after timelock)
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
     * @return available True if withdrawal is available
     */
    function isWithdrawable(bytes32 orderId) external view returns (bool) {
        Settlement storage s = settlements[orderId];

        if (s.buyer == address(0)) return false;  // Settlement doesn't exist
        if (s.withdrawn) return false;  // Already withdrawn
        if (block.timestamp < s.settledAt + TIMELOCK) return false;  // Timelock active

        return true;
    }

    /**
     * @notice Get settlement details
     * @param orderId Order to query
     * @return buyer Buyer address
     * @return seller Seller address
     * @return amount Settlement amount
     * @return settledAt Timestamp of settlement
     * @return withdrawn Whether funds have been withdrawn
     */
    function getSettlement(bytes32 orderId)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 amount,
            uint256 settledAt,
            bool withdrawn
        )
    {
        Settlement storage s = settlements[orderId];
        return (s.buyer, s.seller, s.amount, s.settledAt, s.withdrawn);
    }
}

