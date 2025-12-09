// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../v3/TheCellarV3.sol";
import "../v3/CellarToken.sol";

/**
 * @title LPStaking
 * @notice Staking contract for CLP (CellarToken) with lock periods and KEEP rewards
 */
contract LPStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken; // CLP (CellarToken)
    IERC20 public immutable rewardToken; // KEEP
    TheCellarV3 public immutable cellar;

    uint256 public constant MAX_LOCK_DAYS = 365;
    uint256 public constant LOCK_MULTIPLIER_SCALE = 1e18;
    uint256 public constant MAX_LOCK_MULTIPLIER = 1.5e18; // 1.5x max multiplier

    struct StakeInfo {
        uint256 amount;
        uint256 lockExpiry;
        uint256 lockMultiplier; // stored as 1e18 scaled value
        uint256 rewardDebt; // for accounting user's share
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalWeightedStake; // sum of (amount * lockMultiplier)
    uint256 public totalRewards; // total rewards deposited
    uint256 public rewardPerWeight; // accumulated reward per weighted stake unit

    event Staked(address indexed user, uint256 amount, uint256 lockDays, uint256 lockExpiry);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDeposited(uint256 amount);

    constructor(address _stakingToken, address _rewardToken, address _cellar) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        cellar = TheCellarV3(payable(_cellar));
    }

    /**
     * @notice Stake CLP tokens with optional lock period
     * @param amount Amount of CLP to stake
     * @param lockDays Lock period in days (0-365)
     */
    function stake(uint256 amount, uint256 lockDays) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(lockDays <= MAX_LOCK_DAYS, "Lock period too long");

        StakeInfo storage userStake = stakes[msg.sender];

        // Update rewards before modifying stake
        _updateRewards(msg.sender);

        // Calculate lock multiplier: 1 + (lockDays / 365) * 0.5
        // Max multiplier is 1.5x for 365 days
        uint256 multiplier = LOCK_MULTIPLIER_SCALE;
        if (lockDays > 0) {
            multiplier = LOCK_MULTIPLIER_SCALE + (lockDays * 0.5e18) / MAX_LOCK_DAYS;
            if (multiplier > MAX_LOCK_MULTIPLIER) {
                multiplier = MAX_LOCK_MULTIPLIER;
            }
        }

        uint256 lockExpiry = lockDays > 0 ? block.timestamp + (lockDays * 1 days) : 0;

        // If user has existing stake, merge with new stake
        if (userStake.amount > 0) {
            // Use the longer lock period and higher multiplier
            if (lockExpiry > userStake.lockExpiry) {
                userStake.lockExpiry = lockExpiry;
                userStake.lockMultiplier = multiplier;
            } else if (multiplier > userStake.lockMultiplier) {
                userStake.lockMultiplier = multiplier;
            }
        } else {
            userStake.lockExpiry = lockExpiry;
            userStake.lockMultiplier = multiplier;
        }

        // Update weighted stake
        uint256 oldWeighted = userStake.amount * userStake.lockMultiplier / LOCK_MULTIPLIER_SCALE;
        userStake.amount += amount;
        uint256 newWeighted = userStake.amount * userStake.lockMultiplier / LOCK_MULTIPLIER_SCALE;
        totalWeightedStake = totalWeightedStake - oldWeighted + newWeighted;

        // Update reward debt
        userStake.rewardDebt = userStake.amount * userStake.lockMultiplier * rewardPerWeight / (LOCK_MULTIPLIER_SCALE * 1e18);

        // Transfer tokens from user
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, lockDays, lockExpiry);
    }

    /**
     * @notice Unstake CLP tokens (respects lock period)
     * @param amount Amount of CLP to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");

        // Check lock period
        if (userStake.lockExpiry > 0) {
            require(block.timestamp >= userStake.lockExpiry, "Still locked");
        }

        // Update rewards before modifying stake
        _updateRewards(msg.sender);

        // Update weighted stake
        uint256 oldWeighted = userStake.amount * userStake.lockMultiplier / LOCK_MULTIPLIER_SCALE;
        userStake.amount -= amount;
        uint256 newWeighted = userStake.amount * userStake.lockMultiplier / LOCK_MULTIPLIER_SCALE;
        totalWeightedStake = totalWeightedStake - oldWeighted + newWeighted;

        // Update reward debt
        if (userStake.amount > 0) {
            userStake.rewardDebt = userStake.amount * userStake.lockMultiplier * rewardPerWeight / (LOCK_MULTIPLIER_SCALE * 1e18);
        } else {
            // Clear stake info if fully unstaked
            userStake.lockExpiry = 0;
            userStake.lockMultiplier = LOCK_MULTIPLIER_SCALE;
            userStake.rewardDebt = 0;
        }

        // Transfer tokens to user
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);
        StakeInfo storage userStake = stakes[msg.sender];

        uint256 pending = _calculatePendingRewards(msg.sender);
        require(pending > 0, "No rewards to claim");

        // Update reward debt
        userStake.rewardDebt = userStake.amount * userStake.lockMultiplier * rewardPerWeight / (LOCK_MULTIPLIER_SCALE * 1e18);

        // Transfer rewards
        rewardToken.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    /**
     * @notice Deposit rewards (only callable by TheCellarV3 or owner)
     * @param amount Amount of KEEP to deposit as rewards
     */
    function depositRewards(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(msg.sender == address(cellar) || msg.sender == owner(), "Not authorized");

        if (totalWeightedStake > 0) {
            // Update reward per weight
            rewardPerWeight += (amount * 1e18) / totalWeightedStake;
        }

        totalRewards += amount;
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        emit RewardsDeposited(amount);
    }

    /**
     * @notice Get pending rewards for a user
     * @param user Address to check
     * @return Pending reward amount
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return _calculatePendingRewards(user);
    }

    /**
     * @notice Internal function to update user's reward accounting
     */
    function _updateRewards(address user) internal {
        StakeInfo storage userStake = stakes[user];
        if (userStake.amount == 0) return;

        // Calculate pending rewards and update reward debt
        uint256 pending = _calculatePendingRewards(user);
        if (pending > 0) {
            userStake.rewardDebt = userStake.amount * userStake.lockMultiplier * rewardPerWeight / (LOCK_MULTIPLIER_SCALE * 1e18);
        }
    }

    /**
     * @notice Calculate pending rewards for a user
     */
    function _calculatePendingRewards(address user) internal view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0 || totalWeightedStake == 0) {
            return 0;
        }

        uint256 userWeighted = userStake.amount * userStake.lockMultiplier / LOCK_MULTIPLIER_SCALE;
        uint256 userReward = (userWeighted * rewardPerWeight) / 1e18;

        if (userReward > userStake.rewardDebt) {
            return userReward - userStake.rewardDebt;
        }
        return 0;
    }

    /**
     * @notice Get user's stake info
     */
    function getUserStake(address user) external view returns (StakeInfo memory) {
        return stakes[user];
    }
}

