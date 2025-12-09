// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TheCellarV3Upgrade.sol";

/**
 * @title TheCellarV3Emergency
 * @notice Upgrade to add emergency liquidity removal function for orphaning old pools
 */
contract TheCellarV3Emergency is TheCellarV3Upgrade {
    event EmergencyLiquidityRemoved(uint256 tokenId, uint128 liquidityRemoved, uint256 amount0, uint256 amount1);

    /**
     * @notice Emergency function to remove ALL liquidity from the position
     * @dev Only owner can call. This will orphan the pool (make it empty/unusable).
     *      Use this when migrating to a new pool with correct price.
     * @param recipient Address to receive the withdrawn tokens (usually owner or treasury)
     */
    function emergencyRemoveAllLiquidity(address recipient) external onlyOwner {
        require(tokenId != 0, "No position to remove");
        require(recipient != address(0), "Invalid recipient");

        // Get current liquidity from position
        (,,,,,,,uint128 currentLiquidity,,,,) = positionManager.positions(tokenId);
        require(currentLiquidity > 0, "No liquidity to remove");

        // Remove all liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: currentLiquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });

        positionManager.decreaseLiquidity(params);

        // Collect tokens
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (uint256 collected0, uint256 collected1) = positionManager.collect(collectParams);

        // Optionally burn the NFT position (once liquidity is removed, it's empty)
        // Note: We keep the tokenId so TheCellarV3 knows there's no position anymore
        // If you want to burn it completely, uncomment:
        // positionManager.burn(tokenId);
        // tokenId = 0;

        emit EmergencyLiquidityRemoved(tokenId, currentLiquidity, collected0, collected1);
    }

    /**
     * @notice Burn the empty NFT position (call after emergencyRemoveAllLiquidity)
     * @dev Only owner can call. This completely removes the position NFT.
     */
    function burnEmptyPosition() external onlyOwner {
        require(tokenId != 0, "No position to burn");

        // Verify position is empty
        (,,,,,,,uint128 liquidity,,,,) = positionManager.positions(tokenId);
        require(liquidity == 0, "Position still has liquidity");

        uint256 oldTokenId = tokenId;
        positionManager.burn(tokenId);
        tokenId = 0;

        emit EmergencyLiquidityRemoved(oldTokenId, 0, 0, 0);
    }
}

