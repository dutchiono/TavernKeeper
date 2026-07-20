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

    /**
     * @notice Assets the treasury may hold beyond ETH and NOTT - in practice Robinhood
     *         Stock Tokens, so the Coffers can take real equity exposure.
     * @dev Verified on-chain before enabling this: Stock Tokens do NOT rebase. balanceOf
     *      and totalSupply return raw stored balances, and the MULTIPLIER_UPDATER_ROLE
     *      multiplier lives in ERC20ScaledUIUpgradeable and is display-only. So a stock
     *      split cannot silently alter a reserve balance or a pool's reserves.
     *
     *      What does remain: transfers carry `onlyNotPaused` (and paused() folds in oracle
     *      status, so a stale oracle or closed market can freeze them) and `onlyNotBlocked`
     *      against a registry Robinhood controls. Both are survivable for a *reserve* -
     *      a frozen balance is illiquid, not lost - which is exactly why exposure is capped
     *      and why the canonical NOTT/ETH pool must never depend on one.
     */
    mapping(address => bool) public approvedReserve;

    /// @notice Cumulative ETH spent acquiring reserve assets.
    uint256 public reserveEthSpent;

    /**
     * @notice Ceiling on treasury ETH that may ever be routed into reserves.
     * @dev The health property in one line: stock exposure must never be load-bearing.
     *      At most 30% of the treasury can be committed to equities; the remainder stays
     *      in ETH backing the canonical NOTT/ETH pool, which is the pair that must keep
     *      working when a stock token is paused or an address is blocked.
     */
    uint256 public constant MAX_RESERVE_BPS = 3_000;
    uint256 public constant BPS_DIVISOR = 10_000;

    event LevyReceived(uint256 amount);
    event SpenderApproved(address indexed token, address indexed spender, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event CreditsCollected(address indexed office);
    event ReserveApprovalChanged(address indexed asset, bool approved);
    event ReserveFunded(address indexed spender, uint256 ethAmount);

    error ZeroAddress();
    error NothingToWithdraw();
    error TransferFailed();
    error NotApprovedReserve(address asset);
    error ReserveCapExceeded(uint256 requested, uint256 headroom);

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

    /// @notice Approve an asset the treasury may hold as a reserve.
    function setReserveApproval(address asset, bool approved) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        approvedReserve[asset] = approved;
        emit ReserveApprovalChanged(asset, approved);
    }

    /**
     * @notice Treasury ETH still available for reserve acquisition.
     * @dev Measured against (already spent + still held) rather than a running total of
     *      inflows, because receive() must stay empty - the office pays the levy with a
     *      30k gas stipend, so bookkeeping on receipt would risk the levy escrowing
     *      instead of arriving.
     */
    function reserveHeadroom() public view returns (uint256) {
        uint256 base = reserveEthSpent + address(this).balance;
        uint256 ceiling = (base * MAX_RESERVE_BPS) / BPS_DIVISOR;
        return ceiling > reserveEthSpent ? ceiling - reserveEthSpent : 0;
    }

    /**
     * @notice Send ETH to a spender to acquire an approved reserve asset.
     * @dev Purchase happens off-contract: an autonomous buyer would be sandwichable on
     *      every fire, so the owner multisig executes with its own slippage bounds. This
     *      enforces the allocation policy and the accounting.
     */
    function fundReservePurchase(
        address spender,
        address asset,
        uint256 ethAmount
    ) external onlyOwner {
        if (spender == address(0)) revert ZeroAddress();
        if (!approvedReserve[asset]) revert NotApprovedReserve(asset);
        if (ethAmount == 0 || ethAmount > address(this).balance) revert NothingToWithdraw();

        uint256 headroom = reserveHeadroom();
        if (ethAmount > headroom) revert ReserveCapExceeded(ethAmount, headroom);

        reserveEthSpent += ethAmount;

        (bool ok, ) = payable(spender).call{value: ethAmount}("");
        if (!ok) revert TransferFailed();
        emit ReserveFunded(spender, ethAmount);
    }

    /// @notice Reserve balance of an approved asset.
    function reserveBalance(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    /// @notice Both sides of the pair currently held.
    function balances() external view returns (uint256 ethBalance, uint256 nottBalance) {
        return (address(this).balance, IERC20(nott).balanceOf(address(this)));
    }
}
