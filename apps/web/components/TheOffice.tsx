'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import React, { useEffect, useState } from 'react';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { monad } from '../lib/chains';
import { OfficeState, tavernKeeperService } from '../lib/services/tavernKeeperService';
import { theCellarService } from '../lib/services/theCellarService';
import { useGameStore } from '../lib/stores/gameStore';
import { GameView } from '../lib/types';
import { TheOfficeView } from './TheOfficeView';

export const TheOffice: React.FC<{ children?: React.ReactNode; monBalance?: string; initialView?: 'office' | 'cellar' }> = ({ children, monBalance = "0", initialView = 'office' }) => {
    const { authenticated, user, logout } = usePrivy();
    const { wallets } = useWallets();
    const { keepBalance } = useGameStore();

    const wallet = wallets.find((w) => w.address === user?.wallet?.address);
    const address = user?.wallet?.address;
    const isConnected = authenticated && !!wallet;
    const chainId = wallet?.chainId ? parseInt(wallet.chainId.split(':')[1]) : undefined;

    const [state, setState] = useState<OfficeState>({
        currentKing: 'Loading...',
        currentPrice: '0.00',
        kingSince: Date.now(),
        officeRate: '0',
        officeRateUsd: '$0.00',
        priceUsd: '$0.00',
        totalEarned: '0',
        totalEarnedUsd: '$0.00',
        epochId: 0,
        startTime: 0,
        nextDps: '0',
        initPrice: '0'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [timeHeld, setTimeHeld] = useState<string>('0m 0s');

    const [interpolatedState, setInterpolatedState] = useState<OfficeState>(state);
    const [pnl, setPnl] = useState<string>('$0.00');

    // Fetch Office State
    const fetchOfficeState = async () => {
        const data = await tavernKeeperService.getOfficeState();

        // Prevent flashing: If we have valid data and the new data is an error/offline state, 
        // ignore the update to keep the UI stable.
        if (state.currentKing !== 'Loading...' && data.currentKing === 'OFFLINE') {
            console.warn("Background fetch failed, preserving existing state.");
            return;
        }

        setState(data);
        setInterpolatedState(data); // Reset interpolation on fetch
    };

    useEffect(() => {
        fetchOfficeState();
        const interval = setInterval(fetchOfficeState, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    // Interpolation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceStart = (now - state.kingSince) / 1000; // seconds

            // 1. Time Held
            const minutes = Math.floor(timeSinceStart / 60);
            const seconds = Math.floor(timeSinceStart % 60);
            setTimeHeld(`${minutes}m ${seconds}s`);

            // 2. Interpolate Price (Dutch Auction)
            // Price decays linearly from initPrice to MIN_INIT_PRICE (1 MON) over 1 hour (3600s)
            // Contract enforces MIN_INIT_PRICE = 1 MON, so price never goes below 1 MON
            const EPOCH_PERIOD = 3600;
            const MIN_INIT_PRICE = 1.0; // Contract constant: minimum price is 1 MON
            const initPrice = parseFloat(state.initPrice || '0');
            let currentPrice = MIN_INIT_PRICE; // Default to minimum

            if (initPrice > MIN_INIT_PRICE) {
                if (timeSinceStart < EPOCH_PERIOD) {
                    // Linear decay from initPrice to MIN_INIT_PRICE
                    const priceRange = initPrice - MIN_INIT_PRICE;
                    currentPrice = initPrice - (priceRange * timeSinceStart / EPOCH_PERIOD);
                    // Ensure it doesn't go below minimum
                    currentPrice = Math.max(MIN_INIT_PRICE, currentPrice);
                } else {
                    // After epoch period, price is at minimum
                    currentPrice = MIN_INIT_PRICE;
                }
            } else if (initPrice > 0) {
                // If initPrice is set but <= MIN_INIT_PRICE, use it
                currentPrice = Math.max(MIN_INIT_PRICE, initPrice);
            } else {
                // Fallback to current fetched price if initPrice is invalid
                const fetchedPrice = parseFloat(state.currentPrice || '0');
                currentPrice = fetchedPrice > 0 ? Math.max(MIN_INIT_PRICE, fetchedPrice) : MIN_INIT_PRICE;
            }

            // 3. Interpolate Earnings
            const dps = parseFloat(state.officeRate || '0');
            const earned = timeSinceStart * dps;

            // 4. Calculate PNL
            // Cost = Price Paid. We estimate this from initPrice.
            // newInitPrice = pricePaid * 1.5. So pricePaid = initPrice / 1.5.
            const pricePaid = initPrice / 1.5;
            // Revenue = 80% of currentPrice (if someone buys now)
            const revenue = currentPrice * 0.8;
            const pnlValue = revenue - pricePaid;

            // Format PNL
            const pnlFormatted = pnlValue >= 0
                ? `+Ξ${pnlValue.toFixed(4)}`
                : `-Ξ${Math.abs(pnlValue).toFixed(4)}`;
            setPnl(pnlFormatted);

            // Update Interpolated State
            setInterpolatedState(prev => ({
                ...prev,
                currentPrice: currentPrice.toFixed(4),
                totalEarned: earned.toFixed(2)
            }));

        }, 1000);
        return () => clearInterval(interval);
    }, [state]);

    const handleTakeOffice = async () => {
        if (!address || !isConnected || !wallet) {
            alert('Please connect your wallet first!');
            return;
        }

        if (chainId !== monad.id) {
            try {
                await wallet.switchChain(monad.id);
            } catch (error) {
                console.error('Failed to switch chain:', error);
                alert('Please switch to Monad Testnet manually.');
            }
            return;
        }

        await executeTakeOffice(wallet, address);
    };

    const executeTakeOffice = async (wallet: any, clientAddress: string) => {
        try {
            setIsLoading(true);
            const provider = await wallet.getEthereumProvider();
            const client = createWalletClient({
                account: clientAddress as `0x${string}`,
                chain: monad,
                transport: custom(provider)
            });

            // Use interpolated price for the transaction
            const hash = await tavernKeeperService.takeOffice(client, interpolatedState.currentPrice, clientAddress);
            console.log('Transaction sent:', hash);
            alert('Transaction sent! Waiting for confirmation...');

            // Wait for transaction confirmation
            const publicClient = createPublicClient({
                chain: monad,
                transport: http()
            });
            await publicClient.waitForTransactionReceipt({ hash });

            // Clear cellar cache and refresh both states
            theCellarService.clearCache();
            fetchOfficeState();
        } catch (error) {
            console.error('Failed to take office:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to take office: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimRewards = async () => {
        if (!address || !isConnected || !wallet) return;

        if (chainId !== monad.id) {
            alert('Please switch to Monad Testnet manually.');
            return;
        }

        try {
            setIsLoading(true);
            const provider = await wallet.getEthereumProvider();
            const client = createWalletClient({
                account: address as `0x${string}`,
                chain: monad,
                transport: custom(provider)
            });

            const hash = await tavernKeeperService.claimOfficeRewards(client, address);
            console.log('Claim transaction sent:', hash);
            alert('Claiming rewards... Waiting for confirmation.');

            const publicClient = createPublicClient({
                chain: monad,
                transport: http()
            });
            await publicClient.waitForTransactionReceipt({ hash });

            alert('Rewards claimed successfully!');
            // Force refresh to clear cached pending rewards
            const newState = await tavernKeeperService.getOfficeState(true);
            setState(newState);
        } catch (error) {
            console.error('Failed to claim rewards:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to claim rewards: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const { switchView } = useGameStore();

    const handleViewSwitch = (view: 'office' | 'cellar') => {
        if (view === 'office') {
            switchView(GameView.INN);
        } else {
            switchView(GameView.CELLAR);
        }
    };

    const isOfficeManager = address && state.currentKing && address.toLowerCase() === state.currentKing.toLowerCase();

    return (
        <TheOfficeView
            state={interpolatedState}
            timeHeld={timeHeld}
            keepBalance={keepBalance}
            monBalance={monBalance}
            isLoading={isLoading}
            walletReady={isConnected}
            isWalletConnected={isConnected}
            isWrongNetwork={isConnected && chainId !== monad.id}
            onTakeOffice={handleTakeOffice}
            onClaim={handleClaimRewards}
            onDisconnect={() => logout()}
            pnl={pnl}
            isKing={!!isOfficeManager}
            walletAddress={address}
            viewMode={initialView}
            onViewSwitch={handleViewSwitch}
        >
            {children}
        </TheOfficeView>
    );
};
