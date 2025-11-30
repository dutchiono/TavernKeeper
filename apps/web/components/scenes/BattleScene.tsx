import React, { useState, useEffect } from 'react';
import { Agent } from '../../lib/types';
import { PixelBox, PixelButton } from '../PixelComponents';

interface BattleSceneProps {
    party: Agent[];
    onComplete: (success: boolean) => void;
}

export const BattleScene: React.FC<BattleSceneProps> = ({ party, onComplete }) => {
    const [turn, setTurn] = useState(0);
    const [enemyHp, setEnemyHp] = useState(100);
    const [battleLog, setBattleLog] = useState<string[]>(['A wild SLIME BLOCK appears!']);
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);

    // Simulate Battle Loop
    useEffect(() => {
        if (!party || party.length === 0) {
            return;
        }

        if (enemyHp <= 0) {
            setTimeout(() => onComplete(true), 2000);
            return;
        }

        const timer = setTimeout(() => {
            // Simple Turn Logic: Party Member -> Enemy -> Party Member -> ...
            const isPlayerTurn = turn % 2 === 0;

            if (isPlayerTurn) {
                // Player attacks
                const partyIndex = Math.floor(turn / 2) % party.length;
                const actor = party[partyIndex];

                // Fallback if actor is somehow undefined
                if (!actor) {
                    setTurn(t => t + 1);
                    return;
                }

                const damage = Math.floor(Math.random() * 20) + 10;
                setEnemyHp(prev => Math.max(0, prev - damage));
                setBattleLog(prev => [`${actor.name} attacks for ${damage} dmg!`, ...prev.slice(0, 3)]);

                // Visual Effects
                setShake(true);
                setFlash(true);
            } else {
                // Enemy attacks
                const targetIndex = Math.floor(Math.random() * party.length);
                const target = party[targetIndex];
                const damage = Math.floor(Math.random() * 10) + 5;

                // TODO: Update party HP in store (mocking visual only for now)
                setBattleLog(prev => [`Slime attacks ${target.name} for ${damage} dmg!`, ...prev.slice(0, 3)]);
                setShake(true);
            }

            setTurn(t => t + 1);

            // Reset effects
            setTimeout(() => {
                setShake(false);
                setFlash(false);
            }, 300);

        }, 1500); // Slow turns for retro feel

        return () => clearTimeout(timer);
    }, [turn, party, enemyHp, onComplete]);

    if (!party || party.length === 0) {
        return (
            <div className="w-full h-full bg-[#2a1d17] flex flex-col items-center justify-center font-pixel text-[#eaddcf] gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="text-xl">You need a party to battle!</div>
                <PixelButton variant="primary" onClick={() => window.location.href = '/party'}>
                    Assemble Party
                </PixelButton>
            </div>
        );
    }

    return (
        <div className={`w-full h-full bg-[#2a1d17] relative flex flex-col font-pixel overflow-hidden ${shake ? 'animate-shake' : ''}`}>
            {/* Flash Effect */}
            <div className={`absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-100 ${flash ? 'opacity-30' : 'opacity-0'}`} />

            {/* Combat Viewport */}
            <div className="flex-1 relative overflow-hidden bg-[#1a120b] border-b-4 border-[#5c4033]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(#4a3b32 2px, transparent 2px)',
                    backgroundSize: '20px 20px'
                }} />

                {/* Enemy Side */}
                <div className="absolute top-1/4 left-10 flex flex-col items-center">
                    <div className={`w-32 h-32 bg-green-600 border-4 border-green-800 shadow-xl transition-all duration-100 relative ${enemyHp < 100 ? 'animate-bounce' : ''}`}>
                        <div className="absolute inset-0 border-4 border-green-400 opacity-50"></div>
                        <div className="w-8 h-8 bg-black/40 absolute top-8 left-6"></div>
                        <div className="w-8 h-8 bg-black/40 absolute top-8 right-6"></div>
                        <div className="w-16 h-4 bg-black/40 absolute bottom-6 left-8"></div>
                    </div>

                    {/* Enemy HP Bar */}
                    <div className="mt-4 w-40 bg-[#2a1d17] border-2 border-[#8c7b63] p-1 relative">
                        <div className="h-3 bg-red-900 w-full absolute top-1 left-1" />
                        <div
                            className="h-3 bg-red-500 transition-all duration-300 relative z-10"
                            style={{ width: `${enemyHp}%` }}
                        />
                    </div>
                    <span className="mt-2 text-[#eaddcf] text-xs uppercase tracking-widest drop-shadow-md font-bold">
                        Slime Block <span className="text-yellow-500">Lv.5</span>
                    </span>
                </div>

                {/* Party Side */}
                <div className="absolute bottom-10 right-10 flex gap-6">
                    {party.map((agent, i) => (
                        <div key={agent.id} className={`transition-all duration-300 flex flex-col items-center gap-2 ${turn % party.length === i ? '-translate-y-4 scale-110 z-10' : 'opacity-80'}`}>
                            {/* PFP / Sprite */}
                            <div
                                className={`w-24 h-24 border-4 shadow-lg relative group transition-colors duration-300 ${turn % party.length === i ? 'border-yellow-400 bg-amber-900/20' : 'border-[#8c7b63] bg-[#2a1d17]'}`}
                            >
                                {/* Placeholder Sprite */}
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                    {agent.class === 'Warrior' ? '⚔️' : agent.class === 'Mage' ? '杖' : '🏹'}
                                </div>

                                {/* Selection Indicator */}
                                {turn % party.length === i && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce text-xl">▼</div>
                                )}
                            </div>

                            {/* HP Bar */}
                            <div className="w-24 h-2 bg-[#2a1d17] border border-[#8c7b63] p-0.5">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(agent.stats.hp / agent.stats.maxHp) * 100}%` }}
                                />
                            </div>

                            <div className={`text-[10px] uppercase font-bold tracking-wider ${turn % party.length === i ? 'text-yellow-400' : 'text-[#eaddcf]'}`}>
                                {agent.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Battle UI Box */}
            <div className="h-1/3 bg-[#2a1d17] border-t-4 border-[#5c4033] p-6 flex gap-6">
                <PixelBox className="flex-1 text-sm leading-loose font-mono" title="Combat Log" variant="paper">
                    <div className="flex flex-col-reverse h-full overflow-hidden">
                        {battleLog.map((log, i) => (
                            <div key={i} className={`py-1 border-b border-amber-900/10 ${i === 0 ? 'text-amber-900 font-bold' : 'text-amber-900/60'}`}>
                                {i === 0 ? '> ' : '  '}{log}
                            </div>
                        ))}
                    </div>
                </PixelBox>

                <div className="w-48 flex flex-col gap-3 justify-center">
                    <PixelButton variant="primary" disabled className="w-full py-3 text-lg shadow-md">Attack</PixelButton>
                    <PixelButton variant="secondary" disabled className="w-full py-2 opacity-50">Magic</PixelButton>
                    <PixelButton variant="neutral" disabled className="w-full py-2 opacity-50">Item</PixelButton>
                </div>
            </div>
        </div>
    );
};
