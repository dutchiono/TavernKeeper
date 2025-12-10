// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TheCellarV3Upgrade.sol";

/**
 * @title TheCellarV3PriceFix
 * @notice Upgrade to fix price calculation bug in raid() function (v1.5.0)
 * @dev This upgrade fixes:
 *      - raid() now uses currentPrice (price paid) instead of initPrice (old init price) for next epoch
 *      - Matches Office Manager behavior: new init price = current price * multiplier
 *      - Prevents unbounded price growth from compounding old initPrice values
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * VERSION TRACKING - READ THIS BEFORE MAKING CHANGES
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * VERSION: v1.5.0
 * DEPLOYED: 2025-01-XX
 * IMPLEMENTATION: 0x85d081275254f39d31ebC7b5b5DCBD7276C4E9dF
 * PROXY: 0x32A920be00dfCE1105De0415ba1d4f06942E9ed0
 *
 * UPGRADE CHAIN (ALL REQUIRED - DO NOT DELETE):
 *   TheCellarV3 (v1.0.0)
 *   → TheCellarV3Upgrade (v1.3.0)
 *   → TheCellarV3PriceFix (v1.5.0) [THIS]
 *   → TheCellarV3PotPrice (v1.6.0)
 *   → TheCellarV3SetMinPrice (v1.7.0) [CURRENT]
 *
 * ⚠️  CRITICAL: This contract is in the active upgrade chain. DO NOT DELETE.
 *
 * ════════════════════════════════════════════════════════════════════════════════
 */
contract TheCellarV3PriceFix is TheCellarV3Upgrade {
    // The fix is in the base TheCellarV3.sol contract (raid() function uses currentPrice)
    // We inherit from TheCellarV3Upgrade to maintain storage layout (auctionInitialized variable)
    // This ensures the upgrade is compatible with the currently deployed TheCellarV3Upgrade contract
}

