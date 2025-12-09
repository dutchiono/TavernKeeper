'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi';
import { formatEther, parseEther, Address } from 'viem';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';
import { CONTRACT_REGISTRY } from '../lib/contracts/registry';
import { PixelBox, PixelButton } from './PixelComponents';
import { Loader2 } from 'lucide-react';

export default function StakingInterface() {
    const { address, isConnected } = useAccount();
    const [stakeAmount, setStakeAmount] = useState('');
    const [unstakeAmount, setUnstakeAmount] = useState('');
    const [lockDays, setLockDays] = useState('0');
    const [keepBalance, setKeepBalance] = useState<bigint>(0n);

    const keepStakingAddress = CONTRACT_ADDRESSES.KEEP_STAKING as Address;
    const keepTokenAddress = CONTRACT_ADDRESSES.KEEP_TOKEN as Address;

    // Get contract ABI from registry
    const stakingAbi = CONTRACT_REGISTRY.KEEP_STAKING?.abi || [];
    const erc20Abi = CONTRACT_REGISTRY.KEEP_TOKEN?.abi || [];

    // Read user stake info
    const { data: userStake, refetch: refetchStake } = useReadContract({
        address: keepStakingAddress,
        abi: stakingAbi,
        functionName: 'getUserStake',
        args: address ? [address] : undefined,
        query: { enabled: !!address && isConnected },
    });

    // Read pending rewards
    const { data: pendingRewards, refetch: refetchRewards } = useReadContract({
        address: keepStakingAddress,
        abi: stakingAbi,
        functionName: 'getPendingRewards',
        args: address ? [address] : undefined,
        query: { enabled: !!address && isConnected },
    });

    // Read KEEP balance
    const { data: keepBalanceData, refetch: refetchBalance } = useReadContract({
        address: keepTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && isConnected },
    });

    // Read allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: keepTokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address && keepStakingAddress ? [address, keepStakingAddress] : undefined,
        query: { enabled: !!address && isConnected },
    });

    // Read total weighted stake
    const { data: totalWeightedStake } = useReadContract({
        address: keepStakingAddress,
        abi: stakingAbi,
        functionName: 'totalWeightedStake',
        query: { enabled: isConnected },
    });

    useEffect(() => {
        if (keepBalanceData) {
            setKeepBalance(keepBalanceData as bigint);
        }
    }, [keepBalanceData]);

    // Stake transaction
    const { writeContract: writeStake, data: stakeHash, isPending: isStaking } = useWriteContract();
    const { isLoading: isWaitingStake } = useWaitForTransactionReceipt({
        hash: stakeHash,
    });

    // Unstake transaction
    const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract();
    const { isLoading: isWaitingUnstake } = useWaitForTransactionReceipt({
        hash: unstakeHash,
    });

    // Claim rewards transaction
    const { writeContract: writeClaim, data: claimHash, isPending: isClaiming } = useWriteContract();
    const { isLoading: isWaitingClaim } = useWaitForTransactionReceipt({
        hash: claimHash,
    });

    // Approve transaction
    const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isLoading: isWaitingApprove } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Refetch after transactions
    useEffect(() => {
        if (stakeHash && !isWaitingStake) {
            refetchStake();
            refetchRewards();
            refetchBalance();
            refetchAllowance();
            setStakeAmount('');
        }
    }, [stakeHash, isWaitingStake, refetchStake, refetchRewards, refetchBalance, refetchAllowance]);

    useEffect(() => {
        if (unstakeHash && !isWaitingUnstake) {
            refetchStake();
            refetchRewards();
            refetchBalance();
            setUnstakeAmount('');
        }
    }, [unstakeHash, isWaitingUnstake, refetchStake, refetchRewards, refetchBalance]);

    useEffect(() => {
        if (claimHash && !isWaitingClaim) {
            refetchStake();
            refetchRewards();
            refetchBalance();
        }
    }, [claimHash, isWaitingClaim, refetchStake, refetchRewards, refetchBalance]);

    useEffect(() => {
        if (approveHash && !isWaitingApprove) {
            refetchAllowance();
        }
    }, [approveHash, isWaitingApprove, refetchAllowance]);

    const handleStake = async () => {
        if (!address || !stakeAmount || parseFloat(stakeAmount) <= 0) return;

        const amount = parseEther(stakeAmount);
        const lockDaysNum = parseInt(lockDays) || 0;

        // Check if approval is needed
        const neededAllowance = amount;
        const currentAllowance = (allowance as bigint) || 0n;

        if (currentAllowance < neededAllowance) {
            // Approve first
            writeApprove({
                address: keepTokenAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [keepStakingAddress, amount],
            });
            return;
        }

        // Stake
        writeStake({
            address: keepStakingAddress,
            abi: stakingAbi,
            functionName: 'stake',
            args: [amount, BigInt(lockDaysNum)],
        });
    };

    const handleUnstake = async () => {
        if (!address || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;

        const amount = parseEther(unstakeAmount);
        writeUnstake({
            address: keepStakingAddress,
            abi: stakingAbi,
            functionName: 'unstake',
            args: [amount],
        });
    };

    const handleClaim = async () => {
        if (!address) return;

        writeClaim({
            address: keepStakingAddress,
            abi: stakingAbi,
            functionName: 'claimRewards',
            args: [],
        });
    };

    const stakedAmount = userStake ? (userStake as any).amount : 0n;
    const lockExpiry = userStake ? (userStake as any).lockExpiry : 0n;
    const lockMultiplier = userStake ? (userStake as any).lockMultiplier : 0n;
    const isLocked = lockExpiry > 0n && BigInt(Math.floor(Date.now() / 1000)) < lockExpiry;
    const lockDate = lockExpiry > 0n ? new Date(Number(lockExpiry) * 1000).toLocaleDateString() : null;

    const pendingRewardsAmount = (pendingRewards as bigint) || 0n;
    const currentAllowance = (allowance as bigint) || 0n;
    const needsApproval = stakeAmount && parseFloat(stakeAmount) > 0 && currentAllowance < parseEther(stakeAmount);

    if (!isConnected) {
        return (
            <PixelBox variant="dark" className="p-3">
                <div className="text-[10px] text-zinc-400 text-center uppercase tracking-wider">
                    Connect wallet to stake KEEP
                </div>
            </PixelBox>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <PixelBox variant="dark" className="p-2">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2 text-center">
                    KEEP Staking
                </div>
            </PixelBox>

            {/* Staked Info */}
            <PixelBox variant="dark" className="p-2">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-zinc-400 uppercase">Staked</span>
                        <span className="text-[10px] text-yellow-400 font-bold font-mono">
                            {formatEther(stakedAmount)}
                        </span>
                    </div>
                    {lockExpiry > 0n && (
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-zinc-400 uppercase">Locked Until</span>
                            <span className={`text-[9px] font-mono ${isLocked ? 'text-orange-400' : 'text-green-400'}`}>
                                {isLocked ? lockDate : 'Unlocked'}
                            </span>
                        </div>
                    )}
                    {lockMultiplier > 0n && (
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-zinc-400 uppercase">Multiplier</span>
                            <span className="text-[9px] text-green-400 font-mono">
                                {parseFloat(formatEther(lockMultiplier)).toFixed(2)}x
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-zinc-400 uppercase">Pending Rewards</span>
                        <span className="text-[10px] text-green-400 font-bold font-mono">
                            {formatEther(pendingRewardsAmount)}
                        </span>
                    </div>
                </div>
            </PixelBox>

            {/* Claim Rewards */}
            {pendingRewardsAmount > 0n && (
                <PixelButton
                    onClick={handleClaim}
                    disabled={isClaiming || isWaitingClaim}
                    variant="primary"
                    className="w-full h-8 text-[9px] font-bold uppercase tracking-wider"
                >
                    {isClaiming || isWaitingClaim ? (
                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : (
                        `Claim ${formatEther(pendingRewardsAmount)} KEEP`
                    )}
                </PixelButton>
            )}

            {/* Stake Section */}
            <PixelBox variant="dark" className="p-2">
                <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-1.5">Stake KEEP</div>
                <div className="space-y-1.5">
                    <div className="flex gap-1">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 px-2 py-1 bg-black/50 border border-white/10 rounded text-[10px] text-yellow-400 font-mono focus:outline-none focus:border-yellow-400/50"
                        />
                        <PixelButton
                            onClick={() => setStakeAmount(formatEther(keepBalance))}
                            variant="wood"
                            size="sm"
                            className="text-[8px] px-2"
                        >
                            MAX
                        </PixelButton>
                    </div>
                    <div className="flex gap-1">
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="365"
                            value={lockDays}
                            onChange={(e) => setLockDays(e.target.value)}
                            placeholder="Lock days (0-365)"
                            className="flex-1 px-2 py-1 bg-black/50 border border-white/10 rounded text-[10px] text-zinc-300 font-mono focus:outline-none focus:border-yellow-400/50"
                        />
                    </div>
                    <div className="text-[7px] text-zinc-500">
                        Available: {formatEther(keepBalance)} KEEP
                    </div>
                    <PixelButton
                        onClick={handleStake}
                        disabled={
                            !stakeAmount ||
                            parseFloat(stakeAmount) <= 0 ||
                            parseEther(stakeAmount) > keepBalance ||
                            isStaking ||
                            isWaitingStake ||
                            isApproving ||
                            isWaitingApprove
                        }
                        variant={needsApproval ? "neutral" : "primary"}
                        className="w-full h-8 text-[9px] font-bold uppercase tracking-wider"
                    >
                        {isApproving || isWaitingApprove ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        ) : isStaking || isWaitingStake ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        ) : needsApproval ? (
                            'Approve KEEP'
                        ) : (
                            'Stake'
                        )}
                    </PixelButton>
                </div>
            </PixelBox>

            {/* Unstake Section */}
            {stakedAmount > 0n && (
                <PixelBox variant="dark" className="p-2">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-1.5">Unstake KEEP</div>
                    <div className="space-y-1.5">
                        <div className="flex gap-1">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unstakeAmount}
                                onChange={(e) => setUnstakeAmount(e.target.value)}
                                placeholder="0.00"
                                className="flex-1 px-2 py-1 bg-black/50 border border-white/10 rounded text-[10px] text-yellow-400 font-mono focus:outline-none focus:border-yellow-400/50"
                            />
                            <PixelButton
                                onClick={() => setUnstakeAmount(formatEther(stakedAmount))}
                                variant="wood"
                                size="sm"
                                className="text-[8px] px-2"
                            >
                                MAX
                            </PixelButton>
                        </div>
                        {isLocked && (
                            <div className="text-[7px] text-orange-400">
                                ⚠️ Locked until {lockDate}
                            </div>
                        )}
                        <PixelButton
                            onClick={handleUnstake}
                            disabled={
                                !unstakeAmount ||
                                parseFloat(unstakeAmount) <= 0 ||
                                parseEther(unstakeAmount) > stakedAmount ||
                                isLocked ||
                                isUnstaking ||
                                isWaitingUnstake
                            }
                            variant="danger"
                            className="w-full h-8 text-[9px] font-bold uppercase tracking-wider"
                        >
                            {isUnstaking || isWaitingUnstake ? (
                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                            ) : (
                                'Unstake'
                            )}
                        </PixelButton>
                    </div>
                </PixelBox>
            )}

            {/* Total Staked Info */}
            {totalWeightedStake && (
                <PixelBox variant="dark" className="p-2">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider text-center">
                        Total Weighted Stake: {formatEther(totalWeightedStake as bigint)}
                    </div>
                </PixelBox>
            )}
        </div>
    );
}

