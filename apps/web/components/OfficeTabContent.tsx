'use client';

import { PixelButton } from './PixelComponents';
import { formatEther } from 'viem';
import EmployeesOfTheMonth from './EmployeesOfTheMonth';

interface OfficeTabContentProps {
    buttonText: string;
    isLoading: boolean;
    walletReady: boolean;
    isWrongNetwork?: boolean;
    isWalletConnected: boolean;
    onTakeOffice: () => Promise<void>;
    onShowTakeOfficeModal: () => void;
    keepBalance: string;
    monBalance: string;
    isKing?: boolean;
    totalEarned?: string;
    onClaim?: () => void;
}

export default function OfficeTabContent({
    buttonText,
    isLoading,
    walletReady,
    isWrongNetwork,
    isWalletConnected,
    onTakeOffice,
    onShowTakeOfficeModal,
    keepBalance,
    monBalance,
    isKing = false,
    totalEarned = '0.00',
    onClaim,
}: OfficeTabContentProps) {
    return (
        <div className="w-full space-y-3">
            {/* Take Office Action */}
            <div className="w-full">
                {isWalletConnected ? (
                    <PixelButton
                        onClick={async () => {
                            if (isWrongNetwork) {
                                await onTakeOffice();
                            } else {
                                onShowTakeOfficeModal();
                            }
                        }}
                        disabled={isLoading || (!walletReady && !isWrongNetwork)}
                        variant={isWrongNetwork ? "neutral" : "wood"}
                        className="w-full !py-3 !text-sm font-bold uppercase tracking-wider shadow-lg"
                    >
                        {buttonText}
                    </PixelButton>
                ) : (
                    <div className="text-center py-4">
                        <span className="text-[10px] text-[#a8a29e] italic">Connect wallet to play</span>
                    </div>
                )}
            </div>

            {/* Employees of the Month */}
            <EmployeesOfTheMonth />
        </div>
    );
}

