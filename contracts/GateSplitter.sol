// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

/**
 * @title GateSplitter
 * @notice Reactivity handler that watches PayGate for AccessGranted events
 *         and emits confirmation events for the widget to detect.
 *
 * The PayGate contract handles the actual payment split internally.
 * This handler provides a real-time confirmation signal via Reactivity
 * that the widget can listen for to instantly unlock content.
 */
contract GateSplitter is SomniaEventHandler {
    /// @notice The PayGate contract being watched
    address public immutable payGateAddress;

    /// @notice Emitted when a payment is confirmed via Reactivity
    event PaymentConfirmed(
        bytes32 indexed contentId,
        address indexed user,
        uint256 amount,
        address indexed creator
    );

    /// @notice Counter for total confirmations processed
    uint256 public confirmationCount;

    constructor(address _payGateAddress) {
        payGateAddress = _payGateAddress;
    }

    /**
     * @notice Called by Reactivity when AccessGranted event is detected.
     * @param emitter The contract that emitted the event (PayGate)
     * @param eventTopics The event topics (AccessGranted signature + indexed params)
     * @param data The non-indexed event data (amount)
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Verify event came from our PayGate
        require(emitter == payGateAddress, "wrong emitter");
        // Verify topic count matches AccessGranted (signature + 3 indexed)
        require(eventTopics.length >= 4, "unexpected topics");

        // Decode AccessGranted(bytes32 contentId, address user, uint256 amount, address creator)
        // Topic[0] = event signature
        // Topic[1] = contentId (indexed)
        // Topic[2] = user (indexed)
        // Topic[3] = creator (indexed)
        bytes32 contentId = eventTopics[1];
        address user = address(uint160(uint256(eventTopics[2])));
        address creator = address(uint160(uint256(eventTopics[3])));
        uint256 amount = abi.decode(data, (uint256));

        confirmationCount += 1;

        emit PaymentConfirmed(contentId, user, amount, creator);
    }

    // Must accept STT — handler needs 32+ STT for Reactivity validators to call it
    receive() external payable {}
}
