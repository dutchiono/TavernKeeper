import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRunStatus } from '../../lib/hooks/useRunStatus';
import { runService } from '../../lib/services/runService';
import { useGameStore } from '../../lib/stores/gameStore';
import { GameView } from '../../lib/types';
import { PartySelector } from '../party/PartySelector';
import { PublicPartyLobby } from '../party/PublicPartyLobby';
import { PixelButton } from '../PixelComponents';

interface Dungeon {
    id: string;
    seed: string;
    name: string;
    depth: number;
    theme: string;
    finalBoss: string;
    createdAt: string;
    icon_x?: number | null; // Icon position X (percentage 10-90)
    icon_y?: number | null; // Icon position Y (percentage 10-90)
}

interface DungeonIcon extends Dungeon {
    x: number; // Random position percentage (0-100)
    y: number; // Random position percentage (0-100)
    emoji: string; // Icon emoji for this dungeon
}

// Array of dungeon/adventure-themed emojis
const DUNGEON_EMOJIS = [
    '🗺️', '🏰', '🏛️', '⛰️', '🌋', '🏔️', '🕳️', '🕸️', 
    '💎', '⚔️', '🛡️', '🗡️', '🏴', '👑', '💀', '👹',
    '🐉', '🦇', '🕷️', '🦂', '🔥', '❄️', '⚡', '🌊',
    '🌑', '⭐', '🔮', '📜', '🗝️', '💍', '🏺', '⚱️'
];

// Get emoji for dungeon based on ID (deterministic hash)
const getDungeonEmoji = (dungeonId: string): string => {
    // Simple hash function to get consistent emoji for each dungeon
    let hash = 0;
    for (let i = 0; i < dungeonId.length; i++) {
        const char = dungeonId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % DUNGEON_EMOJIS.length;
    return DUNGEON_EMOJIS[index];
};

// Check if two positions are too close (collision detection)
const isTooClose = (pos1: { x: number; y: number }, pos2: { x: number; y: number }, minDistance: number = 12): boolean => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
};

// Generate non-overlapping positions for dungeons
const generateNonOverlappingPositions = (count: number, minDistance: number = 12): Array<{ x: number; y: number }> => {
    return generateNonOverlappingPositionsWithExisting(count, [], minDistance);
};

// Generate non-overlapping positions considering existing positions
const generateNonOverlappingPositionsWithExisting = (
    count: number,
    existingPositions: Array<{ x: number; y: number }> = [],
    minDistance: number = 12
): Array<{ x: number; y: number }> => {
    const positions: Array<{ x: number; y: number }> = [...existingPositions];
    const maxAttempts = 100; // Maximum attempts to find a non-overlapping position
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let position: { x: number; y: number } | null = null;
        
        while (attempts < maxAttempts) {
            const candidate = {
                x: 10 + Math.random() * 80, // Between 10% and 90%
                y: 10 + Math.random() * 80,
            };
            
            // Check if this position is far enough from all existing positions (including already placed ones)
            const isValid = positions.every(pos => !isTooClose(candidate, pos, minDistance));
            
            if (isValid) {
                position = candidate;
                break;
            }
            
            attempts++;
        }
        
        // If we couldn't find a non-overlapping position, use a fallback grid-based position
        if (!position) {
            const totalCount = positions.length + count;
            const gridSize = Math.ceil(Math.sqrt(totalCount));
            const cellWidth = 80 / gridSize;
            const cellHeight = 80 / gridSize;
            const totalIndex = positions.length;
            const row = Math.floor(totalIndex / gridSize);
            const col = totalIndex % gridSize;
            position = {
                x: 10 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * (cellWidth * 0.6),
                y: 10 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * (cellHeight * 0.6),
            };
        }
        
        positions.push(position);
    }
    
    // Return only the new positions (not the existing ones)
    return positions.slice(existingPositions.length);
};

export const MapScene: React.FC = () => {
    const { selectedPartyTokenIds, setSelectedPartyTokenIds, currentRunId, setCurrentRunId, switchView } = useGameStore();
    const { address, isConnected } = useAccount();
    const authenticated = isConnected;

    const [dungeons, setDungeons] = useState<DungeonIcon[]>([]);
    const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPartySelector, setShowPartySelector] = useState(false);
    const [creatingRun, setCreatingRun] = useState(false);
    const [currentPartyId, setCurrentPartyId] = useState<string | null>(null);

    const [stats, setStats] = useState<{ dailyRuns: number; remainingFreeRuns: number } | null>(null);
    const [runCostMon, setRunCostMon] = useState<string>('0');

    // Poll run status if we have a current run
    const { status: runStatus } = useRunStatus(currentRunId);

    // Clear party selection when returning to map if run is complete
    useEffect(() => {
        // If we have a run status and it's complete, clear the party selection
        if (runStatus?.result && (runStatus.result === 'victory' || runStatus.result === 'defeat')) {
            console.log(`[MapScene] Run ${currentRunId} is ${runStatus.result}, clearing party selection`);
            setSelectedPartyTokenIds([]);
            setCurrentRunId(null);
        }
    }, [runStatus?.result, currentRunId, setSelectedPartyTokenIds, setCurrentRunId]);

    // Clear party selection when map view is first loaded (if no active run)
    useEffect(() => {
        if (!currentRunId && selectedPartyTokenIds.length > 0) {
            console.log(`[MapScene] No active run but party is selected, clearing party selection`);
            setSelectedPartyTokenIds([]);
        }
    }, []); // Only run on mount

    // Fetch Stats & Dungeons
    useEffect(() => {
        const fetchDungeons = async () => {
            try {
                // Fetch all available dungeons
                const dungeonsRes = await fetch('/api/dungeons');
                if (!dungeonsRes.ok) throw new Error('Failed to load dungeons');
                const dungeonsData = await dungeonsRes.json();
                
                if (!dungeonsData.dungeons || dungeonsData.dungeons.length === 0) {
                    throw new Error('No dungeons available');
                }
                
                // Separate dungeons with and without positions
                const dungeonsWithPositions: Dungeon[] = [];
                const dungeonsWithoutPositions: Dungeon[] = [];
                
                dungeonsData.dungeons.forEach((dungeon: Dungeon) => {
                    if (dungeon.icon_x !== null && dungeon.icon_x !== undefined && 
                        dungeon.icon_y !== null && dungeon.icon_y !== undefined) {
                        dungeonsWithPositions.push(dungeon);
                    } else {
                        dungeonsWithoutPositions.push(dungeon);
                    }
                });
                
                // Generate positions only for dungeons that don't have them
                let newPositions: Array<{ x: number; y: number }> = [];
                if (dungeonsWithoutPositions.length > 0) {
                    // Consider existing positions when generating new ones to avoid overlap
                    const existingPositions = dungeonsWithPositions.map(d => ({ x: d.icon_x!, y: d.icon_y! }));
                    newPositions = generateNonOverlappingPositionsWithExisting(
                        dungeonsWithoutPositions.length,
                        existingPositions
                    );
                    
                    // Save new positions to database
                    await Promise.all(dungeonsWithoutPositions.map(async (dungeon, index) => {
                        const pos = newPositions[index];
                        try {
                            await fetch('/api/dungeons/update-icon-position', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    dungeonId: dungeon.id,
                                    icon_x: pos.x,
                                    icon_y: pos.y,
                                }),
                            });
                        } catch (e) {
                            console.warn(`Failed to save icon position for dungeon ${dungeon.id}:`, e);
                        }
                    }));
                }
                
                // Combine all dungeons with their positions
                const allDungeons: Dungeon[] = [
                    ...dungeonsWithPositions,
                    ...dungeonsWithoutPositions.map((dungeon, index) => ({
                        ...dungeon,
                        icon_x: newPositions[index].x,
                        icon_y: newPositions[index].y,
                    })),
                ];
                
                // Create icons with positions and varied emojis (deterministic based on dungeon ID)
                const dungeonIcons: DungeonIcon[] = allDungeons.map((dungeon: Dungeon) => ({
                    ...dungeon,
                    x: dungeon.icon_x!,
                    y: dungeon.icon_y!,
                    emoji: getDungeonEmoji(dungeon.id),
                }));
                
                setDungeons(dungeonIcons);
            } catch (err) {
                console.error(err);
                setError('Could not load dungeons');
            } finally {
                setLoading(false);
            }
        };

        const fetchStats = async () => {
            if (!address) return;
            try {
                const res = await fetch(`/api/runs/stats?wallet=${address}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };

        const fetchPrice = async () => {
            try {
                const { calculateMonAmount } = await import('../../lib/services/monPriceService');
                const cost = await calculateMonAmount(0.25);
                setRunCostMon(cost);
            } catch (e) {
                console.error("Failed to fetch price", e);
            }
        };

        fetchDungeons();
        if (address) {
            fetchStats();
            fetchPrice();
        }
    }, [address]);

    // Transition to battle when run starts (has start_time but no end_time means it's running)
    useEffect(() => {
        if (runStatus && runStatus.start_time && !runStatus.end_time && currentRunId) {
            switchView(GameView.BATTLE);
        }
    }, [runStatus, currentRunId, switchView]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white font-pixel">
                <div className="text-center">
                    <div className="text-2xl mb-4">🗺️</div>
                    <div>Loading Map...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-red-400 font-pixel">
                <div className="text-center">
                    <div className="text-2xl mb-4">⚠️</div>
                    <div>{error}</div>
                    <PixelButton
                        variant="primary"
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        Retry
                    </PixelButton>
                </div>
            </div>
        );
    }

    if (dungeons.length === 0 && !loading) return null;

    const selectedDungeon = dungeons.find(d => d.id === selectedDungeonId);

    const handleDungeonIconClick = (dungeonId: string) => {
        // Toggle selection: if clicking the same icon, deselect; otherwise select the new one
        if (selectedDungeonId === dungeonId) {
            setSelectedDungeonId(null);
        } else {
            setSelectedDungeonId(dungeonId);
        }
    };

    async function handleEnterArea() {
        if (!authenticated || !address) {
            setError('Please connect your wallet');
            return;
        }

        // Always show party selector if no party is selected (even if we have a currentPartyId)
        // This ensures players always assemble a party before entering a dungeon
        if (selectedPartyTokenIds.length === 0) {
            console.log('[MapScene] No party selected, showing party selector');
            setShowPartySelector(true);
            return;
        }

        // Check availability/payment logic here or in handleCreateRun
        if (stats && stats.remainingFreeRuns === 0) {
            const confirmPay = confirm(`Daily free runs used. Pay ${runCostMon} MON (~$0.25) to start run?`);
            if (!confirmPay) return;
        }

        // If we have a party selected, create run
        if (selectedPartyTokenIds.length > 0) {
            await handleCreateRun(selectedPartyTokenIds);
        }
    }

    async function handleCreateRun(tokenIds: string[]) {
        setCreatingRun(true);
        setError(null);

        try {
            // Payment handling mock
            let paymentHash: string | undefined = undefined;
            if (stats && stats.remainingFreeRuns === 0) {
                // Simulate payment tx
                console.log("Processing payment...");
                paymentHash = "0xmock_payment_hash_" + Date.now();
            }

            // Use selected dungeon ID, or let API randomly select if none selected
            const result = await runService.createRun({
                dungeonId: selectedDungeonId || undefined, // Use selected dungeon or let API randomly select
                party: tokenIds,
                walletAddress: address as string,
                paymentHash
            });

            setCurrentRunId(result.id);

            // Refetch stats
            try {
                const res = await fetch(`/api/runs/stats?wallet=${address}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) {
                console.error("Failed to refetch stats", e);
            }

            // Transition to battle view (will be handled by run status polling)
            switchView(GameView.BATTLE);
        } catch (err) {
            console.error('Failed to create run:', err);
            // Check if error is handling JSON or just message
            let errMsg = 'Failed to create run';
            if (err instanceof Error) {
                errMsg = err.message;
                // If locking error, it might be in the message
            }
            setError(errMsg);
        } finally {
            setCreatingRun(false);
        }
    }

    // Map Visualization
    return (
        <div className="w-full h-full bg-[#1a120b] flex flex-col items-center py-8 relative overflow-hidden font-pixel">
            {/* Background Image Layer */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: "url('/sprites/palceholdermap.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.8
                }}
            />

            {/* Map Area - Dungeon Icons */}
            <div className="flex-1 w-full relative min-h-0">
                {dungeons.map((dungeon) => {
                    const isSelected = selectedDungeonId === dungeon.id;
                    return (
                        <div
                            key={dungeon.id}
                            className="absolute z-10"
                            style={{
                                left: `${dungeon.x}%`,
                                top: `${dungeon.y}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            {/* Platform (thin ellipse) */}
                            <button
                                onClick={() => handleDungeonIconClick(dungeon.id)}
                                className={`
                                    relative transition-all duration-300 cursor-pointer
                                    ${isSelected ? 'scale-110' : 'hover:scale-105'}
                                `}
                                title={dungeon.name}
                            >
                                {/* Ellipse platform (miniature base perspective - circular but slightly squashed) */}
                                <div 
                                    className={`
                                        w-9 h-7 rounded-full border-2 shadow-lg
                                        ${isSelected
                                            ? 'bg-[#5c4033] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                                            : 'bg-[#2a1d17] border-[#5c4033] hover:border-amber-700'}
                                    `}
                                />
                                
                                {/* Icon sitting on platform */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg">
                                    {dungeon.emoji}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Action Area */}
            <div className="w-full px-6 pb-6 z-20 mt-auto">
                <div className="flex flex-col gap-2 mb-4">
                    {stats && (
                        <div className="text-center font-pixel text-xs">
                            {stats.remainingFreeRuns > 0 ? (
                                <span className="text-green-400">Free Runs Available: {stats.remainingFreeRuns}/2</span>
                            ) : (
                                <span className="text-amber-400">Daily Limit Reached. Cost: {runCostMon} MON ($0.25)</span>
                            )}
                        </div>
                    )}
                    {selectedDungeon && (
                        <div className="text-center font-pixel text-xs text-amber-300">
                            {selectedDungeon.name}
                        </div>
                    )}
                </div>

                <PixelButton
                    variant="primary"
                    className="w-full py-4 text-sm tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.5)] border-amber-600"
                    onClick={handleEnterArea}
                    disabled={creatingRun || !authenticated || !address}
                >
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-xl">⚔️</span>
                        <span>
                            {creatingRun ? 'CREATING RUN...' :
                                (stats && stats.remainingFreeRuns === 0) ? 'START RUN (PAY)' : 'ENTER AREA'}
                        </span>
                    </div>
                </PixelButton>
                {!authenticated && (
                    <div className="text-xs text-red-400 text-center mt-2">
                        Please connect your wallet to start a run
                    </div>
                )}
                {authenticated && selectedPartyTokenIds.length === 0 && !currentPartyId && (
                    <div className="text-xs text-amber-400 text-center mt-2">
                        Select a party to begin
                    </div>
                )}
                {error && (
                    <div className="text-xs text-red-400 text-center mt-2 bg-red-900/20 p-2 border border-red-800 rounded">
                        {error}
                    </div>
                )}
            </div>

            {/* Party Selector Modal */}
            {showPartySelector && address && !currentPartyId && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl">
                        <PartySelector
                            walletAddress={address}
                            dungeonId={selectedDungeonId || undefined}
                            onConfirm={async (tokenIds, mode, partyId) => {
                                if (mode === 'public' && partyId) {
                                    // Show public lobby
                                    setCurrentPartyId(partyId);
                                    setShowPartySelector(false);
                                } else {
                                    // Solo or own-party: create run immediately
                                    setSelectedPartyTokenIds(tokenIds);
                                    setShowPartySelector(false);
                                    // Create run
                                    await handleCreateRun(tokenIds);
                                }
                            }}
                            onCancel={() => setShowPartySelector(false)}
                        />
                    </div>
                </div>
            )}

            {/* Public Party Lobby */}
            {currentPartyId && address && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl">
                        <PublicPartyLobby
                            partyId={currentPartyId}
                            walletAddress={address}
                            onPartyStart={(runId) => {
                                setCurrentRunId(runId);
                                setCurrentPartyId(null);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
