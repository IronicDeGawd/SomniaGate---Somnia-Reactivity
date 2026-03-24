// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title PayGate
 * @notice Universal on-chain payment gate. Creators register content with a price,
 *         users pay to unlock. Reactivity handler auto-splits payments.
 */
contract PayGate {
    // ── Reentrancy guard ──
    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    struct Gate {
        address creator;
        uint256 price;
        bool active;
        uint256 totalRevenue;
        uint256 unlockCount;
    }

    /// @notice contentId => Gate
    mapping(bytes32 => Gate) public gates;

    /// @notice contentId => user => hasAccess
    mapping(bytes32 => mapping(address => bool)) public hasAccess;

    /// @notice creator => withdrawable balance (after splits)
    mapping(address => uint256) public creatorBalances;

    /// @notice Platform fee recipient
    address public immutable platform;

    /// @notice Platform fee in basis points (500 = 5%)
    uint256 public constant PLATFORM_FEE_BPS = 500;

    // ── Events ──

    event GateCreated(
        bytes32 indexed contentId,
        address indexed creator,
        uint256 price
    );

    event AccessGranted(
        bytes32 indexed contentId,
        address indexed user,
        uint256 amount,
        address indexed creator
    );

    event GateUpdated(
        bytes32 indexed contentId,
        uint256 newPrice,
        bool active
    );

    event Withdrawn(
        address indexed creator,
        uint256 amount
    );

    // ── Errors ──

    error GateAlreadyExists();
    error GateNotFound();
    error GateInactive();
    error AlreadyUnlocked();
    error InsufficientPayment();
    error NotGateCreator();
    error NothingToWithdraw();
    error TransferFailed();

    constructor(address _platform) {
        platform = _platform;
    }

    /**
     * @notice Create a new payment gate for content.
     * @param contentId Unique identifier (hash of URL, article slug, etc.)
     * @param price Price in wei (STT) to unlock
     */
    function createGate(bytes32 contentId, uint256 price) external {
        if (gates[contentId].creator != address(0)) revert GateAlreadyExists();

        gates[contentId] = Gate({
            creator: msg.sender,
            price: price,
            active: true,
            totalRevenue: 0,
            unlockCount: 0
        });

        emit GateCreated(contentId, msg.sender, price);
    }

    /**
     * @notice Pay to unlock content. Emits AccessGranted for Reactivity handler.
     * @param contentId The content to unlock
     */
    function unlock(bytes32 contentId) external payable nonReentrant {
        Gate storage gate = gates[contentId];
        if (gate.creator == address(0)) revert GateNotFound();
        if (!gate.active) revert GateInactive();
        if (hasAccess[contentId][msg.sender]) revert AlreadyUnlocked();
        if (msg.value < gate.price) revert InsufficientPayment();

        hasAccess[contentId][msg.sender] = true;
        gate.totalRevenue += gate.price;
        gate.unlockCount += 1;

        // Calculate split from gate.price (not msg.value) to prevent overpayment accounting error
        uint256 platformCut = (gate.price * PLATFORM_FEE_BPS) / 10000;
        uint256 creatorCut = gate.price - platformCut;

        // Credit creator balance (they withdraw later)
        creatorBalances[gate.creator] += creatorCut;

        // Send platform fee
        (bool ok, ) = platform.call{value: platformCut}("");
        if (!ok) revert TransferFailed();

        // Refund overpayment
        if (msg.value > gate.price) {
            uint256 refund = msg.value - gate.price;
            (bool refundOk, ) = msg.sender.call{value: refund}("");
            if (!refundOk) revert TransferFailed();
        }

        emit AccessGranted(contentId, msg.sender, msg.value, gate.creator);
    }

    /**
     * @notice Creator withdraws accumulated revenue.
     */
    function withdraw() external nonReentrant {
        uint256 amount = creatorBalances[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        creatorBalances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Update gate price or active status.
     */
    function updateGate(bytes32 contentId, uint256 newPrice, bool active) external {
        Gate storage gate = gates[contentId];
        if (gate.creator == address(0)) revert GateNotFound();
        if (gate.creator != msg.sender) revert NotGateCreator();

        gate.price = newPrice;
        gate.active = active;

        emit GateUpdated(contentId, newPrice, active);
    }

    /**
     * @notice Check if a user has access to content.
     */
    function checkAccess(bytes32 contentId, address user) external view returns (bool) {
        return hasAccess[contentId][user];
    }

    /**
     * @notice Get gate details.
     */
    function getGate(bytes32 contentId) external view returns (
        address creator,
        uint256 price,
        bool active,
        uint256 totalRevenue,
        uint256 unlockCount
    ) {
        Gate storage gate = gates[contentId];
        return (gate.creator, gate.price, gate.active, gate.totalRevenue, gate.unlockCount);
    }

}
