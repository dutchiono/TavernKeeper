'use client';

import React, { useEffect, useState } from 'react';
import { PixelBox, PixelButton } from '../PixelComponents';
import { PartyMode, PartyModeSelector } from './PartyModeSelector';

interface HeroNFT {
    tokenId: string;
    name: string;
    metadata?: any;
}

interface PartySelectorProps {
    walletAddress: string;
    onConfirm: (tokenIds: string[], mode: PartyMode, partyId?: string) => void;
    onCancel: () => void;
    dungeonId?: string;
}

export const PartySelector: React.FC<PartySelectorProps> = ({ walletAddress, onConfirm, onCancel, dungeonId }) => {
    const [mode, setMode] = useState<PartyMode>('solo');
    const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
    const [availableHeroes, setAvailableHeroes] = useState<HeroNFT[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOwnedHeroes();
    }, [walletAddress]);

    useEffect(() => {
        // Reset selection when mode changes
        if (mode === 'solo') {
            setSelectedTokenIds([]);
        } else if (mode === 'own') {
            // Keep selection if valid
            if (selectedTokenIds.length > 5) {
                setSelectedTokenIds(selectedTokenIds.slice(0, 5));
            }
        } else if (mode === 'public') {
            // Keep selection if valid
            if (selectedTokenIds.length > 4) {
                setSelectedTokenIds(selectedTokenIds.slice(0, 4));
            }
        }
    }, [mode]);

    const fetchOwnedHeroes = async () => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/heroes/owned?walletAddress=${walletAddress}`);
            if (!res.ok) throw new Error('Failed to fetch owned heroes');

            const { tokenIds } = await res.json();

            // Fetch hero data for each token ID
            const heroPromises = tokenIds.map(async (tokenId: string) => {
                try {
                    const res = await fetch(`/api/heroes/token?tokenId=${tokenId}`);
                    if (!res.ok) throw new Error('Failed to fetch hero data');
                    const heroData = await res.json();
                    return {
                        tokenId,
                        name: heroData.name,
                        metadata: heroData.metadata,
                    };
                } catch (e) {
                    console.error(`Failed to fetch hero ${tokenId}:`, e);
                    return {
                        tokenId,
                        name: `Hero #${tokenId}`,
                        metadata: null,
                    };
                }
            });

            const heroes = await Promise.all(heroPromises);
            setAvailableHeroes(heroes);
        } catch (e) {
            console.error('Error fetching owned heroes:', e);
            setError('Failed to load your heroes');
        } finally {
            setLoading(false);
        }
    };

    const toggleHero = (tokenId: string) => {
        if (selectedTokenIds.includes(tokenId)) {
            setSelectedTokenIds(selectedTokenIds.filter(id => id !== tokenId));
        } else {
            const maxCount = mode === 'solo' ? 1 : mode === 'own' ? 5 : 4;
            if (selectedTokenIds.length < maxCount) {
                setSelectedTokenIds([...selectedTokenIds, tokenId]);
            }
        }
    };

    const handleConfirm = async () => {
        if (selectedTokenIds.length === 0) {
            setError('Please select at least one hero');
            return;
        }

        const minCount = mode === 'solo' ? 1 : 1;
        const maxCount = mode === 'solo' ? 1 : mode === 'own' ? 5 : 4;

        if (selectedTokenIds.length < minCount || selectedTokenIds.length > maxCount) {
            setError(`Please select ${minCount === maxCount ? minCount : `${minCount}-${maxCount}`} heroes`);
            return;
        }

        // For public mode, create a party lobby first
        if (mode === 'public') {
            try {
                setLoading(true);
                const res = await fetch('/api/parties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ownerId: walletAddress,
                        dungeonId: dungeonId || 'abandoned-cellar',
                        initialHeroTokenIds: selectedTokenIds,
                    }),
                });

                if (!res.ok) throw new Error('Failed to create party');
                const party = await res.json();
                onConfirm(selectedTokenIds, mode, party.id);
            } catch (e) {
                console.error('Failed to create party:', e);
                setError('Failed to create party lobby');
                setLoading(false);
            }
        } else {
            onConfirm(selectedTokenIds, mode);
        }
    };

    const maxCount = mode === 'solo' ? 1 : mode === 'own' ? 5 : 4;
    const canSelectMore = selectedTokenIds.length < maxCount;

    if (loading) {
        return (
            <PixelBox variant="dark" className="w-full max-w-2xl mx-auto">
                <div className="text-center py-8">Loading your heroes...</div>
            </PixelBox>
        );
    }

    if (error && availableHeroes.length === 0) {
        return (
            <PixelBox variant="dark" className="w-full max-w-2xl mx-auto">
                <div className="text-center py-8 text-red-400">{error}</div>
                <PixelButton onClick={fetchOwnedHeroes} className="mt-4">Retry</PixelButton>
            </PixelBox>
        );
    }

    return (
        <PixelBox variant="dark" className="w-full max-w-2xl mx-auto" title="Select Party">
            <div className="space-y-4">
                <PartyModeSelector mode={mode} onModeChange={setMode} />

                <div className="text-xs text-slate-400 text-center">
                    {mode === 'solo' && 'Select 1 hero for solo adventure'}
                    {mode === 'own' && `Select 1-5 heroes (${selectedTokenIds.length}/5 selected)`}
                    {mode === 'public' && `Select 1-4 heroes, then wait for others to join (${selectedTokenIds.length}/4 selected)`}
                </div>

                {error && (
                    <div className="text-red-400 text-xs text-center">{error}</div>
                )}

                {availableHeroes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        No heroes found. You need to own at least one Adventurer NFT.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {availableHeroes.map((hero) => {
                            const isSelected = selectedTokenIds.includes(hero.tokenId);
                            const canSelect = isSelected || canSelectMore;

                            return (
                                <button
                                    key={hero.tokenId}
                                    onClick={() => canSelect && toggleHero(hero.tokenId)}
                                    disabled={!canSelect}
                                    className={`
                                        p-3 border-4 transition-all
                                        ${isSelected
                                            ? 'border-yellow-400 bg-yellow-900/30 scale-105'
                                            : canSelect
                                                ? 'border-slate-600 bg-slate-800 hover:border-slate-500 hover:scale-105'
                                                : 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">
                                            {hero.metadata?.hero?.class === 'Warrior' ? '⚔️' :
                                             hero.metadata?.hero?.class === 'Mage' ? '🔮' :
                                             hero.metadata?.hero?.class === 'Rogue' ? '🏹' :
                                             hero.metadata?.hero?.class === 'Cleric' ? '✨' : '👤'}
                                        </div>
                                        <div className="text-[10px] font-bold text-white truncate">
                                            {hero.name}
                                        </div>
                                        <div className="text-[8px] text-slate-400 mt-1">
                                            #{hero.tokenId}
                                        </div>
                                        {isSelected && (
                                            <div className="text-[8px] text-yellow-400 mt-1 font-bold">
                                                SELECTED
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                    <PixelButton variant="neutral" onClick={onCancel}>
                        Cancel
                    </PixelButton>
                    <PixelButton
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={selectedTokenIds.length === 0}
                    >
                        {mode === 'public' ? 'Create Lobby' : 'Confirm Party'}
                    </PixelButton>
                </div>
            </div>
        </PixelBox>
    );
};
