'use client';

import React, { useEffect, useState } from 'react';
import { PixelBox, PixelButton } from '../PixelComponents';
import { PartyMode, PartyModeSelector } from './PartyModeSelector';
import { rpgService } from '../../lib/services/rpgService';
import { SpritePreview } from '../heroes/SpritePreview';
import { HeroClass, HeroColors, DEFAULT_COLORS } from '../../lib/services/spriteService';

interface HeroNFT {
    token_id: string;
    name: string;
    image_uri?: string;
    metadata?: {
        name?: string;
        hero?: {
            class?: string;
            gender?: string;
            colorPalette?: HeroColors;
        }
    };
    metadataUri?: string;
    status: 'idle' | 'dungeon';
    lockedUntil?: string;
    tokenId?: string; // Mapped
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
        if (mode === 'solo') {
            setSelectedTokenIds([]);
        } else if (mode === 'own') {
            if (selectedTokenIds.length > 5) {
                setSelectedTokenIds(selectedTokenIds.slice(0, 5));
            }
        } else if (mode === 'public') {
            if (selectedTokenIds.length > 4) {
                setSelectedTokenIds(selectedTokenIds.slice(0, 4));
            }
        }
    }, [mode]);

    // Fetch metadata for a hero
    const fetchMetadata = async (hero: HeroNFT) => {
        if (!hero.metadataUri) return;

        try {
            let metadata = null;
            const uri = hero.metadataUri;

            if (uri.startsWith('data:application/json;base64,')) {
                const base64 = uri.replace('data:application/json;base64,', '');
                metadata = JSON.parse(atob(base64));
            } else if (uri.startsWith('http')) {
                const res = await fetch(uri);
                if (res.ok) metadata = await res.json();
            } else if (uri.startsWith('ipfs://')) {
                const url = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                const res = await fetch(url);
                if (res.ok) metadata = await res.json();
            }

            if (metadata) {
                setAvailableHeroes(prev => prev.map(h => {
                    if (h.token_id === hero.token_id) {
                        return {
                            ...h,
                            name: metadata.name || h.name,
                            metadata: metadata,
                        };
                    }
                    return h;
                }));
            }
        } catch (e) {
            console.warn('Failed to fetch metadata for hero', hero.token_id, e);
        }
    };

    const fetchOwnedHeroes = async () => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Fetch TavernKeepers
            const keepers = await rpgService.getUserTavernKeepers(walletAddress);

            // 2. Fetch Heroes for each Keeper
            let allHeroes: HeroNFT[] = [];

            for (const keeper of keepers) {
                if (keeper.tbaAddress) {
                    const keeperHeroes = await rpgService.getHeroes(keeper.tbaAddress);
                    // Map to local interface
                    const mappedSubHeroes: HeroNFT[] = keeperHeroes.map(h => ({
                        token_id: h.tokenId,
                        tokenId: h.tokenId,
                        name: `Hero #${h.tokenId}`, // Placeholder until metadata is loaded
                        metadataUri: h.metadataUri,
                        metadata: { hero: { class: 'Warrior' } }, // Default metadata
                        status: 'idle'
                    }));
                    allHeroes = [...allHeroes, ...mappedSubHeroes];
                }
            }

            // Trigger metadata fetch for all heroes
            allHeroes.forEach(hero => {
                if (hero.metadataUri) {
                    fetchMetadata(hero);
                }
            });

            // 3. Fetch status for all heroes
            const tokenIds = allHeroes.map(h => h.token_id);
            let heroStates: any[] = [];

            if (tokenIds.length > 0) {
                try {
                    const statusRes = await fetch('/api/heroes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tokenIds })
                    });

                    if (statusRes.ok) {
                        heroStates = await statusRes.json();
                    }
                } catch (statusErr) {
                    console.error('Failed to fetch hero statuses:', statusErr);
                }
            }

            // 4. Merge status
            const heroesWithStatus = allHeroes.map(hero => {
                const state = heroStates.find((s: any) => s.token_id === hero.token_id);
                const now = new Date();
                const lockedUntil = state?.locked_until ? new Date(state.locked_until) : null;
                const isLocked = state?.status === 'dungeon' && lockedUntil && lockedUntil > now;

                return {
                    ...hero,
                    status: isLocked ? 'dungeon' : 'idle',
                    lockedUntil: isLocked ? state.locked_until : undefined
                };
            });

            console.log(`[PartySelector] Loaded ${heroesWithStatus.length} heroes from blockchain`);
            setAvailableHeroes(heroesWithStatus as any);
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
                            const isSelected = selectedTokenIds.includes(hero.token_id);
                            const isLocked = hero.status === 'dungeon';
                            const canSelect = !isLocked && (isSelected || selectedTokenIds.length < (mode === 'solo' ? 1 : mode === 'own' ? 5 : 4));

                            const heroClass = (hero.metadata?.hero?.class || 'Warrior') as HeroClass;
                            const colors = hero.metadata?.hero?.colorPalette || DEFAULT_COLORS;

                            return (
                                <button
                                    key={hero.token_id}
                                    onClick={() => canSelect && toggleHero(hero.token_id)}
                                    disabled={!canSelect}
                                    className={`
                                        p-3 border-4 transition-all relative overflow-hidden flex flex-col items-center
                                        ${isLocked
                                            ? 'border-red-900 bg-red-950/50 opacity-60 cursor-not-allowed grayscale'
                                            : isSelected
                                                ? 'border-yellow-400 bg-yellow-900/30 scale-105'
                                                : canSelect
                                                    ? 'border-slate-600 bg-slate-800 hover:border-slate-500 hover:scale-105'
                                                    : 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isLocked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10" title={`Locked until ${hero.lockedUntil ? new Date(hero.lockedUntil).toLocaleTimeString() : 'unknown'}`}>
                                            <span className="text-2xl">🔒</span>
                                        </div>
                                    )}

                                    <div className="mb-2 w-full flex justify-center">
                                        <div className="transform scale-[2] origin-top">
                                            <SpritePreview
                                                type={heroClass}
                                                colors={colors}
                                                showFrame={false}
                                                scale={1}
                                                isKeeper={false}
                                                interactive={false}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-center mt-6 w-full">
                                        <div className="text-[10px] font-bold text-white truncate w-full">
                                            {hero.name}
                                        </div>
                                        <div className="text-[8px] text-slate-400 mt-1">
                                            Lvl 1 {heroClass} #{hero.token_id}
                                        </div>
                                        {isSelected && (
                                            <div className="text-[8px] text-yellow-400 mt-1 font-bold">
                                                SELECTED
                                            </div>
                                        )}
                                        {isLocked && (
                                            <div className="text-[8px] text-red-400 mt-1 font-bold">
                                                ON MISSION
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex gap-2 justify-between pt-4 border-t border-slate-700">
                    <div className="flex gap-2">
                        {/* DEV ONLY BUTTON */}
                        <PixelButton variant="danger" className="text-[10px] px-2" onClick={async () => {
                            const { unlockAllHeroes } = await import('../../app/actions/devActions');
                            if (confirm("Reset ALL hero locks? (Dev only)")) {
                                const res = await unlockAllHeroes();
                                if (res.success) {
                                    alert('Refreshed! Reload to see changes.');
                                    fetchOwnedHeroes();
                                } else {
                                    alert('Error: ' + res.message);
                                }
                            }
                        }}>
                            🔓 Unlock
                        </PixelButton>
                    </div>
                    <div className="flex gap-2">
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
            </div>
        </PixelBox>
    );
};
