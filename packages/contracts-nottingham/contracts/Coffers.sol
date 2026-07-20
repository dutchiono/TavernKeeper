// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISheriffsOfficeCredits {
    function withdrawCredits() external;
}

/**
 * @title Coffers
 * @notice Nottingham's treasury. Receives the 25% ETH levy on every sale and the 10%
 *         emission slice, so it accrues *both* sides of the NOTT/ETH pair and can seed
 *         liquidity without a premine.
 *
 * @dev Deliberately NOT upgradeable. This contract holds funds; an upgrade hook on a
 *      treasury means the owner can rewrite withdrawal logic after users have committed
 *      capital, which is the shape of a rug. The office and token stay upgradeable
 *      because their logic may need fixing; the vault that holds the money does not.
 *
 * @dev Deliberately NOT an autonomous zap. A contract that buys NOTT and LPs on a timer
 *      is sandwichable on every single fire - the trade is public, the size is known, and
 *      the timing is predictable. Liquidity operations are owner-gated with explicit
 *      approvals so a multisig can execute them with real slippage bounds. See README.
 */
contract Coffers is Ownable {
    using SafeERC20 for IERC20;

    /// @notice $NOTT.
    address public immutable nott;

    event LevyReceived(uint256 amount);
    event SpenderApproved(address indexed token, address indexed spender, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event CreditsCollected(address indexed office);

    error ZeroAddress();
    error NothingToWithdraw();
    error TransferFailed();

    constructor(address _nott, address _owner) Ownable(_owner) {
        if (_nott == address(0) || _owner == address(0)) revert ZeroAddress();
        nott = _nott;
    }

    /**
     * @dev Must stay empty. SheriffsOffice pays the levy with a 30k gas stipend, so any
     *      bookkeeping here risks the send failing and the levy being escrowed instead.
     *      Use `balances()` to read state rather than tracking it on receipt.
     */
    receive() external payable {}

    /// @notice Claim a levy that was escrowed because this contract could not receive it.
    function collectCredits(address office) external onlyOwner {
        if (office == address(0)) revert ZeroAddress();
        ISheriffsOfficeCredits(office).withdrawCredits();
        emit CreditsCollected(office);
    }

    /**
     * @notice Approve a router or position manager to spend a token held here.
     * @dev The liquidity path: approve the position manager, then have the owner multisig
     *      call it directly with its own slippage and tick bounds. Keeps the trade
     *      parameters in the hands of whoever is watching the mempool at the time.
     */
    function approveSpender(address token, address spender, uint256 amount) external onlyOwner {
        if (token == address(0) || spender == address(0)) revert ZeroAddress();
        IERC20(token).forceApprove(spender, amount);
        emit SpenderApproved(token, spender, amount);
    }

    function withdrawETH(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > address(this).balance) revert NothingToWithdraw();

        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit ETHWithdrawn(to, amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert NothingToWithdraw();

        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }

    /// @notice Both sides of the pair currently held.
    function balances() external view returns (uint256 ethBalance, uint256 nottBalance) {
        return (address(this).balance, IERC20(nott).balanceOf(address(this)));
    }
}
