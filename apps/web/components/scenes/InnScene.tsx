import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../lib/stores/gameStore';
import { generateAgentThought } from '../../app/actions/aiActions';
import { AgentDetailModal } from '../AgentDetailModal';

export const InnScene: React.FC = () => {
    const { party: agents } = useGameStore();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [thoughtBubbles, setThoughtBubbles] = useState<{ [key: string]: string }>({});

    // Generate random thoughts
    useEffect(() => {
        const interval = setInterval(async () => {
            if (Math.random() > 0.3) return; // Only sometimes generate a thought

            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            if (!randomAgent) return;

            const thought = await generateAgentThought(randomAgent, {
                location: 'The Rusty Tankard Inn',
                activity: 'drinking ale at the bar',
                nearbyAgents: agents.filter(a => a.id !== randomAgent.id).map(a => a.name)
            });

            setThoughtBubbles(prev => ({ ...prev, [randomAgent.id]: thought }));

            // Clear thought after 5 seconds
            setTimeout(() => {
                setThoughtBubbles(prev => {
                    const next = { ...prev };
                    delete next[randomAgent.id];
                    return next;
                });
            }, 5000);

        }, 8000);

        return () => clearInterval(interval);
    }, [agents]);

    return (
        <div className="w-full h-full relative bg-[#2a1d15] overflow-hidden flex flex-col items-center justify-center">
            {/* Generated Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center z-0"
                style={{ backgroundImage: "url('/sprites/inn_diagonal_bg.png')" }}
            />

            {/* Diagonal Overlay for Interaction (Invisible/Guide) */}
            {/* The bar runs bottom-left to top-right. We position characters along this line. */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {/* Party Members - Positioned Diagonally */}
                {agents.map((agent, index) => {
                    // Calculate diagonal position
                    // Start from bottom-left (20%, 80%) to top-right (80%, 40%)
                    const step = 60 / (agents.length + 1);
                    const left = 20 + (step * (index + 1));
                    const top = 80 - (step * (index + 1) * 0.6); // Slope adjustment

                    return (
                        <div
                            key={agent.id}
                            className="absolute group cursor-pointer pointer-events-auto transition-transform hover:-translate-y-2"
                            style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                transform: 'translate(-50%, -100%)' // Anchor at feet
                            }}
                            onClick={() => setSelectedAgentId(agent.id)}
                        >
                            {/* Thought Bubble - Removed per user request to avoid confusion/accidental clicks */}
                            {/* {thoughtBubbles[agent.id] && (
                                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-32 bg-white text-black text-[8px] p-2 rounded border-2 border-black z-50 animate-bounce shadow-lg text-center leading-tight">
                                    {thoughtBubbles[agent.id]}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-black rotate-45" />
                                </div>
                            )} */}

                            {/* Character Sprite (Hidden for now per user request) */}
                            {/* We keep the container for interaction but hide the sprite */}
                            <div className="relative opacity-0 group-hover:opacity-50 transition-opacity">
                                {/* Shadow */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-4 bg-black/40 rounded-full blur-[2px]" />

                                {/* Sprite Rendering (Hidden) */}
                                <div
                                    className="w-24 h-24 bg-no-repeat bg-contain bg-center relative z-10"
                                    style={{
                                        backgroundImage: `url('/sprites/${agent.class === 'Warrior' ? 'warrior_sitting.png' :
                                            agent.class === 'Mage' ? 'mage_sitting.png' :
                                                'rogue_sitting.png'
                                            }')`,
                                        filter: `drop-shadow(0 4px 4px rgba(0,0,0,0.5))`
                                    }}
                                />
                            </div>

                            {/* Name Tag */}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[8px] px-2 py-0.5 rounded border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                {agent.name}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Foreground Overlay (Vignette) */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)] z-40" />

            {/* Agent Detail Modal */}
            {selectedAgentId && (
                <AgentDetailModal
                    agent={agents.find(a => a.id === selectedAgentId)!}
                    onClose={() => setSelectedAgentId(null)}
                />
            )}
        </div>
    );
};
