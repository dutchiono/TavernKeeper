
import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../lib/stores/gameStore';
import { useRunPlayback } from '../../lib/hooks/useRunPlayback';
import { useReplayStore } from '../../lib/stores/replayStore';
import { DungeonMapVisualizer } from './DungeonMapVisualizer';
import { BattleOverlay } from './BattleOverlay';
import { PlaybackControls } from './PlaybackControls';
import { PixelButton, PixelBox } from '../PixelComponents';
import { GameView } from '../../lib/types';

export const DungeonReplayScene: React.FC = () => {
    const { currentRunId, switchView } = useGameStore();
    const { events, currentEventIndex } = useReplayStore();

    // Initialize playback
    useRunPlayback(currentRunId);

    // Auto-scroll log
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentEventIndex]);

    return (
        <div className="w-full h-full flex flex-col bg-[#2a1d17] font-pixel relative">
            {/* Header */}
            <div className="h-12 border-b-4 border-[#5c4033] bg-[#2a1d17] flex items-center justify-between px-4 z-10">
                <span className="text-[#eaddcf] font-bold">Dungeon Replay</span>
                <PixelButton variant="neutral" onClick={() => switchView(GameView.INN)} className="text-xs py-1">
                    Exit Replay
                </PixelButton>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex relative overflow-hidden">
                {/* Map View (Left/Center) */}
                <div className="flex-1 relative border-r-4 border-[#5c4033]">
                    <DungeonMapVisualizer />
                    <BattleOverlay />
                </div>

                {/* Event Log (Right Sidebar) */}
                <div className="w-64 bg-[#1a120b] flex flex-col">
                    <div className="p-2 text-[#8c7b63] text-xs border-b border-[#5c4033]">LOG</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
                        {events.slice(0, currentEventIndex + 1).map((e, i) => {
                            const p = e.payload || e;
                            let msg = p.message || `${e.type}`;
                            if (p.action === 'move') msg = `Moved to (${p.location?.x}, ${p.location?.y})`;
                            if (p.type === 'combat') msg = `Combat: ${p.actorId} -> ${p.targetId}`;

                            return (
                                <div key={i} className="text-[#eaddcf]/80 border-b border-[#5c4033]/30 pb-1">
                                    <span className="text-[#8c7b63] mr-2">
                                        {new Date(e.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    {msg}
                                </div>
                            );
                        })}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <PlaybackControls />
        </div>
    );
};
