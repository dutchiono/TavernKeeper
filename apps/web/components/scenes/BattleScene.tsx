import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRunEvents } from '../../lib/hooks/useRunEvents';
import { useRunStatus } from '../../lib/hooks/useRunStatus';
import { HeroMetadata } from '../../lib/services/heroMetadata';
import { HeroNFT, rpgService } from '../../lib/services/rpgService';
import { DEFAULT_COLORS, HeroClass, HeroColors } from '../../lib/services/spriteService';
import { useGameStore } from '../../lib/stores/gameStore';
import { GameView } from '../../lib/types';
import { PixelBox, PixelButton } from '../PixelComponents';
import { SpritePreview } from '../heroes/SpritePreview';

interface BattleSceneProps {
    party: any[]; // Keep for compatibility, but we'll use token IDs from store
    onComplete: (success: boolean) => void;
}

interface DungeonEvent {
    id: string;
    type: string;
    level: number;
    roomType: string;
    description: string;
    timestamp: string;
    combatTurns?: any[]; // Combat turn details if available
}

interface LevelProgress {
    level: number;
    events: DungeonEvent[];
    status: 'pending' | 'in_progress' | 'completed';
    roomType?: string;
}

interface CombatTurn {
    turnNumber: number;
    entityName: string;
    targetName?: string;
    actionType?: string;
    result?: any;
}

export const BattleScene: React.FC<BattleSceneProps> = ({ onComplete }) => {
    const { address } = useAccount();
    const { currentRunId, selectedPartyTokenIds, switchView, setSelectedPartyTokenIds, setCurrentRunId } = useGameStore();
    // Use effective run ID for hooks (will be set after we determine it)
    const [effectiveRunId, setEffectiveRunId] = useState<string | null>(currentRunId);
    const { status: runStatus } = useRunStatus(effectiveRunId);

    // Update effectiveRunId when currentRunId or runStatus changes
    useEffect(() => {
        if (currentRunId) {
            setEffectiveRunId(currentRunId);
        } else if (runStatus?.id) {
            setEffectiveRunId(runStatus.id);
        }
    }, [currentRunId, runStatus?.id]);

    const { events, loading: eventsLoading } = useRunEvents(effectiveRunId);
    const [dungeonInfo, setDungeonInfo] = useState<{ name: string; depth: number; theme?: string } | null>(null);
    const [totalXP, setTotalXP] = useState(0);
    const [revealedEventCount, setRevealedEventCount] = useState(0);
    const [partyHeroes, setPartyHeroes] = useState<HeroNFT[]>([]);
    const [heroMetadata, setHeroMetadata] = useState<Record<string, HeroMetadata>>({});
    const [loadingHeroMetadata, setLoadingHeroMetadata] = useState<Record<string, boolean>>({});
    const [partyStats, setPartyStats] = useState<Record<string, { hp: number; maxHp: number; mana: number; maxMana: number }>>({});
    const hasInitializedRef = useRef(false);
    const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const transitionInitiatedRef = useRef(false);
    const roomDetailsScrollRef = useRef<HTMLDivElement>(null);
    const mapScrollRef = useRef<HTMLDivElement>(null);
    const previousLevelRef = useRef<number>(1);
    const lastPendingCountRef = useRef<number>(-1);
    const lastRevealedCountRef = useRef<number>(-1);
    const lastTransitionCheckRef = useRef<string>('');
    const revealedCountsByLevelRef = useRef<Map<number, number>>(new Map());
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset transition flag and level ref when run changes
    useEffect(() => {
        transitionInitiatedRef.current = false;
        currentLevelRef.current = 1;
        previousLevelRef.current = 1;
        revealedCountsByLevelRef.current.clear();
        setRevealedEventCount(0);

        // Clear any running reveal interval
        if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }

        // Clear any polling intervals
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
    }, [currentRunId]);

    // Parse events from world_events (they're stored in the payload field)
    const dungeonEvents = useMemo(() => {
        console.log(`[BattleScene] Processing ${events.length} raw events`);
        const parsed: DungeonEvent[] = [];
        events.forEach((event, idx) => {
            // Events from world_events table have a payload field
            const eventData = event.payload || {};

            // Debug: log first few events to see structure
            if (idx < 3) {
                console.log(`[BattleScene] Event ${idx}:`, {
                    id: event.id,
                    type: event.type,
                    payload: eventData,
                    hasLevel: eventData.level !== undefined,
                });
            }

            // Check if this is a dungeon event (has level property)
            if (eventData.level !== undefined) {
                parsed.push({
                    id: event.id,
                    type: eventData.type || event.type,
                    level: eventData.level,
                    roomType: eventData.roomType || 'unknown',
                    description: eventData.description || eventData.text || `Event: ${event.type}`,
                    timestamp: event.timestamp,
                    combatTurns: eventData.combatTurns || eventData.turns || null,
                });
            } else {
                // Log events that don't have level for debugging
                if (event.type && (event.type.includes('combat') || event.type.includes('trap') || event.type.includes('room'))) {
                    console.warn(`[BattleScene] Event missing level:`, event);
                }
            }
        });

        console.log(`[BattleScene] Parsed ${parsed.length} dungeon events from ${events.length} total events`);
        if (parsed.length > 0) {
            console.log(`[BattleScene] Sample parsed event:`, parsed[0]);
        }

        return parsed.sort((a, b) => {
            // Sort by level first, then timestamp
            if (a.level !== b.level) return a.level - b.level;
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
    }, [events]);

    // Mark as initialized once we have events or have tried loading
    useEffect(() => {
        if (events.length > 0 || (!eventsLoading && currentRunId)) {
            hasInitializedRef.current = true;
        }
    }, [events.length, eventsLoading, currentRunId]);

    // Group events by level
    const levelsProgress = useMemo(() => {
        const levels = new Map<number, LevelProgress>();
        let maxLevel = 0;

        dungeonEvents.forEach(event => {
            maxLevel = Math.max(maxLevel, event.level);
            if (!levels.has(event.level)) {
                levels.set(event.level, {
                    level: event.level,
                    events: [],
                    status: 'pending',
                });
            }
            const levelData = levels.get(event.level)!;
            levelData.events.push(event);

            // Update status based on event type
            if (event.type === 'room_enter') {
                levelData.status = 'in_progress';
                levelData.roomType = event.roomType;
            } else if (event.type === 'combat_victory' || event.type === 'trap_disarmed' || event.type === 'rest' || event.type === 'treasure_found') {
                levelData.status = 'completed';
            } else if (event.type === 'combat_defeat' || event.type === 'party_wipe') {
                levelData.status = 'completed';
            }
        });

        // Create array for all levels up to max
        const result: LevelProgress[] = [];
        const maxDepth = dungeonInfo?.depth || Math.max(maxLevel, 1);
        for (let i = 1; i <= maxDepth; i++) {
            if (levels.has(i)) {
                result.push(levels.get(i)!);
            } else {
                result.push({
                    level: i,
                    events: [],
                    status: 'pending',
                });
            }
        }
        return result;
    }, [dungeonEvents, dungeonInfo]);

    // Track the current level in a ref to persist across renders
    const currentLevelRef = useRef<number>(1);

    // Calculate current level - only advance when all events for current level are revealed
    // This prevents levels from advancing prematurely before events are shown
    const currentLevel = useMemo(() => {
        if (dungeonEvents.length === 0) {
            currentLevelRef.current = 1;
            return 1;
        }

        // Get the highest level with events
        const maxLevelWithEvents = Math.max(...dungeonEvents.map(e => e.level));

        // Start with the current level from ref (don't go backwards)
        let levelToCheck = Math.max(currentLevelRef.current, 1);

        // Only check the current level - don't look ahead to future levels
        const levelData = levelsProgress.find(l => l.level === levelToCheck);
        if (!levelData || levelData.events.length === 0) {
            // No events for current level yet, stay on this level
            return levelToCheck;
        }

        // Calculate total items for current level
        const roomEnterCount = levelData.events.filter(e => e.type === 'room_enter').length;
        const combatEvents = levelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
        const combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);
        const eventsWithoutCombatTurns = levelData.events.filter(e =>
            e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
        );
        const combatResultEvents = combatEvents.length;
        const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;
        const totalItemsForLevel = roomEnterCount + combatTurnsCount + otherEventsCount;

        // Get the revealed count for THIS level (use saved count if available, otherwise use current)
        const savedRevealedCount = revealedCountsByLevelRef.current.get(levelToCheck);
        const actualRevealedCount = (savedRevealedCount !== undefined && savedRevealedCount > revealedEventCount)
            ? savedRevealedCount
            : revealedEventCount;

        // Check if we've revealed all events for the current level
        // Only advance if ALL events are revealed AND the reveal interval has stopped
        if (actualRevealedCount >= totalItemsForLevel && totalItemsForLevel > 0 && !revealIntervalRef.current) {
            // All events revealed for current level, can advance to next level
            // But only advance by 1 level at a time - don't skip levels
            const nextLevel = levelToCheck + 1;
            if (nextLevel <= maxLevelWithEvents) {
                // Check if next level has events - if not, don't advance yet
                const nextLevelData = levelsProgress.find(l => l.level === nextLevel);
                if (nextLevelData && nextLevelData.events.length > 0) {
                    currentLevelRef.current = nextLevel;
                    return nextLevel;
                }
            }
        }

        // Still revealing events for current level, stay on this level
        return levelToCheck;
    }, [dungeonEvents, levelsProgress, revealedEventCount]);

    // Reset revealedEventCount when level changes (only show current level events)
    // But preserve revealed counts per level so returning to view doesn't reset progress
    useEffect(() => {
        if (previousLevelRef.current !== currentLevel) {
            // Save current revealed count for previous level BEFORE changing
            if (previousLevelRef.current > 0 && revealedEventCount > 0) {
                revealedCountsByLevelRef.current.set(previousLevelRef.current, revealedEventCount);
            }

            // Restore revealed count for new level, or start at 0 if first time
            const savedCount = revealedCountsByLevelRef.current.get(currentLevel) || 0;
            setRevealedEventCount(savedCount);

            // Update the currentLevelRef to match
            currentLevelRef.current = currentLevel;

            // Only log level changes (not initial load from 1 to 1)
            if (previousLevelRef.current !== 1 || currentLevel !== 1) {
                console.log(`[BattleScene] Level ${previousLevelRef.current} -> ${currentLevel} (restored ${savedCount} revealed, total for level: ${levelsProgress.find(l => l.level === currentLevel)?.events.length || 0})`);
            }
            previousLevelRef.current = currentLevel;
            // Reset logging refs on level change
            lastRevealedCountRef.current = -1;
            lastPendingCountRef.current = -1;

            // Center map on current level
            setTimeout(() => {
                if (mapScrollRef.current) {
                    const currentLevelElement = mapScrollRef.current.querySelector(`[data-level="${currentLevel}"]`);
                    if (currentLevelElement) {
                        currentLevelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        }
    }, [currentLevel, levelsProgress]);

    // Save revealed count whenever it changes (for persistence across view switches)
    // This ensures progress is saved even if user switches views
    useEffect(() => {
        if (currentLevel > 0) {
            // Always save the current count, even if 0 (to mark level as started)
            revealedCountsByLevelRef.current.set(currentLevel, revealedEventCount);
        }
    }, [revealedEventCount, currentLevel]);

    // Calculate total XP from events
    useEffect(() => {
        let xp = 0;
        dungeonEvents.forEach(event => {
            // Extract XP from description if present
            const xpMatch = event.description.match(/(\d+)\s*XP/i);
            if (xpMatch) {
                xp += parseInt(xpMatch[1], 10);
            }
        });
        setTotalXP(xp);
    }, [dungeonEvents]);

    // Fetch dungeon info and party heroes
    useEffect(() => {
        if (!currentRunId) return;

        const fetchDungeonInfo = async () => {
            try {
                const res = await fetch(`/api/runs/${currentRunId}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.dungeon) {
                    const mapData = typeof data.dungeon.map === 'string'
                        ? JSON.parse(data.dungeon.map)
                        : data.dungeon.map;
                    setDungeonInfo({
                        name: mapData?.name || data.dungeon.name || 'Unknown Dungeon',
                        depth: mapData?.depth || 100,
                        theme: mapData?.theme?.name || mapData?.theme?.id,
                    });
                }
            } catch (error) {
                console.error('Error fetching dungeon info:', error);
            }
        };

        const fetchPartyHeroes = async () => {
            // Get party from selectedPartyTokenIds or from runStatus
            const partyToFetch = selectedPartyTokenIds.length > 0 ? selectedPartyTokenIds : (runStatus?.party || []);
            if (!partyToFetch.length || !address) return;

            try {
                // Use the EXACT same approach as PartySelector - get TavernKeepers first, then heroes for each TBA
                // 1. Fetch TavernKeepers
                const keepers = await rpgService.getUserTavernKeepers(address);

                // 2. Fetch Heroes for each Keeper
                let allUserHeroes: HeroNFT[] = [];

                for (const keeper of keepers) {
                    if (keeper.tbaAddress) {
                        const keeperHeroes = await rpgService.getHeroes(keeper.tbaAddress);
                        allUserHeroes = [...allUserHeroes, ...keeperHeroes];
                    }
                }

                // Filter to only the party members
                const partyHeroesList = allUserHeroes.filter((h: HeroNFT) => partyToFetch.includes(h.tokenId));

                // Fetch metadata for all heroes BEFORE setting state (EXACT same as PartySelector)
                const heroesWithMetadata = await Promise.all(
                    partyHeroesList.map(async (h: HeroNFT) => {
                        const hero: HeroNFT & { name?: string; metadata?: any } = {
                            tokenId: h.tokenId,
                            metadataUri: h.metadataUri,
                            tbaAddress: h.tbaAddress || '',
                            name: `Hero #${h.tokenId}`, // Placeholder until metadata is loaded
                        };

                        if (!h.metadataUri) return hero;

                        try {
                            let metadata: HeroMetadata | null = null;
                            const uri = h.metadataUri;

                            // Handle data URIs (base64 encoded JSON) - EXACT same as PartySelector
                            if (uri.startsWith('data:application/json;base64,')) {
                                const base64 = uri.replace('data:application/json;base64,', '');
                                metadata = JSON.parse(atob(base64)) as HeroMetadata;
                                console.log(`[BattleScene] Parsed data URI for hero ${h.tokenId}:`, {
                                    hasName: !!metadata?.name,
                                    hasHero: !!metadata?.hero,
                                    hasClass: !!metadata?.hero?.class,
                                    hasColorPalette: !!metadata?.hero?.colorPalette,
                                });
                            } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
                                const res = await fetch(uri);
                                if (res.ok) {
                                    metadata = await res.json() as HeroMetadata;
                                    console.log(`[BattleScene] Fetched HTTP metadata for hero ${h.tokenId}:`, {
                                        hasName: !!metadata?.name,
                                        hasHero: !!metadata?.hero,
                                        hasClass: !!metadata?.hero?.class,
                                        hasColorPalette: !!metadata?.hero?.colorPalette,
                                    });
                                }
                            } else if (uri.startsWith('ipfs://')) {
                                const url = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                                const res = await fetch(url);
                                if (res.ok) {
                                    metadata = await res.json() as HeroMetadata;
                                    console.log(`[BattleScene] Fetched IPFS metadata for hero ${h.tokenId}:`, {
                                        hasName: !!metadata?.name,
                                        hasHero: !!metadata?.hero,
                                        hasClass: !!metadata?.hero?.class,
                                        hasColorPalette: !!metadata?.hero?.colorPalette,
                                    });
                                }
                            }

                            if (metadata) {
                                console.log(`[BattleScene] Successfully loaded metadata for hero ${h.tokenId}:`, {
                                    name: metadata.name,
                                    heroClass: metadata.hero?.class,
                                    hasColorPalette: !!metadata.hero?.colorPalette,
                                    colorPalette: metadata.hero?.colorPalette,
                                });
                                return {
                                    ...hero,
                                    name: metadata.name || hero.name,
                                    metadata: metadata, // Store full metadata object with hero.class and hero.colorPalette - EXACT same as PartySelector
                                };
                            } else {
                                console.warn(`[BattleScene] No metadata returned for hero ${h.tokenId}`);
                            }
                        } catch (e) {
                            console.error(`[BattleScene] Failed to fetch metadata for hero ${h.tokenId}:`, e);
                        }

                        // Return hero with default metadata if fetch fails
                        console.warn(`[BattleScene] Using default metadata for hero ${h.tokenId}`);
                        return hero;
                    })
                );

                setPartyHeroes(heroesWithMetadata);
            } catch (error) {
                console.error('[BattleScene] Error fetching party heroes:', error);
            }
        };

        fetchDungeonInfo();
        fetchPartyHeroes();
    }, [currentRunId, selectedPartyTokenIds, address, runStatus?.party]);

    // Track party stats from combat events
    useEffect(() => {
        if (!dungeonEvents.length) return;

        // Initialize with max HP/mana
        const initialStats: Record<string, { hp: number; maxHp: number; mana: number; maxMana: number }> = {};
        selectedPartyTokenIds.forEach(tokenId => {
            const metadata = heroMetadata[tokenId];
            const heroClass = metadata?.hero?.class || 'Warrior';
            // Default stats based on class
            const maxHp = 100; // TODO: Get from adventurer stats API
            const maxMana = (heroClass === 'Mage' || heroClass === 'Cleric') ? 50 : 0;

            initialStats[tokenId] = {
                hp: maxHp,
                maxHp,
                mana: maxMana,
                maxMana,
            };
        });

        // Track HP from combat turns - extract from result.targetHpAfter
        const updatedStats = { ...initialStats };
        dungeonEvents.forEach(event => {
            if (event.combatTurns && Array.isArray(event.combatTurns)) {
                event.combatTurns.forEach(turn => {
                    const result = turn.result;
                    if (result && 'targetHpAfter' in result && result.targetId) {
                        // Find which party member this targets
                        const targetTokenId = selectedPartyTokenIds.find(id =>
                            id === result.targetId ||
                            partyHeroes.find(h => h.tokenId === id)?.tokenId === result.targetId
                        );
                        if (targetTokenId && result.targetHpAfter !== undefined) {
                            if (!updatedStats[targetTokenId]) {
                                updatedStats[targetTokenId] = { hp: 100, maxHp: 100, mana: 50, maxMana: 50 };
                            }
                            updatedStats[targetTokenId].hp = Math.max(0, result.targetHpAfter);
                        }
                    }
                    // Also check entityId for party member HP
                    if (turn.entityId && turn.result && 'targetHpAfter' in turn.result) {
                        const entityTokenId = selectedPartyTokenIds.find(id =>
                            id === turn.entityId ||
                            partyHeroes.find(h => h.tokenId === id)?.tokenId === turn.entityId
                        );
                        if (entityTokenId && turn.result.targetHpAfter !== undefined) {
                            if (!updatedStats[entityTokenId]) {
                                updatedStats[entityTokenId] = { hp: 100, maxHp: 100, mana: 50, maxMana: 50 };
                            }
                            // Only update if this is the entity's own HP (not target HP)
                            // We'll track from targetHpAfter when this entity is the target
                        }
                    }
                });
            }
        });

        setPartyStats(prev => {
            // Merge with existing stats, preserving max values
            const merged: Record<string, { hp: number; maxHp: number; mana: number; maxMana: number }> = {};
            selectedPartyTokenIds.forEach(tokenId => {
                const existing = prev[tokenId] || initialStats[tokenId];
                const updated = updatedStats[tokenId];
                merged[tokenId] = {
                    hp: updated?.hp ?? existing?.hp ?? 100,
                    maxHp: existing?.maxHp ?? 100,
                    mana: updated?.mana ?? existing?.mana ?? 50,
                    maxMana: existing?.maxMana ?? 50,
                };
            });
            return merged;
        });
    }, [dungeonEvents, selectedPartyTokenIds, heroMetadata, partyHeroes]);

    // Progressive reveal of events (1 line every 6 seconds)
    // Only show events for CURRENT level - reset when level changes
    useEffect(() => {
        // Calculate total items for CURRENT level only
        // Events with combatTurns should be counted as: combatTurns.length + 1 (for the result event itself)
        const currentLevelData = levelsProgress.find(l => l.level === currentLevel);
        let totalItems = 0;
        let roomEnterCount = 0;
        let combatTurnsCount = 0;
        let otherEventsCount = 0;
        let combatEvents: DungeonEvent[] = [];

        if (currentLevelData) {
            roomEnterCount = currentLevelData.events.filter(e => e.type === 'room_enter').length;

            // Count combat turns from events that have combatTurns
            combatEvents = currentLevelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
            combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);

            // Count other events (events WITHOUT combatTurns, plus combat result events AFTER their turns)
            // Events with combatTurns are counted separately: turns + result event
            const eventsWithoutCombatTurns = currentLevelData.events.filter(e =>
                e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
            );
            const combatResultEvents = combatEvents.length; // Each combat event gets 1 result event shown after turns
            otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;

            totalItems = roomEnterCount + combatTurnsCount + otherEventsCount;

            // Log when level changes or total items changes significantly
            const logKey = `${currentLevel}-${totalItems}`;
            if (lastTransitionCheckRef.current !== logKey && totalItems > 0) {
                console.log(`[BattleScene] Level ${currentLevel}: ${totalItems} total events (${revealedEventCount} revealed)`);
                console.log(`[BattleScene] Level ${currentLevel} breakdown:`, {
                    roomEnterCount,
                    combatTurnsCount,
                    otherEventsCount,
                    combatEvents: combatEvents.length,
                    eventsWithoutCombatTurns: eventsWithoutCombatTurns.length,
                    totalEvents: currentLevelData.events.length
                });
                lastTransitionCheckRef.current = logKey;
            }
        }

        // Auto-reveal events at 200ms intervals, but also allow manual fast-forward
        if (totalItems > 0 && totalItems > revealedEventCount && !revealIntervalRef.current) {
            // Log when starting the reveal interval
            console.log(`[BattleScene] Starting auto-reveal for level ${currentLevel}: ${revealedEventCount}/${totalItems} revealed`);

            // Start revealing events progressively at 200ms intervals
            revealIntervalRef.current = setInterval(() => {
                setRevealedEventCount(prev => {
                    // Recalculate total items for current level in case new events arrived
                    const currentLevelData = levelsProgress.find(l => l.level === currentLevel);
                    let newTotalItems = 0;
                    if (currentLevelData) {
                        const roomEnterCount = currentLevelData.events.filter(e => e.type === 'room_enter').length;

                        // Count combat turns from events that have combatTurns
                        let combatTurnsCount = 0;
                        const combatEvents = currentLevelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
                        combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);

                        // Count other events (events WITHOUT combatTurns, plus combat result events AFTER their turns)
                        const eventsWithoutCombatTurns = currentLevelData.events.filter(e =>
                            e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
                        );
                        const combatResultEvents = combatEvents.length; // Each combat event gets 1 result event shown after turns
                        const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;

                        newTotalItems = roomEnterCount + combatTurnsCount + otherEventsCount;
                    }

                    if (prev < newTotalItems) {
                        const nextCount = prev + 1;
                        // Save progress to ref immediately
                        revealedCountsByLevelRef.current.set(currentLevel, nextCount);
                        return nextCount;
                    }
                    // Stop interval when all items are revealed
                    if (revealIntervalRef.current) {
                        clearInterval(revealIntervalRef.current);
                        revealIntervalRef.current = null;
                    }
                    // Save final count
                    revealedCountsByLevelRef.current.set(currentLevel, prev);
                    return prev;
                });
            }, 200); // 200ms per item - slower auto-reveal
        }

        return () => {
            // Cleanup: clear interval if component unmounts or dependencies change
            // But only if we're not actively revealing (to prevent clearing during normal operation)
            // The interval will clear itself when all events are revealed
            // NOTE: We intentionally don't clear the interval here to allow it to continue running
        };
    }, [levelsProgress, currentLevel]); // Removed revealedEventCount from deps to prevent restart, but interval will start when levelsProgress changes

    // Don't redirect immediately on mount - wait for events to be revealed
    // The transition logic below will handle redirecting after all events are shown

    // Check for victory/defeat - but wait for all events to be delivered AND revealed first
    useEffect(() => {
        if (!runStatus || !currentRunId) return;
        if (transitionInitiatedRef.current) {
            return; // Already transitioning - stop all checks
        }

        // Only proceed if run has completed (victory or defeat)
        if (runStatus.result !== 'victory' && runStatus.result !== 'defeat') {
            return;
        }

        // Only log once when run status changes to victory/defeat
        const statusKey = `${runStatus.result}-${currentRunId}`;
        if (lastTransitionCheckRef.current !== statusKey) {
            console.log(`[BattleScene] Run status is ${runStatus.result}. Checking if all events are delivered and revealed...`);
            lastTransitionCheckRef.current = statusKey;
        }

        const checkAndTransition = async () => {
            // Stop checking if transition already initiated
            if (transitionInitiatedRef.current) {
                return true; // Already transitioning
            }

            // First check if there are any undelivered events for this run
            try {
                const res = await fetch(`/api/runs/${currentRunId}/events/pending`);
                if (res.ok) {
                    const data = await res.json();
                    const hasPendingEvents = data.pendingCount > 0;

                    // Only log when pending count changes and not transitioning
                    if (!transitionInitiatedRef.current && data.pendingCount !== lastPendingCountRef.current) {
                        if (hasPendingEvents) {
                            console.log(`[BattleScene] Waiting for ${data.pendingCount} pending events...`);
                        }
                        lastPendingCountRef.current = data.pendingCount;
                    }

                    if (hasPendingEvents) {
                        return false; // Not ready to transition
                    }
                } else {
                    // Only log errors once
                    if (lastPendingCountRef.current !== -2) {
                        console.warn(`[BattleScene] Failed to check pending events: ${res.status}`);
                        lastPendingCountRef.current = -2;
                    }
                    return false;
                }
            } catch (error) {
                // Only log errors once
                if (lastPendingCountRef.current !== -3) {
                    console.warn('[BattleScene] Error checking pending events:', error);
                    lastPendingCountRef.current = -3;
                }
                return false;
            }

            // All events delivered, but check if they've all been REVEALED to the user
            const currentLevelData = levelsProgress.find(l => l.level === currentLevel);
            if (!currentLevelData) {
                return false; // No data for current level yet - wait silently
            }

            // Calculate total items for current level
            const roomEnterCount = currentLevelData.events.filter(e => e.type === 'room_enter').length;
            const combatEvents = currentLevelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
            const combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);
            const eventsWithoutCombatTurns = currentLevelData.events.filter(e =>
                e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
            );
            const combatResultEvents = combatEvents.length;
            const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;
            const totalItemsForCurrentLevel = roomEnterCount + combatTurnsCount + otherEventsCount;

            // Check if we're still revealing events for the current level
            if (revealedEventCount < totalItemsForCurrentLevel) {
                // Only log when revealed count changes significantly (every 25% progress)
                const progressPercent = Math.floor((revealedEventCount / totalItemsForCurrentLevel) * 4);
                const lastProgressRef = Math.floor((lastRevealedCountRef.current / totalItemsForCurrentLevel) * 4);
                if (progressPercent !== lastProgressRef && progressPercent > 0) {
                    console.log(`[BattleScene] Revealing events: ${revealedEventCount}/${totalItemsForCurrentLevel} (${Math.floor((revealedEventCount / totalItemsForCurrentLevel) * 100)}%)`);
                }
                lastRevealedCountRef.current = revealedEventCount;
                return false; // Not ready to transition
            }

            // Also check if the reveal interval is still running (means we're actively revealing)
            if (revealIntervalRef.current) {
                return false; // Not ready to transition - still revealing (no log, happens frequently)
            }

            // Check ALL levels to see if any haven't been fully revealed yet
            const levelsWithEvents = levelsProgress.filter(l => l.events.length > 0);
            for (const levelData of levelsWithEvents) {
                const level = levelData.level;

                // Calculate total items for this level
                const roomEnterCount = levelData.events.filter(e => e.type === 'room_enter').length;
                const combatEvents = levelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
                const combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);
                const eventsWithoutCombatTurns = levelData.events.filter(e =>
                    e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
                );
                const combatResultEvents = combatEvents.length;
                const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;
                const totalItemsForLevel = roomEnterCount + combatTurnsCount + otherEventsCount;

                // Get revealed count for this level
                const revealedCountForLevel = revealedCountsByLevelRef.current.get(level) || 0;

                // If this level hasn't been fully revealed, don't transition
                if (revealedCountForLevel < totalItemsForLevel && totalItemsForLevel > 0) {
                    // Only log once per level
                    if (lastRevealedCountRef.current !== -level) {
                        console.log(`[BattleScene] Level ${level} not complete: ${revealedCountForLevel}/${totalItemsForLevel} revealed`);
                        lastRevealedCountRef.current = -level;
                    }
                    return false; // Not ready to transition - more levels to process
                }
            }

            // Final check: ensure we've revealed at least some events (safety check)
            if (revealedEventCount === 0 && totalItemsForCurrentLevel > 0) {
                return false; // Not ready - events exist but none revealed yet (no log, happens at start)
            }

            // Only log once when ready to transition
            if (lastRevealedCountRef.current !== totalItemsForCurrentLevel) {
                console.log(`[BattleScene] All events revealed (${revealedEventCount}/${totalItemsForCurrentLevel}). Ready to transition.`);
                lastRevealedCountRef.current = totalItemsForCurrentLevel;
            }

            // All events delivered AND revealed, proceed with transition
            transitionInitiatedRef.current = true;
            console.log(`[BattleScene] All events delivered and revealed. Transitioning to map...`);

            // Redirect to map (not INN) after completion
            // Clear party selection and run ID when transitioning back to map
            setTimeout(() => {
                setSelectedPartyTokenIds([]);
                setCurrentRunId(null);
                if (runStatus.result === 'victory') {
                    onComplete(true);
                    switchView(GameView.MAP);
                } else if (runStatus.result === 'defeat') {
                    onComplete(false);
                    switchView(GameView.MAP);
                }
            }, 2000);

            return true; // Transition initiated
        };

        // Set up polling to check every 5 seconds until all events are delivered (reduced frequency)
        // Use refs to persist interval IDs across renders
        const startPolling = () => {
            // Don't start polling if already transitioning or if polling already active
            if (transitionInitiatedRef.current || pollingIntervalRef.current) {
                return;
            }

            pollingIntervalRef.current = setInterval(async () => {
                // Stop polling if transition was initiated
                if (transitionInitiatedRef.current) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    return;
                }

                const transitioned = await checkAndTransition();
                if (transitioned && pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }, 5000); // 5 seconds between checks
        };

        // Cleanup after 5 minutes max (safety timeout)
        if (!pollingTimeoutRef.current) {
            pollingTimeoutRef.current = setTimeout(() => {
                if (transitionInitiatedRef.current) {
                    return; // Already transitioning
                }
                console.warn('[BattleScene] Timeout waiting for events. Forcing transition...');
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                transitionInitiatedRef.current = true;
                // Clear party selection and run ID when transitioning back to map
                setSelectedPartyTokenIds([]);
                setCurrentRunId(null);
                if (runStatus.result === 'victory') {
                    onComplete(true);
                    switchView(GameView.MAP);
                } else if (runStatus.result === 'defeat') {
                    onComplete(false);
                    switchView(GameView.MAP);
                }
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                    pollingTimeoutRef.current = null;
                }
            }, 5 * 60 * 1000); // 5 minutes
        }

        // Check immediately, then start polling if needed
        // Use a small delay to ensure state is settled
        const initialCheckTimeout = setTimeout(() => {
            checkAndTransition().then(transitioned => {
                if (!transitioned && !transitionInitiatedRef.current) {
                    startPolling(); // Start polling silently
                }
            });
        }, 500); // Small delay to ensure state is settled

        return () => {
            // Cleanup on unmount or dependency change
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
            }
            clearTimeout(initialCheckTimeout);
        };
    }, [runStatus?.result, currentRunId]); // Only depend on result and runId, not frequently changing values

    // Get events for current level (needed for hooks below)
    const currentLevelEvents = levelsProgress.find(l => l.level === currentLevel)?.events || [];
    const currentLevelData = levelsProgress.find(l => l.level === currentLevel);
    const completedLevels = levelsProgress.filter(l => l.status === 'completed').length;

    // Get room type emoji (helper function - must be defined before useMemo)
    const getRoomEmoji = (roomType?: string) => {
        if (!roomType) return '❓';
        const type = roomType.toLowerCase();
        if (type.includes('combat') || type.includes('boss')) return '⚔️';
        if (type.includes('trap')) return '⚠️';
        if (type.includes('treasure')) return '💰';
        if (type.includes('safe')) return '💤';
        return '🚪';
    };

    // Calculate visible levels for centered map view
    const visibleLevels = useMemo(() => {
        const levelsToShow = 9; // Show 4 above, current, 4 below
        const startLevel = Math.max(1, currentLevel - 4);
        const endLevel = Math.min(levelsProgress.length, startLevel + levelsToShow);

        const visible: Array<{ level: number; data: LevelProgress | null; isVisited: boolean }> = [];
        for (let i = startLevel; i <= endLevel; i++) {
            const levelData = levelsProgress[i - 1] || null;
            visible.push({
                level: i,
                data: levelData,
                isVisited: levelData ? levelData.events.length > 0 : false,
            });
        }
        return visible;
    }, [currentLevel, levelsProgress]);

    // Format combat turn for display (similar to master-generator-tool.html)
    const formatCombatTurn = (turn: any): string => {
        const entityName = turn.entityName || 'Unknown';
        const targetName = turn.targetName || 'Unknown';
        let actionText = '';

        if (turn.action?.actionType === 'attack' || turn.actionType === 'attack') {
            const result = turn.result;
            if (result) {
                if (result.hit) {
                    const critText = result.criticalHit ? ' (CRITICAL!)' : '';
                    actionText = `attacks ${targetName} for ${result.damage || 0} damage${critText}`;
                } else {
                    actionText = `attacks ${targetName} but misses`;
                }
            } else {
                actionText = `attacks ${targetName}`;
            }
        } else if (turn.action?.actionType === 'heal' || turn.actionType === 'heal') {
            const result = turn.result;
            if (result) {
                actionText = `heals ${targetName} for ${result.amount || 0} HP`;
            } else {
                actionText = `heals ${targetName}`;
            }
        } else if (turn.action?.actionType === 'magic-attack' || turn.actionType === 'magic-attack') {
            const result = turn.result;
            if (result) {
                actionText = `casts spell at ${targetName} for ${result.damage || 0} damage`;
            } else {
                actionText = `casts spell at ${targetName}`;
            }
        } else {
            actionText = 'takes action';
        }

        return `Turn ${turn.turnNumber || '?'}: ${entityName} ${actionText}`;
    };

    // Extract combat turns from events
    const combatTurns = useMemo(() => {
        const turns: CombatTurn[] = [];
        currentLevelEvents.forEach(event => {
            if (event.combatTurns && Array.isArray(event.combatTurns)) {
                event.combatTurns.forEach(turn => {
                    turns.push({
                        turnNumber: turn.turnNumber || turns.length + 1,
                        entityName: turn.entityName || 'Unknown',
                        targetName: turn.targetName,
                        actionType: turn.action?.actionType || turn.actionType,
                        result: turn.result,
                    });
                });
            }
        });
        return turns.sort((a, b) => a.turnNumber - b.turnNumber);
    }, [currentLevelEvents]);

    // Get events to display (progressive reveal across ALL levels)
    const displayedEvents = useMemo(() => {
        const events: Array<{ type: string; content: React.ReactNode; isCombatTurn?: boolean }> = [];
        let itemIndex = 0;

        // Only process events for the CURRENT level (not all levels)
        const levelEvents = levelsProgress.find(l => l.level === currentLevel)?.events || [];
        if (levelEvents.length === 0) {
            return events;
        }

        // Room entry events (always show first)
        const roomEnterEvents = levelEvents.filter(e => e.type === 'room_enter');
        roomEnterEvents.forEach((event, idx) => {
            if (itemIndex < revealedEventCount) {
                events.push({
                    type: 'room_enter',
                    content: (
                        <div key={event.id || `level-${currentLevel}-room-${idx}`} className="mb-1 text-amber-950">
                            <span className="text-amber-800">🚪 </span>
                            <span>{event.description}</span>
                        </div>
                    ),
                });
            }
            itemIndex++;
        });

        // Combat turns for this level (revealed one by one)
        // Extract turns from events that have combatTurns
        const combatEventsWithTurns = levelEvents.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
        const levelCombatTurns = combatEventsWithTurns
                .flatMap(e => e.combatTurns)
                .map(turn => ({
                    turnNumber: turn.turnNumber || 0,
                    entityName: turn.entityName || 'Unknown',
                    targetName: turn.targetName,
                    actionType: turn.action?.actionType || turn.actionType,
                    result: turn.result,
                }))
                .sort((a, b) => a.turnNumber - b.turnNumber);

        if (itemIndex < revealedEventCount && levelCombatTurns.length > 0) {
            // Show combat turns header on first turn
            if (itemIndex === roomEnterEvents.length) {
                events.push({
                    type: 'header',
                    content: (
                        <div key={`level-${currentLevel}-combat-header`} className="text-xs font-bold text-amber-800 mb-1 mt-1">
                            Combat Turns
                        </div>
                    ),
                });
            }

            const turnsToShow = Math.min(levelCombatTurns.length, revealedEventCount - itemIndex);
            levelCombatTurns.slice(0, turnsToShow).forEach((turn, idx) => {
            const isAttack = turn.actionType === 'attack';
            const isHeal = turn.actionType === 'heal';
            const isMagic = turn.actionType === 'magic-attack';
            const result = turn.result;
            const hit = result?.hit;

            const turnColor = hit === false
                ? 'text-amber-700'
                : isHeal
                ? 'text-emerald-700'
                : hit
                ? 'text-red-700'
                : 'text-amber-950';

            events.push({
                type: 'combat_turn',
                isCombatTurn: true,
                content: (
                    <div key={`turn-${turn.turnNumber}-${idx}`} className={`mb-1 ${turnColor}`}>
                        {formatCombatTurn(turn)}
                    </div>
                ),
            });
        });
            itemIndex += turnsToShow;
        }

        // Other events for this level (revealed after combat turns)
        // Process events in chronological order
        const remainingReveals = revealedEventCount - itemIndex;

        // Calculate total combat turns shown so far
        const totalCombatTurnsShown = Math.max(0, itemIndex - roomEnterEvents.length);

        // Get all non-room_enter events, sorted by timestamp
        const otherEvents = levelEvents
            .filter(e => e.type !== 'room_enter')
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Track which combat events we've processed turns for
        let combatTurnsProcessed = 0;

        // Show events in order
        for (const event of otherEvents) {
            if (itemIndex >= revealedEventCount) break;

            // If event has combatTurns, check if we should show the result event
            if (event.combatTurns && Array.isArray(event.combatTurns) && event.combatTurns.length > 0) {
                // Check if all turns for this combat event have been shown
                const turnsForThisCombat = event.combatTurns.length;
                const turnsShownForThisCombat = Math.min(turnsForThisCombat, Math.max(0, totalCombatTurnsShown - combatTurnsProcessed));

                if (turnsShownForThisCombat >= turnsForThisCombat) {
                    // All turns for this combat event have been shown, now show the result
                    const getEventColor = () => {
                        if (event.type.includes('victory')) return 'text-emerald-700';
                        if (event.type.includes('defeat') || event.type.includes('party_wipe')) return 'text-red-700';
                        return 'text-amber-950';
                    };

                    events.push({
                        type: event.type,
                        content: (
                            <div key={event.id || `combat-result-${currentLevel}-${combatTurnsProcessed}`} className={`mb-1 ${getEventColor()}`}>
                                <span>⚔️ </span>
                                <span>{event.description}</span>
                            </div>
                        ),
                    });
                    itemIndex++;
                }
                combatTurnsProcessed += turnsForThisCombat;
            } else {
                // Regular event without combat turns - show it immediately if we have reveals left
                const getEventColor = () => {
                    if (event.type.includes('victory') || event.type.includes('disarmed') || event.type === 'rest') {
                        return 'text-emerald-700';
                    }
                    if (event.type.includes('defeat') || event.type.includes('triggered') || event.type === 'party_wipe') {
                        return 'text-red-700';
                    }
                    if (event.type === 'treasure_found') {
                        return 'text-amber-800';
                    }
                    return 'text-amber-950';
                };

                const getEventIcon = () => {
                    if (event.type.includes('combat')) return '⚔️';
                    if (event.type.includes('trap')) return '⚠️';
                    if (event.type === 'treasure_found') return '💰';
                    if (event.type === 'rest') return '💤';
                    return '•';
                };

                events.push({
                    type: event.type,
                    content: (
                        <div key={event.id || `event-${itemIndex}`} className={`mb-1 ${getEventColor()}`}>
                            <span>{getEventIcon()} </span>
                            <span>{event.description}</span>
                        </div>
                    ),
                });
                itemIndex++;
            }
        }

        return events;
    }, [levelsProgress, currentLevel, revealedEventCount]);

    // Auto-scroll room details to bottom when new events are revealed
    useEffect(() => {
        if (roomDetailsScrollRef.current && displayedEvents.length > 0) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                if (roomDetailsScrollRef.current) {
                    roomDetailsScrollRef.current.scrollTo({
                        top: roomDetailsScrollRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }, [revealedEventCount, displayedEvents.length]);

    // Check if first room_enter event for current level has been revealed
    const firstRoomEnterRevealed = useMemo(() => {
        const levelEvents = levelsProgress.find(l => l.level === currentLevel)?.events || [];
        const roomEnterEvents = levelEvents.filter(e => e.type === 'room_enter');
        if (roomEnterEvents.length === 0) return false;
        // First room_enter is revealed when revealedEventCount >= 1
        return revealedEventCount >= 1;
    }, [currentLevel, levelsProgress, revealedEventCount]);

    // Get effective party from selectedPartyTokenIds or runStatus
    const effectiveParty = selectedPartyTokenIds.length > 0 ? selectedPartyTokenIds : (runStatus?.party || []);

    // NOW do all conditional returns AFTER all hooks have been called
    // Allow showing completed runs - only show "No active run" if we truly have no run data
    if (!effectiveRunId && (!runStatus || !runStatus.id)) {
        return (
            <div className="w-full h-full bg-[#2a1d17] flex flex-col items-center justify-center font-pixel text-[#eaddcf] gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="text-xl">No active run</div>
                <div className="text-sm text-slate-400">Please start a run from the map</div>
                <PixelButton variant="primary" onClick={() => {
                    setSelectedPartyTokenIds([]);
                    setCurrentRunId(null);
                    switchView(GameView.MAP);
                }}>
                    Go to Map
                </PixelButton>
            </div>
        );
    }

    // Check for error events
    const errorEvent = dungeonEvents.find(e => e.type === 'error');
    const hasError = errorEvent || (runStatus && runStatus.result === 'error');

    // Show error state prominently if we have an error event or error status
    if (hasError && (errorEvent || !eventsLoading)) {
        return (
            <div className="w-full h-full bg-[#2a1d17] flex flex-col items-center justify-center font-pixel text-[#eaddcf] gap-4 p-8">
                <div className="text-6xl">❌</div>
                <div className="text-2xl font-bold text-[#ef4444]">Run Failed</div>
                {errorEvent && (
                    <div className="max-w-2xl text-center bg-[#1a120b] border-4 border-[#ef4444] rounded-lg p-6">
                        <div className="text-lg mb-2 text-[#ef4444] font-bold">Error Details:</div>
                        <div className="text-sm text-[#eaddcf] font-mono whitespace-pre-wrap">
                            {errorEvent.description}
                        </div>
                        {errorEvent.level > 0 && (
                            <div className="text-xs text-[#8c7b63] mt-4">
                                Failed at Level {errorEvent.level}
                            </div>
                        )}
                    </div>
                )}
                {runStatus && runStatus.result === 'error' && !errorEvent && (
                    <div className="max-w-2xl text-center bg-[#1a120b] border-4 border-[#ef4444] rounded-lg p-6">
                        <div className="text-sm text-[#eaddcf]">
                            The dungeon run encountered an error. Please try again.
                        </div>
                    </div>
                )}
                <div className="flex gap-4 mt-4">
                    <PixelButton variant="primary" onClick={() => {
                        setSelectedPartyTokenIds([]);
                        setCurrentRunId(null);
                        switchView(GameView.MAP);
                    }}>
                        Back to Map
                    </PixelButton>
                </div>
            </div>
        );
    }

    // Only show loading on very first load, use ref to prevent re-renders
    if (!hasInitializedRef.current && eventsLoading && dungeonEvents.length === 0) {
        return (
            <div className="w-full h-full bg-[#2a1d17] flex flex-col items-center justify-center font-pixel text-[#eaddcf] gap-4">
                <div className="text-4xl animate-pulse">⚔️</div>
                <div className="text-xl">Loading dungeon run...</div>
                <div className="text-xs text-slate-400">Waiting for simulation to start...</div>
            </div>
        );
    }

    // Show timeout state if we have timeout status but no events
    if (runStatus && runStatus.result === 'timeout' && dungeonEvents.length === 0 && !eventsLoading) {
        return (
            <div className="w-full h-full bg-[#2a1d17] flex flex-col items-center justify-center font-pixel text-[#eaddcf] gap-4 p-8">
                <div className="text-6xl">⏱️</div>
                <div className="text-2xl font-bold text-[#ef4444]">Run Timed Out</div>
                <div className="max-w-2xl text-center bg-[#1a120b] border-4 border-[#ef4444] rounded-lg p-6">
                    <div className="text-sm text-[#eaddcf]">
                        The dungeon run simulation timed out before generating any events. This may indicate:
                    </div>
                    <ul className="text-xs text-[#8c7b63] mt-4 list-disc list-inside text-left space-y-2">
                        <li>Hero initialization failed</li>
                        <li>Dungeon data was missing or invalid</li>
                        <li>Simulation encountered an unexpected error</li>
                    </ul>
                </div>
                <div className="flex gap-4 mt-4">
                    <PixelButton variant="primary" onClick={() => {
                        setSelectedPartyTokenIds([]);
                        setCurrentRunId(null);
                        switchView(GameView.MAP);
                    }}>
                        Back to Map
                    </PixelButton>
                </div>
            </div>
        );
    }

    // Calculate fast forward button state (reuse existing currentLevelData)
    const shouldShowFastForward = currentLevelData ? (() => {
        const roomEnterCount = currentLevelData.events.filter(e => e.type === 'room_enter').length;
        const combatEvents = currentLevelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
        const combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);
        const eventsWithoutCombatTurns = currentLevelData.events.filter(e =>
            e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
        );
        const combatResultEvents = combatEvents.length;
        const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;
        const totalItems = roomEnterCount + combatTurnsCount + otherEventsCount;
        return revealedEventCount < totalItems;
    })() : false;

    const handleFastForward = () => {
        if (!currentLevelData) return;
        const roomEnterCount = currentLevelData.events.filter(e => e.type === 'room_enter').length;
        const combatEvents = currentLevelData.events.filter(e => e.combatTurns && Array.isArray(e.combatTurns) && e.combatTurns.length > 0);
        const combatTurnsCount = combatEvents.reduce((sum, e) => sum + (e.combatTurns?.length || 0), 0);
        const eventsWithoutCombatTurns = currentLevelData.events.filter(e =>
            e.type !== 'room_enter' && (!e.combatTurns || !Array.isArray(e.combatTurns) || e.combatTurns.length === 0)
        );
        const combatResultEvents = combatEvents.length;
        const otherEventsCount = eventsWithoutCombatTurns.length + combatResultEvents;
        const totalItems = roomEnterCount + combatTurnsCount + otherEventsCount;

        setRevealedEventCount(prev => {
            const nextCount = Math.min(prev + 1, totalItems);
            revealedCountsByLevelRef.current.set(currentLevel, nextCount);
            return nextCount;
        });
    };

    return (
        <div className="w-full h-full bg-[#2a1d17] relative flex flex-col font-pixel overflow-hidden">
            {/* Top Panel - Room Scene (1/2 height) */}
            <div className="h-1/2 shrink-0 bg-[#1a120b] border-b-4 border-[#5c4033] relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(#4a3b32 2px, transparent 2px)',
                    backgroundSize: '20px 20px'
                }} />

                {/* Room Title Overlay - Smaller text, cleaned up */}
                <div className="absolute top-2 left-2 z-10">
                    <div className="bg-[#2a1d17]/90 border-2 border-[#5c4033] rounded px-2 py-1">
                        <div className="text-xs text-[#ffd700] font-bold">
                            {dungeonInfo?.name || 'Loading...'} - Level {currentLevel}
                        </div>
                        <div className="text-[10px] text-[#8c7b63] flex items-center gap-1.5 mt-0.5">
                            <span>Party: {selectedPartyTokenIds.length}</span>
                            <span>•</span>
                            <span className="text-[#22c55e]">XP: {totalXP}</span>
                            <span>•</span>
                            <span className="text-[#3b82f6]">Progress: {completedLevels}/{dungeonInfo?.depth || '?'}</span>
                        </div>
                    </div>
                </div>

                {/* Battle Scene - Party Members Display (left side, enemies will go on right) */}
                <div className="absolute inset-0 flex items-center justify-start p-4 pt-16">
                    {effectiveParty.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-4 max-w-full">
                            {effectiveParty.map((tokenId, idx) => {
                                const hero = partyHeroes.find(h => h.tokenId === tokenId) as (HeroNFT & { name?: string; metadata?: any }) | undefined;

                                // Extract hero class and colors from metadata - EXACT same as PartySelector
                                const heroClass = (hero?.metadata?.hero?.class || 'Warrior') as HeroClass;
                                const colors = (hero?.metadata?.hero?.colorPalette || DEFAULT_COLORS) as HeroColors;
                                const heroName = hero?.name || `Hero #${tokenId}`;

                                // Debug: Log what we're actually using for rendering
                                console.log(`[BattleScene] Rendering hero ${tokenId}:`, {
                                    heroClass,
                                    hasColorPalette: !!hero?.metadata?.hero?.colorPalette,
                                    colorsKeys: Object.keys(colors),
                                    metadataStructure: hero?.metadata ? {
                                        hasHero: !!hero.metadata.hero,
                                        heroKeys: hero.metadata.hero ? Object.keys(hero.metadata.hero) : [],
                                    } : null,
                                });

                                // Get HP/mana from tracked stats
                                const stats = partyStats[tokenId] || { hp: 100, maxHp: 100, mana: 50, maxMana: 50 };
                                const currentHP = stats.hp;
                                const maxHP = stats.maxHp;
                                const currentMana = stats.mana;
                                const maxMana = stats.maxMana;

                                return (
                                    <div key={tokenId} className="flex flex-col items-center bg-[#2a1d17]/80 border-2 border-[#5c4033] rounded-lg p-3 min-w-[120px]">
                                        {/* Hero Sprite/Icon - EXACT same rendering as PartySelector */}
                                        <div className="mb-2">
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

                                        {/* Hero Name */}
                                        <div className="text-xs text-[#ffd700] font-bold mb-1 text-center truncate w-full">
                                            {heroName}
                                        </div>

                                        {/* Hero Class */}
                                        <div className="text-[10px] text-[#8c7b63] mb-2">
                                            {heroClass}
                                        </div>

                                        {/* HP Bar */}
                                        <div className="w-full mb-1">
                                            <div className="text-[8px] text-[#8c7b63] mb-0.5">HP</div>
                                            <div className="w-full h-2 bg-black/50 border border-white/10 rounded-full overflow-hidden relative">
                                                <div
                                                    style={{ width: `${Math.max(0, Math.min(100, (currentHP / maxHP) * 100))}%` }}
                                                    className={`h-full absolute top-0 left-0 transition-all duration-300 ${
                                                        currentHP / maxHP > 0.5 ? 'bg-red-600' : currentHP / maxHP > 0.25 ? 'bg-orange-500' : 'bg-red-800'
                                                    }`}
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">
                                                    {Math.max(0, currentHP)}/{maxHP}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mana Bar (only for mages/clerics) */}
                                        {(heroClass === 'Mage' || heroClass === 'Cleric') && (
                                            <div className="w-full">
                                                <div className="text-[8px] text-[#8c7b63] mb-0.5">MP</div>
                                                <div className="w-full h-2 bg-black/50 border border-white/10 rounded-full overflow-hidden relative">
                                                    <div
                                                        style={{ width: `${Math.max(0, Math.min(100, (currentMana / maxMana) * 100))}%` }}
                                                        className="h-full bg-blue-500 absolute top-0 left-0 transition-all duration-300"
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">
                                                        {Math.max(0, currentMana)}/{maxMana}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center">
                            {firstRoomEnterRevealed && (currentLevelData?.roomType === 'combat' || currentLevelData?.roomType === 'boss' || currentLevelData?.roomType === 'mid_boss') ? (
                                <>
                                    <div className="text-6xl mb-4 animate-pulse">⚔️</div>
                                    <div className="text-lg text-[#eaddcf]">Combat in Progress...</div>
                                </>
                            ) : firstRoomEnterRevealed && currentLevelData?.roomType === 'trap' ? (
                                <>
                                    <div className="text-6xl mb-4">⚠️</div>
                                    <div className="text-lg text-[#eaddcf]">Trap Encounter</div>
                                </>
                            ) : firstRoomEnterRevealed && currentLevelData?.roomType === 'treasure' ? (
                                <>
                                    <div className="text-6xl mb-4">💰</div>
                                    <div className="text-lg text-[#eaddcf]">Treasure Room</div>
                                </>
                            ) : firstRoomEnterRevealed && currentLevelData?.roomType === 'safe' ? (
                                <>
                                    <div className="text-6xl mb-4">💤</div>
                                    <div className="text-lg text-[#eaddcf]">Safe Room - Resting</div>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4">🚪</div>
                                    <div className="text-lg text-[#eaddcf]">Exploring...</div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section - Two Columns */}
            <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
                {/* Left Column - Dungeon Map (Flowchart Style, Thinner) - Using MapScene styling */}
                <PixelBox className="w-48 shrink-0 flex flex-col" title="Dungeon Map" variant="wood">
                    <div ref={mapScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center relative">
                        {/* Connection Line (vertical gradient like MapScene) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-1 h-[80%] bg-gradient-to-b from-amber-900/20 via-amber-700/40 to-amber-900/20 rounded-full" />
                        </div>

                        {/* Nodes Container (matching MapScene gap-12) */}
                        <div className="flex flex-col gap-12 z-10 w-full items-center py-8">
                            {visibleLevels.map((item, index) => {
                                const isCurrent = item.level === currentLevel;
                                const isCompleted = item.data?.status === 'completed';
                                const isVisited = item.isVisited;

                                // For current level, only show room type emoji when first room_enter event is revealed
                                let roomTypeForEmoji = item.data?.roomType;
                                if (isCurrent && !roomTypeForEmoji) {
                                    // Check current level events for room_enter to get room type
                                    const currentLevelEvents = levelsProgress.find(l => l.level === currentLevel)?.events || [];
                                    const roomEnterEvent = currentLevelEvents.find(e => e.type === 'room_enter');
                                    if (roomEnterEvent && firstRoomEnterRevealed) {
                                        roomTypeForEmoji = roomEnterEvent.roomType;
                                    }
                                }

                                // Current level should show ? until first room_enter is revealed, then show actual room type
                                const roomEmoji = isCurrent
                                    ? (firstRoomEnterRevealed && roomTypeForEmoji ? getRoomEmoji(roomTypeForEmoji) : '❓')
                                    : (item.isVisited ? getRoomEmoji(item.data?.roomType) : '❓');

                                return (
                                    <div key={item.level} data-level={item.level} className="group relative flex items-center justify-center">
                                        {/* Level number to the side - positioned outside the circle */}
                                        <div className={`absolute -left-10 text-right shrink-0 w-8 ${
                                            isCurrent ? 'text-[#ffd700]' : isCompleted ? 'text-[#22c55e]' : 'text-[#8c7b63]'
                                        }`}>
                                            <span className="text-sm font-bold">{item.level}.</span>
                                        </div>

                                        {/* Circle with emoji inside - matching MapScene (w-16 h-16, border-4, text-2xl) */}
                                        <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shrink-0 relative shadow-xl transition-all duration-300 ${
                                            isCurrent
                                                ? 'bg-[#eaddcf] border-amber-500 scale-110 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-pulse-slow'
                                                : isCompleted
                                                ? 'bg-[#2a1d17] border-[#22c55e]'
                                                : isVisited
                                                ? 'bg-[#2a1d17] border-[#8c7b63]'
                                                : 'bg-[#2a1d17] border-[#5c4033] opacity-40'
                                        }`}>
                                            {/* Emoji with vertical offset to center it better */}
                                            <span className={`text-2xl drop-shadow-md leading-none flex items-center justify-center ${isCurrent ? '' : !isVisited ? 'blur-[1px]' : ''}`} style={{ marginTop: '-2px' }}>
                                                {roomEmoji}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </PixelBox>

                {/* Right Column - Current Room Details (Wider) */}
                <PixelBox className="flex-1 min-w-0 flex flex-col" title={`Level ${currentLevel} - Room Details`} variant="paper">
                    <div ref={roomDetailsScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 text-xs font-mono text-amber-950 leading-relaxed">
                        {currentLevelEvents.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-amber-800">
                                <div className="text-center">
                                    <div className="text-4xl mb-4">🚪</div>
                                    <div>Entering level {currentLevel}...</div>
                                    <div className="text-xs mt-2">Waiting for events...</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Display events progressively as simple text */}
                                {displayedEvents.map((eventItem, idx) => (
                                    <React.Fragment key={idx}>
                                        {eventItem.content}
                                    </React.Fragment>
                                ))}

                            </>
                        )}
                    </div>
                </PixelBox>
            </div>

            {/* Floating Fast Forward Button */}
            {shouldShowFastForward && (
                <button
                    onClick={handleFastForward}
                    className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-[#3e2b22] border-2 border-[#8c7b63] rounded-full flex items-center justify-center shadow-lg hover:bg-[#5c4033] transition-colors"
                    title="Fast Forward Events"
                >
                    <span className="text-xl">⏩</span>
                </button>
            )}
        </div>
    );
};
