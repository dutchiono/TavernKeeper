'use client';

import React, { useEffect, useState } from 'react';
import { usePartyStatus } from '../../lib/hooks/usePartyStatus';
import { useGameStore } from '../../lib/stores/gameStore';
import { GameView } from '../../lib/types';
import { PixelBox, PixelButton } from '../PixelComponents';

interface PublicPartyLobbyProps {
    partyId: string;
    walletAddress: string;
    onPartyStart?: (runId: string) => void;
}

export const PublicPartyLobby: React.FC<PublicPartyLobbyProps> = ({ partyId, walletAddress, onPartyStart }) => {
    const { status, loading, error } = usePartyStatus(partyId);
    const { switchView, setCurrentRunId } = useGameStore();
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    useEffect(() => {
        // Generate invite code if owner
        if (status && status.owner_id === walletAddress && !inviteCode) {
            fetchInviteCode();
        }
    }, [status, walletAddress, inviteCode]);

    useEffect(() => {
        // Auto-transition when party starts
        if (status && status.status === 'in_progress') {
            const runId = (status as any).runId;
            if (runId) {
                setCurrentRunId(runId);
                if (onPartyStart) {
                    onPartyStart(runId);
                }
                switchView(GameView.BATTLE);
            }
        }
    }, [status, onPartyStart, switchView, setCurrentRunId]);

    const fetchInviteCode = async () => {
        try {
            const res = await fetch(`/api/parties/${partyId}/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: walletAddress }),
            });
            if (res.ok) {
                const { code } = await res.json();
                setInviteCode(code);
            }
        } catch (e) {
            console.error('Failed to generate invite code:', e);
        }
    };

    const copyInviteCode = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            // Could show a toast here
        }
    };

    if (loading && !status) {
        return (
            <PixelBox variant="dark" className="w-full max-w-2xl mx-auto">
                <div className="text-center py-8">Loading party...</div>
            </PixelBox>
        );
    }

    if (error || !status) {
        return (
            <PixelBox variant="dark" className="w-full max-w-2xl mx-auto">
                <div className="text-center py-8 text-red-400">
                    {error || 'Failed to load party'}
                </div>
            </PixelBox>
        );
    }

    const isOwner = status.owner_id === walletAddress;
    const isFull = (status.memberCount || 0) >= status.max_members;

    return (
        <PixelBox variant="dark" className="w-full max-w-2xl mx-auto" title="Party Lobby">
            <div className="space-y-4">
                {/* Status */}
                <div className="text-center">
                    <div className="text-xs text-slate-400 mb-2">
                        {status.status === 'waiting' && `Waiting for members (${status.memberCount}/${status.max_members})`}
                        {status.status === 'in_progress' && 'Party has started!'}
                    </div>
                    {isFull && status.status === 'waiting' && (
                        <div className="text-yellow-400 text-sm font-bold">
                            Party is full! Starting run...
                        </div>
                    )}
                </div>

                {/* Invite Code */}
                {isOwner && inviteCode && (
                    <div className="bg-slate-800 p-4 border-2 border-slate-600">
                        <div className="text-xs text-slate-400 mb-2">Invite Code</div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-black p-2 font-mono text-lg text-yellow-400 text-center">
                                {inviteCode}
                            </div>
                            <PixelButton variant="primary" onClick={copyInviteCode}>
                                Copy
                            </PixelButton>
                        </div>
                        <div className="text-[8px] text-slate-500 mt-2 text-center">
                            Share this code with friends to join your party
                        </div>
                    </div>
                )}

                {/* Members List */}
                <div>
                    <div className="text-xs text-slate-400 mb-2">Party Members ({status.memberCount}/{status.max_members})</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {status.members?.map((member: any) => (
                            <div
                                key={member.id}
                                className="p-2 border-2 border-slate-600 bg-slate-800 text-center"
                            >
                                <div className="text-2xl mb-1">👤</div>
                                <div className="text-[10px] font-bold text-white truncate">
                                    Hero #{member.hero_token_id}
                                </div>
                                <div className="text-[8px] text-slate-400">
                                    {member.user_id === walletAddress ? 'You' : 'Friend'}
                                </div>
                            </div>
                        ))}
                        {/* Empty slots */}
                        {Array.from({ length: status.max_members - (status.memberCount || 0) }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="p-2 border-2 border-dashed border-slate-700 bg-slate-900/50 text-center opacity-50"
                            >
                                <div className="text-2xl mb-1">⚪</div>
                                <div className="text-[8px] text-slate-500">Empty Slot</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                    {isOwner && (
                        <PixelButton
                            variant="danger"
                            onClick={async () => {
                                // Cancel party
                                await fetch(`/api/parties/${partyId}`, { method: 'DELETE' });
                                switchView(GameView.MAP);
                            }}
                        >
                            Cancel Party
                        </PixelButton>
                    )}
                    <PixelButton variant="neutral" onClick={() => switchView(GameView.MAP)}>
                        Back to Map
                    </PixelButton>
                </div>
            </div>
        </PixelBox>
    );
};
