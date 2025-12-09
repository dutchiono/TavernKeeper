
import React from 'react';
import { useReplayStore } from '../../lib/stores/replayStore';
import { PixelBox } from '../PixelComponents';

export const BattleOverlay: React.FC = () => {
    const { activeBattleEvent } = useReplayStore();

    if (!activeBattleEvent) return null;

    // Parse payload
    // Engine event: { type: 'combat', actorId, targetId, action, damage, ... }
    const { actorId, targetId, action, damage, hit, message } = activeBattleEvent.payload || activeBattleEvent;

    // Determine text
    let displayMessage = message || `${actorId} performs ${action}`;
    if (action === 'attack') {
        displayMessage = hit
            ? `${actorId} hits ${targetId} for ${damage} damage!`
            : `${actorId} missed ${targetId}!`;
    }

    return (
        <div className="absolute inset-x-4 bottom-24 z-50 flex justify-center animate-bounce-in">
            <div className="w-full max-w-lg bg-red-900/90 border-4 border-red-500 p-1 shadow-2xl rounded-lg">
                <div className="bg-black/50 p-4 text-center">
                    <h2 className="text-red-400 font-bold text-xl mb-2 font-pixel">⚔️ BATTLE ENCOUNTER ⚔️</h2>

                    <div className="flex justify-between items-center px-8 my-4 font-pixel text-[#eaddcf]">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-700 border-2 border-blue-400 flex items-center justify-center text-2xl">
                                🛡️
                            </div>
                            <span className="text-xs mt-1 truncate max-w-[80px]">{actorId}</span>
                        </div>

                        <div className="text-3xl text-yellow-500 font-bold">VS</div>

                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-700 border-2 border-red-400 flex items-center justify-center text-2xl">
                                👹
                            </div>
                            <span className="text-xs mt-1 truncate max-w-[80px]">{targetId}</span>
                        </div>
                    </div>

                    <div className="text-lg font-pixel text-white bg-black/40 p-2 rounded">
                        {displayMessage}
                    </div>
                </div>
            </div>
        </div>
    );
};
