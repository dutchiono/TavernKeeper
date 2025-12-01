'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { monad } from '../../lib/chains';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cm456578004s1129384756'}
            config={{
                loginMethods: ['wallet'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#676FFF',
                },
                supportedChains: [monad],
            }}
        >
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </PrivyProvider>
    );
}
