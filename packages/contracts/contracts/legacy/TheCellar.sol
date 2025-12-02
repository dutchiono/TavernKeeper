// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TheCellar is Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant MIN_EPOCH_PERIOD = 1 hours;
    uint256 public constant MAX_EPOCH_PERIOD = 365 days;
    uint256 public constant MIN_PRICE_MULTIPLIER = 1.1e18; // Should at least be 110% of settlement price
    uint256 public constant MAX_PRICE_MULTIPLIER = 3e18; // Should not exceed 300% of settlement price
    uint256 public constant ABS_MIN_INIT_PRICE = 1e18; // Minimum sane value for init price (1 MON)
    uint256 public constant ABS_MAX_INIT_PRICE = type(uint192).max; // chosen so that initPrice * priceMultiplier does not exceed uint256
    uint256 public constant PRICE_MULTIPLIER_SCALE = 1e18;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable paymentToken; // The LP Token to burn
    address public immutable paymentReceiver; // Where burnt tokens go (usually dead address)
    uint256 public immutable epochPeriod;
    uint256 public immutable priceMultiplier;
    uint256 public immutable minInitPrice;

    struct Slot0 {
        uint8 locked; // 1 if unlocked, 2 if locked
        uint16 epochId; // intentionally overflowable
        uint192 initPrice;
        uint40 startTime;
    }

    Slot0 internal slot0;

    /*----------  ERRORS ------------------------------------------------*/

    error Cellar__DeadlinePassed();
    error Cellar__EpochIdMismatch();
    error Cellar__MaxPaymentAmountExceeded();
    error Cellar__EmptyAssets();
    error Cellar__Reentrancy();
    error Cellar__InitPriceBelowMin();
    error Cellar__InitPriceExceedsMax();
    error Cellar__EpochPeriodBelowMin();
    error Cellar__EpochPeriodExceedsMax();
    error Cellar__PriceMultiplierBelowMin();
    error Cellar__PriceMultiplierExceedsMax();
    error Cellar__MinInitPriceBelowMin();
    error Cellar__MinInitPriceExceedsAbsMaxInitPrice();

    /*----------  EVENTS ------------------------------------------------*/

    event Cellar__Buy(address indexed buyer, address indexed assetsReceiver, uint256 paymentAmount);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonReentrant() {
        if (slot0.locked == 2) revert Cellar__Reentrancy();
        slot0.locked = 2;
        _;
        slot0.locked = 1;
    }

    modifier nonReentrantView() {
        if (slot0.locked == 2) revert Cellar__Reentrancy();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /// @dev Initializes The Cellar contract with the specified parameters.
    constructor(
        uint256 initPrice,
        address paymentToken_,
        address paymentReceiver_,
        uint256 epochPeriod_,
        uint256 priceMultiplier_,
        uint256 minInitPrice_
    ) Ownable(msg.sender) {
        if (initPrice < minInitPrice_) revert Cellar__InitPriceBelowMin();
        if (initPrice > ABS_MAX_INIT_PRICE) revert Cellar__InitPriceExceedsMax();
        if (epochPeriod_ < MIN_EPOCH_PERIOD) revert Cellar__EpochPeriodBelowMin();
        if (epochPeriod_ > MAX_EPOCH_PERIOD) revert Cellar__EpochPeriodExceedsMax();
        if (priceMultiplier_ < MIN_PRICE_MULTIPLIER) revert Cellar__PriceMultiplierBelowMin();
        if (priceMultiplier_ > MAX_PRICE_MULTIPLIER) revert Cellar__PriceMultiplierExceedsMax();
        if (minInitPrice_ < ABS_MIN_INIT_PRICE) revert Cellar__MinInitPriceBelowMin();
        if (minInitPrice_ > ABS_MAX_INIT_PRICE) revert Cellar__MinInitPriceExceedsAbsMaxInitPrice();

        slot0.initPrice = uint192(initPrice);
        slot0.startTime = uint40(block.timestamp);

        paymentToken = paymentToken_;
        paymentReceiver = paymentReceiver_;
        epochPeriod = epochPeriod_;
        priceMultiplier = priceMultiplier_;
        minInitPrice = minInitPrice_;
    }

    /// @dev Allows a user to "buy" the pot by paying (burning) LP tokens.
    /// @param assetsReceiver The address that will receive the bought assets (ETH/MON).
    /// @param epochId Id of the epoch to buy from.
    /// @param deadline The deadline timestamp.
    /// @param maxPaymentTokenAmount The maximum amount of LP tokens to spend.
    /// @return paymentAmount The amount of LP tokens spent.
    function buy(
        address assetsReceiver,
        uint256 epochId,
        uint256 deadline,
        uint256 maxPaymentTokenAmount
    ) external nonReentrant returns (uint256 paymentAmount) {
        if (block.timestamp > deadline) revert Cellar__DeadlinePassed();
        
        // Assets are just the ETH/MON balance of this contract
        uint256 balance = address(this).balance;
        if (balance == 0) revert Cellar__EmptyAssets();

        Slot0 memory slot0Cache = slot0;

        if (uint16(epochId) != slot0Cache.epochId) revert Cellar__EpochIdMismatch();

        paymentAmount = getPriceFromCache(slot0Cache);

        if (paymentAmount > maxPaymentTokenAmount) revert Cellar__MaxPaymentAmountExceeded();

        if (paymentAmount > 0) {
            // Transfer LP tokens from user to paymentReceiver (Dead address / Burn)
            IERC20(paymentToken).safeTransferFrom(msg.sender, paymentReceiver, paymentAmount);
        }

        // Send the pot (ETH/MON) to the receiver
        payable(assetsReceiver).transfer(balance);

        // Setup new auction
        uint256 newInitPrice = paymentAmount * priceMultiplier / PRICE_MULTIPLIER_SCALE;

        if (newInitPrice > ABS_MAX_INIT_PRICE) {
            newInitPrice = ABS_MAX_INIT_PRICE;
        } else if (newInitPrice < minInitPrice) {
            newInitPrice = minInitPrice;
        }

        unchecked {
            slot0Cache.epochId++;
        }
        slot0Cache.initPrice = uint192(newInitPrice);
        slot0Cache.startTime = uint40(block.timestamp);

        slot0 = slot0Cache;

        emit Cellar__Buy(msg.sender, assetsReceiver, paymentAmount);

        return paymentAmount;
    }

    function getPriceFromCache(Slot0 memory slot0Cache) internal view returns (uint256) {
        uint256 timePassed = block.timestamp - slot0Cache.startTime;

        if (timePassed > epochPeriod) {
            return minInitPrice;
        }

        return slot0Cache.initPrice - slot0Cache.initPrice * timePassed / epochPeriod;
    }

    function getPrice() external view nonReentrantView returns (uint256) {
        return getPriceFromCache(slot0);
    }

    function getSlot0() external view nonReentrantView returns (Slot0 memory) {
        return slot0;
    }

    // Allow receiving ETH/MON
    receive() external payable {}
}
