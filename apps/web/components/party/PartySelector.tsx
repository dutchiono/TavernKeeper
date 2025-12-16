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
        };
        attributes?: any[];
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:61', message: 'fetchMetadata entry', data: { tokenId: hero.token_id, hasMetadataUri: !!hero.metadataUri, currentMetadata: !!hero.metadata, currentName: hero.name }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,D' }) }).catch(() => { });
        // #endregion
        if (!hero.metadataUri) return;

        try {
            let metadata = null;
            const uri = hero.metadataUri;

            if (uri.startsWith('data:application/json;base64,')) {
                const base64 = uri.replace('data:application/json;base64,', '');
                metadata = JSON.parse(atob(base64));
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:70', message: 'Metadata parsed from base64', data: { tokenId: hero.token_id, hasMetadata: !!metadata, metadataName: metadata?.name, metadataClass: metadata?.hero?.class || metadata?.attributes?.find((a: any) => a.trait_type === 'Class')?.value }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
                // #endregion
            } else if (uri.startsWith('http')) {
                const res = await fetch(uri);
                if (res.ok) metadata = await res.json();
            } else if (uri.startsWith('ipfs://')) {
                const url = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                const res = await fetch(url);
                if (res.ok) metadata = await res.json();
            }

            if (metadata) {
                const heroName = metadata.name || `Hero #${hero.token_id}`;
                const heroClass = metadata.hero?.class || metadata.attributes?.find((a: any) => a.trait_type === 'Class')?.value || 'Warrior';
                console.log(`[PartySelector] ✅ Metadata loaded for hero #${hero.token_id}: name="${heroName}", class="${heroClass}"`);
                console.log(`[PartySelector] 📦 Full metadata object:`, JSON.stringify(metadata, null, 2));

                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:86', message: 'Before setAvailableHeroes state update', data: { tokenId: hero.token_id, extractedName: heroName, extractedClass: heroClass, metadataKeys: Object.keys(metadata) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
                // #endregion

                setAvailableHeroes(prev => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:88', message: 'Inside setAvailableHeroes updater', data: { tokenId: hero.token_id, prevHeroesCount: prev.length, prevHero9Data: prev.find(h => h.token_id === hero.token_id) ? { name: prev.find(h => h.token_id === hero.token_id)!.name, hasMetadata: !!prev.find(h => h.token_id === hero.token_id)!.metadata } : null }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
                    // #endregion
                    console.log(`[PartySelector] 🔄 State update starting for hero #${hero.token_id}, current heroes:`, prev.map(h => ({ id: h.token_id, name: h.name })));

                    // FIX: If hero doesn't exist in prev array, add it instead of trying to update
                    const existingHero = prev.find(h => h.token_id === hero.token_id);
                    if (!existingHero) {
                        // Hero not in array yet - add it
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:95', message: 'Hero not in array, adding new hero', data: { tokenId: hero.token_id, prevCount: prev.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
                        // #endregion
                        const newHero: HeroNFT = {
                            token_id: hero.token_id,
                            tokenId: hero.token_id,
                            name: heroName,
                            metadataUri: hero.metadataUri,
                            metadata: JSON.parse(JSON.stringify(metadata)),
                            status: hero.status || 'idle',
                            lockedUntil: hero.lockedUntil || null,
                        };
                        return [...prev, newHero];
                    }

                    // Hero exists - update it
                    const updated = prev.map(h => {
                        if (h.token_id === hero.token_id) {
                            // Create completely new object - DEEP copy to ensure React detects change
                            const newHero: HeroNFT = {
                                ...h,
                                name: heroName,
                                metadata: JSON.parse(JSON.stringify(metadata)), // Deep clone
                            };
                            // #region agent log
                            fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:94', message: 'Creating newHero object', data: { tokenId: hero.token_id, oldName: h.name, newName: heroName, oldHasMetadata: !!h.metadata, newHasMetadata: !!newHero.metadata, newMetadataClass: newHero.metadata?.hero?.class || newHero.metadata?.attributes?.find((a: any) => a.trait_type === 'Class')?.value }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
                            // #endregion
                            console.log(`[PartySelector] ✏️ State update for hero #${hero.token_id}:`, {
                                oldName: h.name,
                                newName: newHero.name,
                                oldClass: h.metadata?.hero?.class || h.metadata?.attributes?.find((a: any) => a.trait_type === 'Class')?.value,
                                newClass: newHero.metadata?.hero?.class || newHero.metadata?.attributes?.find((a: any) => a.trait_type === 'Class')?.value,
                                oldMetadataStructure: Object.keys(h.metadata || {}),
                                newMetadataStructure: Object.keys(newHero.metadata || {}),
                            });
                            return newHero;
                        }
                        return h;
                    });
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:108', message: 'Returning updated heroes array', data: { tokenId: hero.token_id, updatedCount: updated.length, updatedHero9Data: updated.find(h => h.token_id === hero.token_id) ? { name: updated.find(h => h.token_id === hero.token_id)!.name, hasMetadata: !!updated.find(h => h.token_id === hero.token_id)!.metadata } : null }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
                    // #endregion
                    console.log(`[PartySelector] ✅ State update complete, returning ${updated.length} heroes`);
                    return updated;
                });
            } else {
                console.warn(`[PartySelector] ⚠️ No metadata returned for hero #${hero.token_id} from URI: ${uri.substring(0, 100)}...`);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:112', message: 'No metadata returned', data: { tokenId: hero.token_id, uriPrefix: uri.substring(0, 50) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
                // #endregion
            }
        } catch (e) {
            console.error(`[PartySelector] ❌ Failed to fetch metadata for hero #${hero.token_id}:`, e);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:115', message: 'fetchMetadata error', data: { tokenId: hero.token_id, error: (e as Error).message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
            // #endregion
        }
    };

    const fetchOwnedHeroes = async () => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Fetch TavernKeepers
            console.log(`[PartySelector] Fetching TavernKeepers for wallet: ${walletAddress}`);
            const keepers = await rpgService.getUserTavernKeepers(walletAddress);
            console.log(`[PartySelector] Found ${keepers.length} TavernKeeper(s):`, keepers.map(k => ({ id: k.tokenId, tba: k.tbaAddress })));

            // 2. Fetch Heroes for each Keeper
            let allHeroes: HeroNFT[] = [];

            for (const keeper of keepers) {
                if (keeper.tbaAddress) {
                    console.log(`[PartySelector] Fetching heroes from TBA: ${keeper.tbaAddress} (Keeper #${keeper.tokenId})`);
                    const keeperHeroes = await rpgService.getHeroes(keeper.tbaAddress);
                    console.log(`[PartySelector] Found ${keeperHeroes.length} hero(es) for Keeper #${keeper.tokenId}:`, keeperHeroes.map(h => h.tokenId));
                    // Map to local interface - DON'T set default metadata, let fetchMetadata handle it
                    const mappedSubHeroes: HeroNFT[] = keeperHeroes.map(h => {
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:140', message: 'Initial hero mapping', data: { tokenId: h.tokenId, hasMetadataUri: !!h.metadataUri, metadataUriPrefix: h.metadataUri?.substring(0, 50) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,D' }) }).catch(() => { });
                        // #endregion
                        return {
                            token_id: h.tokenId,
                            tokenId: h.tokenId,
                            name: `Hero #${h.tokenId}`, // Placeholder until metadata is loaded
                            metadataUri: h.metadataUri,
                            metadata: undefined, // No default - will be set by fetchMetadata
                            status: 'idle'
                        };
                    });
                    allHeroes = [...allHeroes, ...mappedSubHeroes];
                } else {
                    console.warn(`[PartySelector] Keeper #${keeper.tokenId} has no TBA address - skipping`);
                }
            }

            console.log(`[PartySelector] Total heroes collected: ${allHeroes.length}`);

            // Set heroes in state FIRST
            setAvailableHeroes(allHeroes);

            // THEN trigger metadata fetch after state is set (use setTimeout to ensure state update completes)
            console.log(`[PartySelector] Starting metadata fetch for ${allHeroes.length} heroes...`);
            // Use setTimeout(0) to defer until after React's state update completes
            setTimeout(() => {
                allHeroes.forEach((hero, index) => {
                    if (hero.metadataUri) {
                        console.log(`[PartySelector] Fetching metadata for hero ${index + 1}/${allHeroes.length}: #${hero.token_id}`);
                        fetchMetadata(hero);
                    } else {
                        console.warn(`[PartySelector] Hero #${hero.token_id} has no metadataUri - skipping metadata fetch`);
                    }
                });
            }, 0);

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
            console.log(`[PartySelector] Heroes:`, heroesWithStatus.map(h => ({ tokenId: h.token_id, name: h.name, class: h.metadata?.hero?.class })));
            // Merge status into existing heroes (don't overwrite metadata that may have been loaded)
            setAvailableHeroes(prev => {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:262', message: 'Status merge starting', data: { prevCount: prev.length, prevHero9Name: prev.find(h => h.token_id === '9')?.name, prevHero9HasMetadata: !!prev.find(h => h.token_id === '9')?.metadata, newHeroesWithStatusCount: heroesWithStatus.length, newHero9Name: heroesWithStatus.find(h => h.token_id === '9')?.name }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
                // #endregion
                return heroesWithStatus.map(newHero => {
                    const existing = prev.find(h => h.token_id === newHero.token_id);
                    if (existing && existing.metadata) {
                        // Preserve metadata AND name if it exists (metadata load means name was updated too)
                        const preserved = { ...newHero, metadata: existing.metadata, name: existing.name };
                        // #region agent log
                        if (newHero.token_id === '9') {
                            fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:268', message: 'Status merge preserving metadata for hero 9', data: { existingName: existing.name, newHeroName: newHero.name, preservedName: preserved.name, hasMetadata: !!existing.metadata }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
                        }
                        // #endregion
                        return preserved;
                    }
                    // #region agent log
                    if (newHero.token_id === '9') {
                        fetch('http://127.0.0.1:7243/ingest/ed16fb33-7d16-4489-ada1-e35ba5bafda9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PartySelector.tsx:275', message: 'Status merge using newHero for hero 9 (no existing metadata)', data: { newHeroName: newHero.name, existingName: existing?.name, hasExisting: !!existing }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
                    }
                    // #endregion
                    return newHero;
                });
            });
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
                        {/* Show heroes with metadata loaded */}
                        {availableHeroes.filter(hero => {

                            return hero.metadata;
                        }).map((hero) => {

                            const isSelected = selectedTokenIds.includes(hero.token_id);
                            const isLocked = hero.status === 'dungeon';
                            const canSelect = !isLocked && (isSelected || selectedTokenIds.length < (mode === 'solo' ? 1 : mode === 'own' ? 5 : 4));

                            // Get hero class - check multiple possible locations in metadata
                            // Check attributes FIRST (more reliable), then hero.class
                            const classFromAttributes = hero.metadata?.attributes?.find((a: any) =>
                                a.trait_type === 'Class' || a.trait_type === 'class'
                            )?.value;
                            const classFromHero = hero.metadata?.hero?.class;
                            const metadataClass = classFromAttributes || classFromHero || 'Warrior';



                            // Normalize to lowercase and ensure it's a valid HeroClass
                            // Normalize to TitleCase (e.g. "Rogue") as required by spriteService
                            // Legacy lowercase handling in other components caused this confusion
                            const rawString = String(metadataClass || 'Warrior').toLowerCase();
                            const normalizedClass = (rawString.charAt(0).toUpperCase() + rawString.slice(1)) as HeroClass;

                            // Get colors from metadata
                            const colors = hero.metadata?.hero?.colorPalette || DEFAULT_COLORS;

                            // Debug log to see what's actually being rendered
                            /*
                            if (hero.token_id === '9') {
                                console.log('[PartySelector] Rendering hero #9');
                            }
                            */

                            return (
                                <button
                                    key={`${hero.token_id}-${hero.name}-${normalizedClass}`}
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
                                                type={normalizedClass}
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
                                            Lvl 1 {normalizedClass.charAt(0).toUpperCase() + normalizedClass.slice(1)} #{hero.token_id}
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
