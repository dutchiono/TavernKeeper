'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { tavernKeeperService, OfficeState } from '../lib/services/tavernKeeperService';
import { PixelBox, PixelButton, PixelCard } from './PixelComponents';

export const TheOffice: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const [state, setState] = useState<OfficeState>({
        currentKing: 'Loading...',
        currentPrice: '0.00',
        kingSince: Date.now(),
        officeRate: '0',
        officeRateUsd: '$0.00',
        priceUsd: '$0.00',
        totalEarned: '0',
        totalEarnedUsd: '$0.00'
    });
    const [isLoading, setIsLoading] = useState(false);

    const [timeHeld, setTimeHeld] = useState<string>('0m 0s');

    // Fetch Office State
    const fetchOfficeState = async () => {
        const data = await tavernKeeperService.getOfficeState();
        setState(data);
    };

    useEffect(() => {
        fetchOfficeState();
        const interval = setInterval(fetchOfficeState, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = Date.now() - state.kingSince;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeHeld(`${minutes}m ${seconds}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [state.kingSince]);

    const handleTakeOffice = async () => {
        if (!walletClient) {
            alert('Please connect your wallet first!');
            return;
        }

        try {
            setIsLoading(true);
            const hash = await tavernKeeperService.takeOffice(walletClient, state.currentPrice);
            console.log('Transaction sent:', hash);
            alert('Transaction sent! Waiting for confirmation...');
            // Optimistic update or wait for receipt could be added here
        } catch (error) {
            console.error('Failed to take office:', error);
            alert('Failed to take office. See console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto font-pixel flex flex-col h-full max-h-full">
            {/* Main Container - Wood Style */}
            <PixelBox variant="wood" className="flex flex-col h-full p-0 gap-0 overflow-hidden !p-0 border-0" title="The Office">

                {/* Header / King Info - Parchment Style */}
                <div className="bg-[#eaddcf] border-b-4 border-[#8c7b63] p-3 relative shrink-0">
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8c7b63] p-0.5 rounded-sm border-2 border-[#5c4033] overflow-hidden shadow-inner">
                                {/* Avatar Placeholder */}
                                <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${state.currentKing}`} alt="King" className="w-full h-full bg-[#d4c5b0]" />
                            </div>
                            <div>
                                <div className="text-[8px] text-[#8c7b63] uppercase tracking-widest font-bold mb-0.5">Office Manager</div>
                                <div className="text-[#3e2b22] font-bold text-xs truncate w-24">{state.currentKing}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[8px] text-[#8c7b63] uppercase tracking-widest font-bold mb-0.5">Time Held</div>
                            <div className="text-[#3e2b22] font-bold text-sm font-mono">{timeHeld}</div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-[#d4c5b0] relative z-10">
                        <div>
                            <div className="text-[8px] text-[#8c7b63] uppercase font-bold">Earned</div>
                            <div className="text-[#b45309] font-bold text-xs">KEEP {state.totalEarned} <span className="text-[#8c7b63] text-[8px] ml-1">{state.totalEarnedUsd}</span></div>
                        </div>
                    </div>
                </div>

                {/* Visual Area (The Office View) - Now holds the CHAT */}
                <div className="relative flex-1 bg-[#2a1d17] overflow-hidden flex flex-col min-h-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    {/* Chat Container */}
                    <div className="relative z-10 flex-1 flex flex-col min-h-0">
                        {children}
                    </div>
                </div>

                {/* Stats Grid - Dark Wood */}
                <div className="grid grid-cols-2 gap-2 bg-[#3e2b22] border-t-4 border-[#2a1d17] p-2 shrink-0">
                    <div className="bg-[#2a1d17] border-2 border-[#5c4033] rounded p-2 shadow-inner">
                        <div className="text-[8px] text-[#a8a29e] uppercase tracking-widest mb-0.5">Earning Rate</div>
                        <div className="text-[#fbbf24] font-bold text-sm">KEEP {state.officeRate}<span className="text-[10px] text-[#78716c]">/s</span></div>
                        <div className="text-[8px] text-[#78716c]">{state.officeRateUsd}/s</div>
                    </div>
                    <div className="bg-[#2a1d17] border-2 border-[#5c4033] rounded p-2 shadow-inner">
                        <div className="text-[8px] text-[#fca5a5] uppercase tracking-widest mb-0.5">Takeover Price</div>
                        <div className="text-[#f87171] font-bold text-sm">Ξ {state.currentPrice}</div>
                        <div className="text-[8px] text-[#78716c]">{state.priceUsd}</div>
                    </div>
                </div>

                {/* Action Button Area */}
                <div className="bg-[#3e2b22] p-3 pt-0 shrink-0">
                    <PixelButton
                        onClick={handleTakeOffice}
                        disabled={isLoading}
                        variant="danger"
                        className="w-full !py-3 !text-sm shadow-lg"
                    >
                        {isLoading ? 'Processing...' : 'Take The Office'}
                    </PixelButton>

                    {/* User Balance Footer */}
                    <div className="flex justify-between items-center mt-2 text-[8px] text-[#a8a29e] px-2 font-mono">
                        <div className="flex flex-col items-center">
                            <span className="mb-0.5">Your Balance</span>
                            <span className="text-[#eaddcf] font-bold">KEEP 0</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-0.5">Spent</span>
                            <span className="text-[#eaddcf] font-bold">Ξ 0</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-0.5">Earned</span>
                            <span className="text-[#eaddcf] font-bold">KEEP 0</span>
                        </div>
                    </div>
                </div>
            </PixelBox>
        </div>
    );
};
