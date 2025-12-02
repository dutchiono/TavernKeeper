'use client';

import React, { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { getMonPrice } from '../lib/services/monPriceService';
import { OfficeState, tavernKeeperService } from '../lib/services/tavernKeeperService';
import { CellarState, theCellarService } from '../lib/services/theCellarService';
import { PixelBox, PixelButton } from './PixelComponents';
import TheCellarView from './TheCellarView';

interface TheOfficeViewProps {
    state: OfficeState;
    timeHeld: string;
    keepBalance: string;
    monBalance?: string;
    isLoading: boolean;
    walletReady: boolean;
    isWalletConnected: boolean;
    isWrongNetwork?: boolean;
    onTakeOffice: () => Promise<void>;
    onClaim?: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
    children?: React.ReactNode;
    pnl?: string;
    isKing?: boolean;
    walletAddress?: string;
    viewMode?: 'office' | 'cellar';
    onViewSwitch?: (view: 'office' | 'cellar') => void;
}

export const TheOfficeView: React.FC<TheOfficeViewProps> = ({
    state,
    timeHeld,
    keepBalance,
    monBalance = "0",
    isLoading,
    walletReady,
    isWalletConnected,
    isWrongNetwork,
    onTakeOffice,
    onClaim,
    children,
    pnl,
    isKing = false,
    walletAddress,
    viewMode = 'office',
    onViewSwitch,
}) => {
    const [mounted, setMounted] = React.useState(false);
    const [cellarState, setCellarState] = React.useState<CellarState | null>(null);
    const [contractPrice, setContractPrice] = useState<string | null>(null);
    const [monPrice, setMonPrice] = useState<string>('Loading...');
    const [monPriceUsd, setMonPriceUsd] = useState<number>(0.03);
    const [priceStable, setPriceStable] = useState<string>('0');

    React.useEffect(() => {
        setMounted(true);

        const fetchCellar = async () => {
            try {
                const data = await theCellarService.getCellarState();
                setCellarState(data);
            } catch (e) {
                console.error("Failed to fetch cellar", e);
            }
        };

        fetchCellar();
        const interval = setInterval(fetchCellar, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch MON price periodically
    useEffect(() => {
        const fetchMonPrice = async () => {
            try {
                const price = await getMonPrice();
                setMonPriceUsd(price);
                setMonPrice(`$${price.toFixed(5)}`); // Show 5 decimals for precision
            } catch (e) {
                console.error('Failed to fetch MON price:', e);
                // Show error state instead of hardcoded value
                setMonPrice('Error loading');
                // Keep using last known price if available (monPriceUsd state persists)
                // If monPriceUsd is still 0, calculations will show errors which is correct
            }
        };
        fetchMonPrice();
        const interval = setInterval(fetchMonPrice, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []); // Only run on mount, then use interval

    // Stabilize price to prevent flickering - use debounced value
    // Contract enforces MIN_INIT_PRICE = 1 MON, so price should never be 0
    useEffect(() => {
        const priceNum = parseFloat(state.currentPrice || '0');
        const MIN_PRICE = 0.5; // Allow some buffer below 1 MON for display, but contract enforces 1 MON minimum

        if (priceNum >= MIN_PRICE) {
            // Debounce: only update if price hasn't changed for 500ms
            const timer = setTimeout(() => {
                setPriceStable(state.currentPrice);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // If price is below minimum, it might be a fetch error - keep last known good price
            // Don't set to '0' immediately, wait to see if contract price fetch succeeds
            if (priceStable === '0' || parseFloat(priceStable) < MIN_PRICE) {
                // Only set to 0 if we don't have a good price and contract fetch also fails
                const timer = setTimeout(() => {
                    if (!contractPrice || Number(contractPrice) < MIN_PRICE) {
                        setPriceStable('0');
                    }
                }, 2000); // Wait 2 seconds to see if contract fetch provides a price
                return () => clearTimeout(timer);
            }
        }
    }, [state.currentPrice, contractPrice, priceStable]);

    // Fetch contract price directly from chain periodically
    useEffect(() => {
        if (!mounted) return; // Don't fetch until mounted

        const fetchContractPrice = async () => {
            try {
                const officeState = await tavernKeeperService.getOfficeState();
                const contractPriceValue = parseFloat(officeState.currentPrice || '0');

                if (contractPriceValue > 0.0001) {
                    setContractPrice(officeState.currentPrice);
                } else {
                    setContractPrice(null);
                }
            } catch (e) {
                console.error('Failed to fetch contract price:', e);
                // Fallback to state price if direct fetch fails
                const contractPriceValue = parseFloat(priceStable || '0');
                if (contractPriceValue > 0.0001) {
                    setContractPrice(priceStable);
                } else {
                    setContractPrice(null);
                }
            }
        };
        fetchContractPrice();
        const interval = setInterval(fetchContractPrice, 10000); // Fetch every 10 seconds
        return () => clearInterval(interval);
    }, [mounted, priceStable]);

    // Prevent hydration mismatch by rendering a consistent state on server
    const buttonText = !mounted ? 'Connect Wallet' :
        isLoading ? 'Processing...' :
            !isWalletConnected ? 'Connect Wallet' :
                isWrongNetwork ? 'Switch Network' :
                    !walletReady ? 'Wallet Not Ready' :
                        'Take The Office';

    // Calculate Cellar PnL
    // Cost = Price (LP) / 3 (since 1 MON = 3 LP)
    // PnL = Pot (MON) - Cost (MON)
    let cellarPnL = "$0.00";
    let isCellarProfitable = false;

    if (cellarState) {
        const pot = parseFloat(cellarState.potSize);
        const priceLP = parseFloat(cellarState.currentPrice);
        const costMON = priceLP / 3;
        const profit = pot - costMON;

        isCellarProfitable = profit > 0;
        cellarPnL = (profit >= 0 ? "+" : "") + profit.toFixed(4) + " MON";
    }

    return (
        <div className="w-full h-full flex flex-col font-pixel relative">
            {/* Visual Area (Chat or Cellar) */}
            <div className="flex-1 relative bg-[#1a120b] overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: "url('/sprites/office_bg.png')" }}
                />

                {/* Content Overlay - Chat positioned between header and bottom panel */}
                <div className="absolute inset-0 z-30 p-4 pt-[11.5rem] pb-2">
                    {viewMode === 'office' ? (
                        <>
                            {children}
                        </>
                    ) : (
                        <TheCellarView
                            onBackToOffice={() => onViewSwitch?.('office')}
                            monBalance={monBalance}
                            keepBalance={keepBalance}
                        />
                    )}
                </div>

                {/* Top Header - Protocol Info (Office & Cellar) - Highest z-index to stay on top */}
                <div className="absolute top-0 left-0 right-0 bg-[#3e2b22] border-b-4 border-[#2a1d17] p-2 z-40 shadow-md flex flex-col gap-2">

                    {/* Error Banner */}
                    {state.error && (
                        <div className="bg-red-500 text-white text-[10px] font-bold p-1 text-center animate-pulse border-2 border-red-700">
                            ⚠️ {state.error} ⚠️
                        </div>
                    )}

                    {/* Row 1: Office Manager Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 bg-[#5c4033] rounded border-2 border-[#8c7b63] overflow-hidden relative shrink-0">
                                <div className="absolute inset-0 bg-[#8c7b63] flex items-center justify-center text-sm text-[#2a1d17]">
                                    😐
                                </div>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] text-[#a8a29e] uppercase tracking-wider truncate leading-none mb-0.5">Office Manager</span>
                                <span className="text-[#eaddcf] font-bold text-xs font-mono truncate leading-none">
                                    {state.currentKing ? `${state.currentKing.slice(0, 6)}...${state.currentKing.slice(-4)}` : 'Vacant'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-[#a8a29e] uppercase tracking-wider leading-none mb-0.5">Time Held</span>
                                <span className="text-[#eaddcf] font-bold text-xs font-mono leading-none">{timeHeld}</span>
                            </div>
                            {state.currentKing && state.currentKing !== '0x0000000000000000000000000000000000000000' && (
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] text-[#a8a29e] uppercase tracking-wider leading-none mb-0.5">Manager Earnings</span>
                                    <span className="text-[#eaddcf] font-bold text-xs font-mono leading-none">KEEP {state.totalEarned || '0.00'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Stats Grid (Office & Cellar) */}
                    <div className="grid grid-cols-3 gap-1">
                        {/* Office Stats */}
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#a8a29e] uppercase tracking-widest mb-0.5">Office Rate</div>
                            <div className="text-[#fbbf24] font-bold text-[10px]">
                                {state.officeRate && !isNaN(parseFloat(state.officeRate)) ? parseFloat(state.officeRate).toFixed(4) : '0.0000'}
                                <span className="text-[6px] text-[#78716c]">/s</span>
                            </div>
                        </div>
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#fca5a5] uppercase tracking-widest mb-0.5">Office Price</div>
                            <div className={`text-[#f87171] font-bold text-[10px] ${contractPrice && Number(contractPrice) > 0 ? '' : 'text-red-400'}`}>
                                {contractPrice && Number(contractPrice) > 0 ? (
                                    <>
                                        <span className="text-purple-400">{Number(contractPrice).toFixed(4)} MON</span>
                                        {monPriceUsd > 0 && (
                                            <>
                                                <span className="text-[#78716c]"> (~</span>
                                                <span className="text-green-400">${(Number(contractPrice) * monPriceUsd).toFixed(2)}</span>
                                                <span className="text-[#78716c]">)</span>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {parseFloat(priceStable) > 0.5 ? (
                                            <>
                                                <span className="text-purple-400">{parseFloat(priceStable).toFixed(4)} MON</span>
                                                {monPriceUsd > 0 && (
                                                    <>
                                                        <span className="text-[#78716c]"> (~</span>
                                                        <span className="text-green-400">${(parseFloat(priceStable) * monPriceUsd).toFixed(2)}</span>
                                                        <span className="text-[#78716c]">)</span>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            '0'
                                        )}
                                    </>
                                )}
                            </div>
                            {monPriceUsd > 0 && (contractPrice && Number(contractPrice) > 0 || parseFloat(priceStable) > 0.5) && (
                                <div className="text-[4px] text-[#78716c] mt-0.5 text-center leading-tight">
                                    1 MON = {monPrice}
                                </div>
                            )}
                        </div>
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#86efac] uppercase tracking-widest mb-0.5">Office PNL</div>
                            <div className={`font-bold text-[10px] ${pnl && pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{pnl || '$0.00'}</div>
                        </div>

                        {/* Cellar Stats */}
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#a8a29e] uppercase tracking-widest mb-0.5">Cellar Pot</div>
                            <div className="text-[#fbbf24] font-bold text-[10px]">{cellarState ? parseFloat(cellarState.potSize).toFixed(4) : '0.00'} <span className="text-[6px] text-[#78716c]">MON</span></div>
                        </div>
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#fca5a5] uppercase tracking-widest mb-0.5">Cellar Price</div>
                            <div className="text-[#f87171] font-bold text-[10px]">{cellarState ? parseFloat(cellarState.currentPrice).toFixed(2) : '0.00'} <span className="text-[6px] text-[#78716c]">LP</span></div>
                        </div>
                        <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
                            <div className="text-[6px] text-[#86efac] uppercase tracking-widest mb-0.5">Cellar PNL</div>
                            <div className={`font-bold text-[10px] ${isCellarProfitable ? 'text-green-400' : 'text-red-400'}`}>{cellarPnL}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Control Panel - Only show in Office Mode */}
            {viewMode === 'office' && (
                <div className="shrink-0 z-20">
                    <PixelBox variant="wood" className="!p-0 overflow-hidden shadow-2xl">

                        {/* Player Stats & Action Area */}
                        <div className="bg-[#3e2b22] p-2 shrink-0 flex flex-col gap-2">

                            {/* Player Stats Bar */}
                            <div className="flex justify-between items-center bg-[#2a1d17] rounded p-1.5 border border-[#5c4033]">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[6px] text-[#a8a29e] uppercase leading-none mb-0.5">Your Balance</span>
                                    <div className="flex gap-2">
                                        <span className="text-[#eaddcf] font-bold text-[10px] leading-none">KEEP {parseFloat(formatEther(BigInt(keepBalance))).toFixed(2)}</span>
                                        <span className="text-[#eaddcf] font-bold text-[10px] leading-none">MON {parseFloat(formatEther(BigInt(monBalance))).toFixed(4)}</span>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-[#5c4033]"></div>
                                <div className="flex flex-col items-end justify-center">
                                    <span className="text-[6px] text-[#a8a29e] uppercase leading-none mb-0.5">
                                        Pending Rewards
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[#eaddcf] font-bold text-[10px] leading-none">
                                            KEEP {isKing ? (state.totalEarned || '0.00') : '0.00'}
                                        </span>
                                        {isKing && onClaim && (
                                            <PixelButton
                                                onClick={onClaim}
                                                disabled={isLoading}
                                                variant="primary"
                                                className="!py-0.5 !px-1.5 !text-[8px] !h-auto"
                                            >
                                                CLAIM
                                            </PixelButton>
                                        )}
                                    </div>
                                    {isKing && (
                                        <span className="text-[6px] text-green-400 leading-none mt-0.5">(You)</span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons - Split Take Office / Raid Cellar */}
                            {isWalletConnected ? (
                                <div className="flex gap-2">
                                    <PixelButton
                                        onClick={onTakeOffice}
                                        disabled={isLoading || !walletReady}
                                        variant="danger"
                                        className="flex-1 !py-2 !text-xs shadow-lg flex items-center justify-center"
                                    >
                                        {buttonText}
                                    </PixelButton>
                                    <PixelButton
                                        onClick={() => onViewSwitch?.('cellar')}
                                        variant="secondary"
                                        className="flex-1 !py-2 !text-xs shadow-lg flex items-center justify-center"
                                    >
                                        RAID CELLAR
                                    </PixelButton>
                                </div>
                            ) : (
                                <div className="text-center py-1">
                                    <span className="text-[10px] text-[#a8a29e] italic">Connect wallet to play</span>
                                </div>
                            )}
                        </div>
                    </PixelBox>
                </div>
            )}
        </div>
    );
};
