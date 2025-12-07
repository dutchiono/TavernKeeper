'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { useConnect } from 'wagmi';
import { monad } from '../lib/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export function MiniappLifecycle() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const { connect } = useConnect();

    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                if (context) {
                    console.log('Farcaster Context:', context);

                    // Connect using the Farcaster connector
                    connect({
                        connector: farcasterMiniApp(),
                        chainId: monad.id
                    });

                    // Signal ready to parent
                    sdk.actions.ready();
                    console.log('✅ Miniapp Ready & Connected');
                }
            } catch (err) {
                console.error('Error initializing Miniapp:', err);
            }
        };

        if (sdk && !isSDKLoaded) {
            setIsSDKLoaded(true);
            load();
        }
    }, [isSDKLoaded, connect]);

    return null;
}
