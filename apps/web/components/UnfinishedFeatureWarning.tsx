'use client';

import { PixelBox, PixelButton } from './PixelComponents';

interface UnfinishedFeatureWarningProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    featureName: string;
}

export function UnfinishedFeatureWarning({ isOpen, onClose, onConfirm, featureName }: UnfinishedFeatureWarningProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <PixelBox variant="dark" className="max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-red-400">⚠️ UNFINISHED FEATURE WARNING</h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-red-900/30 border-2 border-red-500/50 rounded p-4">
                        <p className="text-yellow-300 font-bold text-sm mb-2">
                            ⚠️ DO NOT CLICK THIS BUTTON UNLESS YOU ARE TESTING
                        </p>
                        <p className="text-gray-200 text-sm mb-3">
                            This feature (<strong className="text-yellow-300">{featureName}</strong>) is currently <strong className="text-red-400">UNFINISHED</strong> and in active development.
                        </p>
                        <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                            <li>Transactions may <strong className="text-red-400">FAIL</strong> and you may lose gas fees</li>
                            <li>Your tokens/MON may be <strong className="text-red-400">SENT</strong> but the feature may not work correctly</li>
                            <li>You may <strong className="text-red-400">LOSE MONEY</strong> with no way to recover it</li>
                            <li>This is for <strong className="text-yellow-300">TESTING ONLY</strong></li>
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        <PixelButton
                            variant="danger"
                            onClick={onConfirm}
                            className="flex-1"
                        >
                            I UNDERSTAND - PROCEED ANYWAY
                        </PixelButton>
                        <PixelButton
                            variant="neutral"
                            onClick={onClose}
                            className="flex-1"
                        >
                            CANCEL
                        </PixelButton>
                    </div>
                </div>
            </PixelBox>
        </div>
    );
}

