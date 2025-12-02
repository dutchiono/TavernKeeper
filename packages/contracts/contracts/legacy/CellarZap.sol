// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IUniswapV2Router02.sol";

interface ITheCellar {
    function buy(
        address assetsReceiver,
        uint256 epochId,
        uint256 deadline,
        uint256 maxPaymentTokenAmount
    ) external returns (uint256);
    
    function paymentToken() external view returns (address);
}

contract CellarZap is Ownable {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;
    address public immutable WETH;
    
    address public cellar;
    address public keepToken;

    event Zapped(address indexed user, uint256 ethAmount, uint256 keepAmount, uint256 lpBurned);

    constructor(address _router, address _cellar, address _keepToken) Ownable(msg.sender) {
        router = IUniswapV2Router02(_router);
        WETH = router.WETH();
        cellar = _cellar;
        keepToken = _keepToken;
    }

    function setCellar(address _cellar) external onlyOwner {
        cellar = _cellar;
    }

    function setKeepToken(address _keepToken) external onlyOwner {
        keepToken = _keepToken;
    }

    receive() external payable {}

    function zapWithETH(uint256 minLPAmount, uint256 epochId) external payable {
        require(msg.value > 0, "No ETH sent");

        // 1. Swap ~50% ETH for KEEP
        uint256 ethToSwap = msg.value / 2;
        uint256 ethForLiquidity = msg.value - ethToSwap;

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = keepToken;

        uint[] memory amounts = router.swapExactETHForTokens{value: ethToSwap}(
            0, // Accept any amount of KEEP (slippage handled by LP min amount)
            path,
            address(this),
            block.timestamp
        );
        uint256 keepAmount = amounts[1];

        // 2. Add Liquidity
        IERC20(keepToken).forceApprove(address(router), keepAmount);
        
        (,, uint256 liquidity) = router.addLiquidityETH{value: ethForLiquidity}(
            keepToken,
            keepAmount,
            0, // Slippage handled by minLPAmount
            0,
            address(this),
            block.timestamp
        );

        require(liquidity >= minLPAmount, "Insufficient LP output");

        // 3. Buy from Cellar (Burn LP)
        address lpToken = ITheCellar(cellar).paymentToken();
        IERC20(lpToken).forceApprove(cellar, liquidity);

        // We buy as much as possible with the LP we have
        // The user receives the pot (ETH/MON)
        ITheCellar(cellar).buy(
            msg.sender, // Assets go to user
            epochId,
            block.timestamp + 300,
            liquidity // Max payment is what we have
        );

        emit Zapped(msg.sender, msg.value, 0, liquidity);

        // Refund dust
        _refundDust(keepToken);
    }

    function zapWithToken(uint256 amount, uint256 minLPAmount, uint256 epochId) external {
        require(amount > 0, "No tokens sent");
        
        IERC20(keepToken).safeTransferFrom(msg.sender, address(this), amount);

        // 1. Swap ~50% KEEP for ETH
        uint256 keepToSwap = amount / 2;
        uint256 keepForLiquidity = amount - keepToSwap;

        IERC20(keepToken).forceApprove(address(router), keepToSwap);

        address[] memory path = new address[](2);
        path[0] = keepToken;
        path[1] = WETH;

        uint[] memory amounts = router.swapExactTokensForETH(
            keepToSwap,
            0,
            path,
            address(this),
            block.timestamp
        );
        uint256 ethAmount = amounts[1];

        // 2. Add Liquidity
        IERC20(keepToken).forceApprove(address(router), keepForLiquidity);

        (,, uint256 liquidity) = router.addLiquidityETH{value: ethAmount}(
            keepToken,
            keepForLiquidity,
            0,
            0,
            address(this),
            block.timestamp
        );

        require(liquidity >= minLPAmount, "Insufficient LP output");

        // 3. Buy from Cellar
        address lpToken = ITheCellar(cellar).paymentToken();
        IERC20(lpToken).forceApprove(cellar, liquidity);

        ITheCellar(cellar).buy(
            msg.sender,
            epochId,
            block.timestamp + 300,
            liquidity
        );

        emit Zapped(msg.sender, 0, amount, liquidity);

        // Refund dust
        _refundDust(keepToken);
    }

    function _refundDust(address token) internal {
        uint256 ethBal = address(this).balance;
        if (ethBal > 0) {
            (bool success, ) = msg.sender.call{value: ethBal}("");
            require(success, "ETH refund failed");
        }

        uint256 tokenBal = IERC20(token).balanceOf(address(this));
        if (tokenBal > 0) {
            IERC20(token).safeTransfer(msg.sender, tokenBal);
        }
    }
}
