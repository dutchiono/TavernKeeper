// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniswapV3Pool {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);

    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

/**
 * @title SimpleSwapRouter
 * @notice Simple swap router for Uniswap V3 pools
 * @dev Handles direct swaps on V3 pools without needing a full router
 */
contract SimpleSwapRouter is IUniswapV3SwapCallback {
    using SafeERC20 for IERC20;

    struct SwapCallbackData {
        address token0;
        address token1;
        address payer;
        address pool; // Store pool address to verify callback
    }

    /**
     * @notice Swap exact input amount for output tokens
     * @param pool The V3 pool address
     * @param amountIn Exact input amount
     * @param amountOutMinimum Minimum output amount (slippage protection)
     * @param recipient Address to receive output tokens
     * @param zeroForOne Direction: true = token0->token1, false = token1->token0
     * @return amountOut Actual output amount
     */
    function swapExactInput(
        address pool,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        bool zeroForOne
    ) external payable returns (uint256 amountOut) {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(pool);

        address tokenIn = zeroForOne ? v3Pool.token0() : v3Pool.token1();

        // Handle native token (MON) - wrap to WMON first
        if (msg.value > 0 && tokenIn == address(0)) {
            // This would require WMON wrapper - for now assume WMON is used
            revert("Use WMON for swaps, not native MON");
        }

        // Transfer input tokens from user
        if (tokenIn != address(0)) {
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        }

        // Prepare callback data (store token0 and token1 for callback)
        SwapCallbackData memory callbackData = SwapCallbackData({
            token0: v3Pool.token0(),
            token1: v3Pool.token1(),
            payer: msg.sender,
            pool: pool // Store pool address for verification
        });

        // Execute swap
        // sqrtPriceLimitX96: 0 = no price limit
        (int256 amount0Delta, int256 amount1Delta) = v3Pool.swap(
            recipient,
            zeroForOne,
            int256(amountIn),
            0, // No price limit
            abi.encode(callbackData)
        );

        // Calculate output amount
        amountOut = uint256(zeroForOne ? -amount1Delta : -amount0Delta);

        require(amountOut >= amountOutMinimum, "Insufficient output amount");
    }

    /**
     * @notice Swap callback required by V3 pools
     * @dev In V3, one delta is positive (amount to pay) and one is negative (amount to receive)
     *      We pay the positive delta to the pool
     */
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));

        // Verify callback is from the pool
        require(msg.sender == callbackData.pool, "Invalid callback caller");

        // Pay token0 if amount0Delta is positive (pool needs token0)
        if (amount0Delta > 0) {
            IERC20(callbackData.token0).safeTransfer(msg.sender, uint256(amount0Delta));
        }

        // Pay token1 if amount1Delta is positive (pool needs token1)
        if (amount1Delta > 0) {
            IERC20(callbackData.token1).safeTransfer(msg.sender, uint256(amount1Delta));
        }
    }

    receive() external payable {}
}

