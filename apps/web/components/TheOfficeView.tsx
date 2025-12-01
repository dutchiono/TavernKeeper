'use client';

import React from 'react';
import { formatEther } from 'viem';
import { OfficeState } from '../lib/services/tavernKeeperService';
import { PixelBox, PixelButton } from './PixelComponents';

interface TheOfficeViewProps {
    state: OfficeState;
    timeHeld: string;
    keepBalance: string;
    isLoading: boolean;
    walletReady: boolean;
    isWalletConnected: boolean;
    isWrongNetwork?: boolean;
    onTakeOffice: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
    children?: React.ReactNode;
    pnl?: string;
    isKing?: boolean;
}

export const TheOfficeView: React.FC<TheOfficeViewProps> = ({
    state,
    timeHeld,
    keepBalance,
    isLoading,
    walletReady,
    isWalletConnected,
    isWrongNetwork,
    onTakeOffice,
    children,
    pnl,
    isKing = false,
}) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch by rendering a consistent state on server
    const buttonText = !mounted ? 'Connect Wallet' :
        isLoading ? 'Processing...' :
            !isWalletConnected ? 'Connect Wallet' :
                isWrongNetwork ? 'Switch Network' :
                    !walletReady ? 'Wallet Not Ready' :
                        'Take The Office';

    return (
        <div className="w-full h-full flex flex-col font-pixel relative">
            {/* Visual Area (Chat) */}
            <div className="flex-1 relative bg-[#1a120b] overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: "url('/sprites/office_bg.png')" }}
                />

                {/* Chat Overlay */}
                <div className="absolute inset-0 z-10 p-4 pb-20">
                    {children}
                </div>

                {/* Top Header - Office Manager Info */}
                <div className="absolute top-0 left-0 right-0 bg-[#3e2b22] border-b-4 border-[#2a1d17] p-2 flex items-center justify-between z-20 shadow-md">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#5c4033] rounded border border-[#8c7b63] overflow-hidden relative">
                            {/* Avatar Placeholder */}
                            <div className="absolute inset-0 bg-[#8c7b63] flex items-center justify-center text-[8px] text-[#2a1d17]">
                                😐
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] text-[#a8a29e] uppercase tracking-wider">Office Manager</span>
                            <span className="text-[#eaddcf] font-bold text-xs font-mono">
                                {state.currentKing ? `${state.currentKing.slice(0, 6)}...${state.currentKing.slice(-4)}` : 'Vacant'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-[#a8a29e] uppercase tracking-wider">Time Held</span>
                        <span className="text-[#eaddcf] font-bold text-xs font-mono">{timeHeld}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Control Panel */}
            <div className="shrink-0 z-30">
                <PixelBox variant="wood" className="!p-0 overflow-hidden shadow-2xl">

                    {/* Stats Grid - Dark Wood */}
                    <div className="grid grid-cols-3 gap-2 bg-[#3e2b22] border-t-4 border-[#2a1d17] p-2 shrink-0">
                        <div className="bg-[#2a1d17] border-2 border-[#5c4033] rounded p-2 shadow-inner flex flex-col items-center justify-center">
                            <div className="text-[8px] text-[#a8a29e] uppercase tracking-widest mb-0.5">Rate</div>
                            <div className="text-[#fbbf24] font-bold text-xs whitespace-nowrap">{state.officeRate}<span className="text-[8px] text-[#78716c]">/s</span></div>
                        </div>
                        <div className="bg-[#2a1d17] border-2 border-[#5c4033] rounded p-2 shadow-inner flex flex-col items-center justify-center">
                            <div className="text-[8px] text-[#fca5a5] uppercase tracking-widest mb-0.5">Price</div>
                            <div className="text-[#f87171] font-bold text-xs whitespace-nowrap">Ξ {state.currentPrice}</div>
                        </div>
                        <div className="bg-[#2a1d17] border-2 border-[#5c4033] rounded p-2 shadow-inner flex flex-col items-center justify-center">
                            <div className="text-[8px] text-[#86efac] uppercase tracking-widest mb-0.5">PNL</div>
                            <div className={`font-bold text-xs whitespace-nowrap ${pnl && pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{pnl || '$0.00'}</div>
                        </div>
                    </div>

                    {/* Player Stats & Action Area */}
                    <div className="bg-[#3e2b22] p-3 pt-0 shrink-0 flex flex-col gap-2">

                        {/* Player Stats Bar */}
                        <div className="flex justify-between items-center bg-[#2a1d17] rounded p-2 border border-[#5c4033]">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-[#a8a29e] uppercase">Your Balance</span>
                                <span className="text-[#eaddcf] font-bold text-xs">KEEP {parseFloat(formatEther(BigInt(keepBalance))).toFixed(2)}</span>
                            </div>
                            <div className="h-6 w-px bg-[#5c4033]"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-[#a8a29e] uppercase">Your Earnings</span>
                                <span className="text-[#eaddcf] font-bold text-xs">KEEP {isKing ? state.totalEarned : '0.00'}</span>
                            </div>
                        </div>

                        <PixelButton
                            onClick={onTakeOffice}
                            disabled={isLoading || !walletReady || !isWalletConnected}
                            variant="danger"
                            className="w-full !py-3 !text-sm shadow-lg"
                        >
                            {buttonText}
                        </PixelButton>
                    </div>
                </PixelBox>
            </div>
        </div>
    );
};
