'use client';

import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom } from 'viem';
import { OfficeState, tavernKeeperService } from '../lib/services/tavernKeeperService';
import { useGameStore } from '../lib/stores/gameStore';
import { monad } from '../lib/chains';
import { TheOfficeView } from './TheOfficeView';

export const TheOffice: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
            // Price decays linearly from initPrice to 0 over 1 hour (3600s)
            const EPOCH_PERIOD = 3600;
            const initPrice = parseFloat(state.initPrice || '0');
            let currentPrice = 0;

            if (timeSinceStart < EPOCH_PERIOD) {
                currentPrice = initPrice * (1 - timeSinceStart / EPOCH_PERIOD);
            }
            // Ensure non-negative
            currentPrice = Math.max(0, currentPrice);

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
            // Refresh office state after transaction
            setTimeout(() => fetchOfficeState(), 2000);
        } catch (error) {
            console.error('Failed to take office:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to take office: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const isKing = address && state.currentKing && address.toLowerCase() === state.currentKing.toLowerCase();

    return (
        <TheOfficeView
            state={interpolatedState}
            timeHeld={timeHeld}
            keepBalance={keepBalance}
            isLoading={isLoading}
            walletReady={isConnected}
            isWalletConnected={isConnected}
            isWrongNetwork={isConnected && chainId !== monad.id}
            onTakeOffice={handleTakeOffice}
            onDisconnect={() => logout()}
            pnl={pnl}
            isKing={!!isKing}
        >
            {children}
        </TheOfficeView>
    );
};
