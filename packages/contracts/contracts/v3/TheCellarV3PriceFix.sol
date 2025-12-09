// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TheCellarV3Upgrade.sol";

/**
 * @title TheCellarV3PriceFix
 * @notice Upgrade to fix price calculation bug in raid() function
 * @dev This upgrade fixes:
 *      - raid() now uses currentPrice (price paid) instead of initPrice (old init price) for next epoch
 *      - Matches Office Manager behavior: new init price = current price * multiplier
 *      - Prevents unbounded price growth from compounding old initPrice values
 *
 * @dev Storage compatibility: Inherits from TheCellarV3Upgrade to maintain storage layout
 *      compatibility with the currently deployed contract which has auctionInitialized.
 */
contract TheCellarV3PriceFix is TheCellarV3Upgrade {
    // The fix is in the base TheCellarV3.sol contract (raid() function uses currentPrice)
    // We inherit from TheCellarV3Upgrade to maintain storage layout (auctionInitialized variable)
    // This ensures the upgrade is compatible with the currently deployed TheCellarV3Upgrade contract
}

