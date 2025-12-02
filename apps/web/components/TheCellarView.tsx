"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http, parseEther } from "viem";
import { monad } from "../lib/chains";
import { CONTRACT_REGISTRY, getContractAddress } from "../lib/contracts/registry";
import { CellarState, theCellarService } from "../lib/services/theCellarService";
import { PixelBox, PixelButton } from "./PixelComponents";

interface TheCellarViewProps {
    onBackToOffice?: () => void;
    monBalance?: string;
    keepBalance?: string;
}

export default function TheCellarView({ onBackToOffice, monBalance = "0", keepBalance = "0" }: TheCellarViewProps = {}) {
    const { authenticated, user } = usePrivy();
    const { wallets } = useWallets();
    const [state, setState] = useState<CellarState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [lpBalance, setLpBalance] = useState<bigint>(0n);
    const [isMinting, setIsMinting] = useState(false);

    const wallet = wallets.find((w) => w.address === user?.wallet?.address);
    const address = user?.wallet?.address;
    const isConnected = authenticated && !!wallet;

    const fetchData = async () => {
        try {
            const data = await theCellarService.getCellarState();
            setState(data);

            if (address) {
                const balance = await theCellarService.getUserLpBalance(address);
                setLpBalance(balance);
            }
        } catch (error) {
            console.error("Failed to fetch cellar state", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [address]);

    const handleClaim = async () => {
        if (!address || !isConnected || !wallet) return;

        setIsClaiming(true);
        try {
            const provider = await wallet.getEthereumProvider();
            const client = createWalletClient({
                account: address as `0x${string}`,
                chain: monad,
                transport: custom(provider)
            });

            await theCellarService.claim(client, address);
        } catch (error) {
            console.error("Claim failed:", error);
        } finally {
            setIsClaiming(false);
            fetchData();
        }
    };

    const handleMintLP = async () => {
        if (!wallet || !address) return;
        const input = document.getElementById('mintAmount') as HTMLInputElement;
        const amount = input.value || "1";

        setIsMinting(true);
        try {
            const provider = await wallet.getEthereumProvider();
            const client = createWalletClient({
                account: address as `0x${string}`,
                chain: monad,
                transport: custom(provider)
            });

            const amountMON = parseEther(amount);
            const amountKEEP = parseEther((parseFloat(amount) * 3).toString()); // 1:3 Ratio

            const zapConfig = CONTRACT_REGISTRY.CELLAR_ZAP;
            const zapAddress = getContractAddress(zapConfig);
            if (!zapAddress) throw new Error("Zap contract not found");

            // Check KEEP allowance
            const allowance = await theCellarService.getKeepAllowance(address, zapAddress);
            if (allowance < amountKEEP) {
                console.log("Approving KEEP...");
                const approveHash = await theCellarService.approveKeep(client, zapAddress, amountKEEP);
                const publicClient = createPublicClient({ chain: monad, transport: http() });
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
                console.log("KEEP Approved");
            }

            console.log("Minting LP...");
            await client.writeContract({
                address: zapAddress,
                abi: zapConfig.abi,
                functionName: 'mintLP',
                args: [amountMON, amountKEEP],
                value: amountMON,
                chain: monad,
                account: address as `0x${string}`
            });

            alert("LP Minted Successfully!");
            fetchData(); // Refresh balance
        } catch (e) {
            console.error(e);
            alert("Mint failed. See console for details.");
        } finally {
            setIsMinting(false);
        }
    };

    if (!state) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const isPotEmpty = parseFloat(state.potSize) === 0;
    const currentPriceWei = state ? parseEther(state.currentPrice) : 0n;
    const hasEnoughLP = lpBalance >= currentPriceWei;

    return (
        <div className="flex flex-col gap-4 p-4 text-white font-pixel h-full justify-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                <h2 className="text-xl font-bold text-orange-400">THE CELLAR</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PixelBox variant="dark" className="p-4 flex flex-col items-center justify-center">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Pot Size</div>
                    <div className="text-xl font-bold text-yellow-400">
                        {parseFloat(state.potSize).toFixed(4)} MON
                    </div>
                </PixelBox>

                <PixelBox variant="dark" className="p-4 flex flex-col items-center justify-center">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Cellar Price</div>
                    <div className="text-xl font-bold text-orange-400">
                        {parseFloat(state.currentPrice).toFixed(2)} LP
                    </div>
                </PixelBox>
            </div>

            <div className="mt-4 pb-20"> {/* Added padding-bottom for sticky footer */}
                <PixelButton
                    onClick={handleClaim}
                    disabled={!isConnected || isClaiming || isPotEmpty || !hasEnoughLP}
                    variant="danger"
                    className={`w-full h-12 text-lg font-bold uppercase tracking-widest transition-all flex items-center justify-center ${(!isConnected || isClaiming || isPotEmpty || !hasEnoughLP) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {isClaiming ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPotEmpty ? (
                        "POT EMPTY"
                    ) : !hasEnoughLP ? (
                        "INSUFFICIENT LP"
                    ) : (
                        "RAID CELLAR 🔥"
                    )}
                </PixelButton>

                <div className="bg-[#2a1d17] rounded p-2 border border-[#5c4033] grid grid-cols-3 gap-2 mt-2">
                    <div className="flex flex-col items-center justify-center border-r border-[#5c4033] last:border-0">
                        <span className="text-[8px] text-[#a8a29e] uppercase mb-0.5 tracking-wider">LP Balance</span>
                        <span className="text-[#f87171] font-bold text-xs font-mono">
                            {parseFloat(formatEther(lpBalance)).toFixed(2)}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-r border-[#5c4033] last:border-0">
                        <span className="text-[8px] text-[#a8a29e] uppercase mb-0.5 tracking-wider">MON Balance</span>
                        <span className="text-[#fbbf24] font-bold text-xs font-mono">
                            {monBalance ? parseFloat(formatEther(BigInt(monBalance))).toFixed(4) : '0.00'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-[8px] text-[#a8a29e] uppercase mb-0.5 tracking-wider">KEEP Balance</span>
                        <span className="text-[#eaddcf] font-bold text-xs font-mono">
                            {keepBalance ? parseFloat(formatEther(BigInt(keepBalance))).toFixed(2) : '0.00'}
                        </span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-zinc-400 mb-2 text-center uppercase tracking-wider">Need LP Tokens?</div>

                    <div className="flex gap-2 mb-2">
                        <input
                            type="number"
                            placeholder="Amount MON"
                            className="w-full bg-black/50 border border-white/10 p-2 text-sm text-white font-pixel"
                            id="mintAmount"
                            defaultValue="1"
                        />
                    </div>

                    <PixelButton
                        onClick={handleMintLP}
                        disabled={isMinting}
                        variant="primary"
                        className="w-full h-10 text-sm font-bold uppercase tracking-widest flex items-center justify-center"
                    >
                        {isMinting ? <Loader2 className="w-4 h-4 animate-spin" /> : "MINT LP (1:3 Ratio)"}
                    </PixelButton>
                </div>
            </div>

            {/* Sticky Bottom Navigation */}
            {onBackToOffice && (
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <PixelButton
                        onClick={onBackToOffice}
                        variant="wood"
                        className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-lg"
                    >
                        ← BACK TO OFFICE
                    </PixelButton>
                </div>
            )}
        </div >
    );
}
