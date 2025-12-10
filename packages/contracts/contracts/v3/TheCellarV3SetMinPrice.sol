// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TheCellarV3PotPrice.sol";

/**
 * @title TheCellarV3SetMinPrice
 * @notice Upgrade to add function to set minimum raid price (v1.7.0) [CURRENT DEPLOYED]
 * @dev NO NEW STORAGE VARIABLES - only adds a function
 *      Inherits from TheCellarV3PotPrice which has:
 *      - potPriceCoefficient (uint256)
 *      - auctionInitialized (bool, from TheCellarV3Upgrade)
 *      All storage is preserved exactly as-is
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * VERSION TRACKING - READ THIS BEFORE MAKING CHANGES
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * VERSION: v1.7.0
 * DEPLOYED: 2025-01-10
 * IMPLEMENTATION: 0x44dd37503Ac350Ac488E6874478fd3703bF68DC7
 * PROXY: 0x32A920be00dfCE1105De0415ba1d4f06942E9ed0
 *
 * UPGRADE CHAIN (ALL REQUIRED - DO NOT DELETE):
 *   TheCellarV3 (v1.0.0)
 *   → TheCellarV3Upgrade (v1.3.0)
 *   → TheCellarV3PriceFix (v1.5.0)
 *   → TheCellarV3PotPrice (v1.6.0)
 *   → TheCellarV3SetMinPrice (v1.7.0) [CURRENT - THIS]
 *
 * ⚠️  CRITICAL RULES FOR UPGRADES:
 *   1. ALWAYS check DEPLOYMENT_TRACKER.md to see what's actually deployed
 *   2. NEVER delete contracts in the active upgrade chain (all 5 contracts above)
 *   3. When creating a new upgrade:
 *      a. Create a NEW contract file (e.g., TheCellarV3NewFeature.sol)
 *      b. Extend the CURRENT deployed version (TheCellarV3SetMinPrice)
 *      c. Update this header with new version info
 *      d. Update DEPLOYMENT_TRACKER.md immediately after deployment
 *      e. DELETE old unused contracts (not in the active chain)
 *   4. Storage layout MUST be preserved - use `npx hardhat storage-layout-diff`
 *   5. NEVER add storage variables in the middle - always add at the end
 *   6. Comment out unused variables instead of deleting them
 *
 * ════════════════════════════════════════════════════════════════════════════════
 */
contract TheCellarV3SetMinPrice is TheCellarV3PotPrice {
    // NO NEW STORAGE VARIABLES - this contract only adds functions
    // Storage layout matches TheCellarV3PotPrice exactly

    /**
     * @notice Set minimum initial price for raids
     * @dev Can be called by owner to update minimum raid price
     * @param _minInitPrice Minimum floor price (e.g., 100e18 for 100 CLP)
     */
    function setMinInitPrice(uint256 _minInitPrice) external onlyOwner {
        require(_minInitPrice >= ABS_MIN_INIT_PRICE && _minInitPrice <= ABS_MAX_INIT_PRICE, "Invalid min init price");
        minInitPrice = _minInitPrice;
    }
}

