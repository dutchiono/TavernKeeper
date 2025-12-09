'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';
import { getUserByAddress } from '../lib/services/neynarService';
import { PixelBox } from './PixelComponents';

interface StakerInfo {
    address: string;
    amount: bigint;
    weightedStake: bigint;
    username?: string;
}

const KEEP_STAKING_ABI = [
    {
        inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
        name: 'getUserStake',
        outputs: [
            {
                components: [
                    { internalType: 'uint256', name: 'amount', type: 'uint256' },
                    { internalType: 'uint256', name: 'lockExpiry', type: 'uint256' },
                    { internalType: 'uint256', name: 'lockMultiplier', type: 'uint256' },
                    { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
                ],
                internalType: 'struct KEEPStaking.StakeInfo',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const LOCK_MULTIPLIER_SCALE = 1e18;

export default function EmployeesOfTheMonth() {
    const publicClient = usePublicClient();
    const [topStakers, setTopStakers] = useState<StakerInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTopStakers = async () => {
            try {
                const response = await fetch('/api/staking/top-stakers');
                if (response.ok) {
                    const data = await response.json();
                    if (data.stakers && Array.isArray(data.stakers)) {
                        setTopStakers(data.stakers);
                    }
                }
            } catch (error) {
                console.error('Error fetching top stakers:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTopStakers();

        // Refresh every 60 seconds
        const interval = setInterval(fetchTopStakers, 60000);
        return () => clearInterval(interval);
    }, []);

    // Format address for display
    const formatAddress = (address: string): string => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (isLoading) {
        return (
            <PixelBox variant="dark" className="p-3">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2">
                    Employees of the Month
                </div>
                <div className="text-[9px] text-zinc-400 text-center">Loading...</div>
            </PixelBox>
        );
    }

    if (topStakers.length === 0) {
        return (
            <PixelBox variant="dark" className="p-3">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2">
                    Employees of the Month
                </div>
                <div className="text-[9px] text-zinc-500 text-center italic">
                    No stakers yet. Be the first to stake KEEP!
                </div>
            </PixelBox>
        );
    }

    return (
        <PixelBox variant="dark" className="p-3">
            <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2">
                Employees of the Month
            </div>
            <div className="space-y-1.5">
                {topStakers.slice(0, 5).map((staker, index) => (
                    <div
                        key={staker.address}
                        className="flex items-center justify-between bg-[#2a1d17] border border-[#5c4033] rounded p-1.5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-[#5c4033] rounded border border-[#8c7b63] flex items-center justify-center text-[8px] font-bold text-[#eaddcf] shrink-0">
                                {index + 1}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-[#eaddcf] leading-none">
                                    {staker.username ? `@${staker.username}` : formatAddress(staker.address)}
                                </span>
                                {staker.username && (
                                    <span className="text-[7px] text-zinc-500 leading-none font-mono">
                                        {formatAddress(staker.address)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-bold text-yellow-400 leading-none">
                                {parseFloat(formatEther(staker.amount)).toFixed(2)} KEEP
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PixelBox>
    );
}

