'use client';

import React, { useState } from 'react';
import { useGameStore } from '../lib/stores/gameStore';
import { worldService } from '../lib/world/worldService';

export const WorldGeneratorDebug: React.FC = () => {
    const [seed, setSeed] = useState('innkeeper-alpha');
    const [isGenerating, setIsGenerating] = useState(false);

    const maps = useGameStore((state) => state.maps);
    const items = useGameStore((state) => state.items);

    const [isOpen, setIsOpen] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await worldService.generateAndStoreWorld(seed);
        } catch (error) {
            console.error('Failed to generate world:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLoadDemo = async () => {
        setIsGenerating(true);
        try {
            await worldService.loadDemoWorld();
        } catch (error) {
            console.error('Failed to load demo world:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-slate-800 text-white px-3 py-1 rounded-t-lg border border-slate-600 border-b-0 text-xs font-bold hover:bg-slate-700 transition-colors"
            >
                🛠️ Debug World
            </button>
        );
    }

    return (
        <div className="p-4 bg-slate-800 text-white rounded-lg border border-slate-600 shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">World Generator Debug</h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white flex-1"
                        placeholder="Enter seed..."
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Random'}
                    </button>
                </div>

                <div className="flex gap-4 border-t border-slate-700 pt-4">
                    <button
                        onClick={handleLoadDemo}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold disabled:opacity-50 flex-1"
                    >
                        Load Demo Content (3 Maps)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Maps ({maps.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-900 p-2 rounded custom-scrollbar">
                        {maps.map((map) => (
                            <div key={map.id} className="p-2 border border-slate-700 rounded bg-slate-800">
                                <div className="font-bold text-yellow-400">{map.name}</div>
                                <div className="text-xs text-slate-400">{map.geographyType}</div>
                                <div className="text-sm mt-1">{map.description}</div>
                            </div>
                        ))}
                        {maps.length === 0 && <div className="text-slate-500 italic">No maps generated yet.</div>}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Items ({items.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-900 p-2 rounded custom-scrollbar">
                        {items.map((item) => (
                            <div key={item.content.id} className="p-2 border border-slate-700 rounded bg-slate-800">
                                <div className="font-bold text-green-400">{item.content.name}</div>
                                <div className="text-xs text-slate-400">{item.content.type} - {item.content.metadata?.rarity as string || 'common'}</div>
                                <div className="text-xs text-slate-500 mt-1">Found in: {item.content.metadata?.foundIn as string || 'Unknown'}</div>
                            </div>
                        ))}
                        {items.length === 0 && <div className="text-slate-500 italic">No items generated yet.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
