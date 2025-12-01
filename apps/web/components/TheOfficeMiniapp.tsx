'use client';

import React, { useEffect, useState } from 'react';
import { getContextualWalletClient, isFarcasterWalletConnected, getFarcasterWalletAddress } from '../lib/services/farcasterWallet';
import { OfficeState, tavernKeeperService } from '../lib/services/tavernKeeperService';
import { useGameStore } from '../lib/stores/gameStore';
import { TheOfficeView } from './TheOfficeView';

export const TheOfficeMiniapp: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { keepBalance } = useGameStore();
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
    const [walletReady, setWalletReady] = useState(false);
    const [farcasterClient, setFarcasterClient] = useState<any>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [timeHeld, setTimeHeld] = useState<string>('0m 0s');

    // Initialize Farcaster Wallet
    useEffect(() => {
        const initWallet = async () => {
            try {
                const connected = await isFarcasterWalletConnected();
                if (connected) {
                    const client = await getContextualWalletClient();
                    const walletAddress = await getFarcasterWalletAddress();

                    setFarcasterClient(client);
                    setAddress(walletAddress);
                    setWalletReady(!!client);

                    if (client) {
                        console.log('Farcaster SDK wallet ready');
                    }
                }
            } catch (error) {
                console.error('Error initializing Farcaster wallet:', error);
                setWalletReady(false);
            }
        };

        initWallet();
        const interval = setInterval(initWallet, 2000); // Poll for wallet readiness
        return () => clearInterval(interval);
    }, []);

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
        if (!farcasterClient) {
            alert('Farcaster wallet not ready. Please ensure you are connected in the miniapp.');
            return;
        }

        if (!address) {
            alert('Could not determine wallet address.');
            return;
        }

        await executeTakeOffice(farcasterClient, address);
    };

    const executeTakeOffice = async (client: any, clientAddress: string) => {
        try {
            setIsLoading(true);
            console.log('Using client:', client);
            console.log('Address:', clientAddress);

            const hash = await tavernKeeperService.takeOffice(client, state.currentPrice, clientAddress);
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

    return (
        <TheOfficeView
            state={state}
            timeHeld={timeHeld}
            keepBalance={keepBalance}
            isLoading={isLoading}
            walletReady={walletReady}
            isWalletConnected={!!address}
            onTakeOffice={handleTakeOffice}
        >
            {children}
            {/* Debug Info Overlay */}
            <div className="absolute top-0 left-0 w-full bg-black/80 text-[8px] text-green-400 p-2 pointer-events-none z-50 font-mono">
                <div>SDK: {farcasterClient ? 'Ready' : 'Not Found'}</div>
                <div>Addr: {address ? address.slice(0, 6) + '...' : 'None'}</div>
                <div>Ready: {walletReady ? 'Yes' : 'No'}</div>
            </div>
        </TheOfficeView>
    );
};
