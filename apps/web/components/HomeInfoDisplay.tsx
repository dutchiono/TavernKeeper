'use client';

import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { createPublicClient, http } from 'viem';
import { monad } from '../lib/chains';
import { CONTRACT_REGISTRY, getContractAddress } from '../lib/contracts/registry';
import { keepTokenService } from '../lib/services/keepToken';
import { theCellarService } from '../lib/services/theCellarService';
import { PixelBox } from './PixelComponents';

interface HomeInfoDisplayProps {
    address: string | undefined;
}

export const HomeInfoDisplay: React.FC<HomeInfoDisplayProps> = ({ address }) => {
    const [lpBalance, setLpBalance] = useState<bigint>(0n);
    const [monBalance, setMonBalance] = useState<bigint>(0n);
    const [keepBalance, setKeepBalance] = useState<string>('0');
    const [cellarPot, setCellarPot] = useState<string>('0');
    const [cellarPrice, setCellarPrice] = useState<string>('0');

    useEffect(() => {
        if (!address) {
            setLpBalance(0n);
            setMonBalance(0n);
            setKeepBalance('0');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch LP Balance
                const lp = await theCellarService.getUserLpBalance(address);
                setLpBalance(lp);

                // Fetch KEEP Balance
                const keep = await keepTokenService.getBalance(address);
                setKeepBalance(keep);

                // Fetch MON Balance (native token)
                const publicClient = createPublicClient({
                    chain: monad,
                    transport: http(),
                });
                const mon = await publicClient.getBalance({ address: address as `0x${string}` });
                setMonBalance(mon);

                // Fetch Cellar State
                const cellarState = await theCellarService.getCellarState();
                setCellarPot(cellarState.potSize);
                setCellarPrice(cellarState.currentPrice);
            } catch (error) {
                console.error('Failed to fetch home info:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [address]);

    return (
        <div className="w-full p-2 space-y-2">
            {/* Token Balances */}
            <div className="grid grid-cols-3 gap-2">
                <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">LP</div>
                    <div className="text-[#f87171] font-bold text-xs font-mono">
                        {parseFloat(formatEther(lpBalance)).toFixed(2)}
                    </div>
                </PixelBox>
                <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">MON</div>
                    <div className="text-[#fbbf24] font-bold text-xs font-mono">
                        {parseFloat(formatEther(monBalance)).toFixed(4)}
                    </div>
                </PixelBox>
                <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">KEEP</div>
                    <div className="text-[#eaddcf] font-bold text-xs font-mono">
                        {parseFloat(formatEther(BigInt(keepBalance))).toFixed(2)}
                    </div>
                </PixelBox>
            </div>

            {/* Cellar Info */}
            <div className="grid grid-cols-2 gap-2">
                <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">Pot Size</div>
                    <div className="text-yellow-400 font-bold text-xs font-mono">
                        {parseFloat(cellarPot).toFixed(4)} MON
                    </div>
                </PixelBox>
                <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center">
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">Cellar Price</div>
                    <div className="text-orange-400 font-bold text-xs font-mono">
                        {parseFloat(cellarPrice).toFixed(2)} LP
                    </div>
                </PixelBox>
            </div>
        </div>
    );
};
