'use client';


import { AuthProvider } from '../../components/providers/AuthProvider';
import { Web3Provider } from '../../components/providers/Web3Provider';

export default function WebLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Web3Provider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </Web3Provider>
    );
}
