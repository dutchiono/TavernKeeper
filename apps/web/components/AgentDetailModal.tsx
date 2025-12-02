import React, { useState } from 'react';
import { Agent } from '../lib/types';
import { useGameStore } from '../lib/stores/gameStore';
import { PixelBox, PixelButton, PixelBadge } from './PixelComponents';
import { chatWithAgent } from '../app/actions/aiActions';
import { X, Send } from 'lucide-react';

interface AgentDetailModalProps {
    agent: Agent;
    onClose: () => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose }) => {
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent', text: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
        setIsLoading(true);

        const response = await chatWithAgent(agent, userMsg);

        setIsLoading(false);
        setChatHistory(prev => [...prev, { sender: 'agent', text: response }]);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4">
            <div className="w-full h-full md:max-w-4xl md:h-[85vh] flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden bg-[#1a120b] md:bg-transparent">

                {/* Mobile Close Button (Top Right) */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 md:hidden z-50 bg-red-600 text-white p-2 border-2 border-white shadow-lg active:scale-95"
                >
                    <X size={20} />
                </button>

                {/* Left Column: Stats & Gear */}
                <PixelBox className="w-full md:w-1/3 flex flex-col gap-4 bg-[#2a1d17] shrink-0" title="Character Sheet">
                    <div className="flex flex-col items-center border-b-2 border-[#4a3b32] pb-4 mt-2">
                        <div className="w-24 h-24 border-4 border-[#eaddcf] mb-2 shadow-lg" style={{ backgroundColor: agent.spriteColor }} />
                        <h2 className="text-xl text-yellow-400 font-bold tracking-wide drop-shadow-md">{agent.name}</h2>
                        <span className="text-xs text-[#eaddcf]/70 uppercase tracking-wider">Lvl {agent.level} {agent.class}</span>
                    </div>

                    <div className="space-y-3 text-sm px-2">
                        <div className="flex justify-between items-center bg-black/20 p-1 rounded">
                            <span className="text-[#eaddcf]">HP</span>
                            <div className="w-24 h-3 bg-black/50 border border-white/10 rounded-full overflow-hidden relative">
                                <div style={{ width: `${(agent.stats.hp / agent.stats.maxHp) * 100}%` }} className="h-full bg-red-600 absolute top-0 left-0" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">{agent.stats.hp}/{agent.stats.maxHp}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-black/20 p-1 rounded">
                            <span className="text-[#eaddcf]">MP</span>
                            <div className="w-24 h-3 bg-black/50 border border-white/10 rounded-full overflow-hidden relative">
                                <div style={{ width: `${(agent.stats.mp / agent.stats.maxMp) * 100}%` }} className="h-full bg-blue-500 absolute top-0 left-0" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">{agent.stats.mp}/{agent.stats.maxMp}</span>
                            </div>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>STR</span> <span className="text-yellow-400">{agent.stats.str}</span></div>
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>INT</span> <span className="text-blue-300">{agent.stats.int}</span></div>
                    </div>

                    <div className="mt-2 px-2">
                        <h3 className="text-[10px] uppercase text-[#eaddcf]/50 mb-2 tracking-widest">Traits</h3>
                        <div className="flex flex-wrap gap-2">
                            {agent.traits.map(t => <PixelBadge key={t} text={t} />)}
                        </div>
                    </div>

                    <div className="mt-auto px-2 pb-2">
                        <h3 className="text-[10px] uppercase text-[#eaddcf]/50 mb-2 tracking-widest">Inventory</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {agent.inventory.map((item, i) => (
                                <div key={i} className="aspect-square bg-[#1a120b] border-2 border-[#4a3b32] hover:border-[#eaddcf] flex items-center justify-center text-[10px] text-center p-1 overflow-hidden shadow-inner cursor-help transition-colors" title={item}>
                                    {item.substring(0, 2).toUpperCase()}
                                </div>
                            ))}
                            {[...Array(Math.max(0, 8 - agent.inventory.length))].map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square bg-[#1a120b]/50 border-2 border-[#2a1d17] border-dashed" />
                            ))}
                        </div>
                    </div>
                </PixelBox>

                {/* Right Column: Interaction */}
                <div className="flex-1 flex flex-col gap-4 min-h-[400px]">
                    <PixelBox className="flex-1 flex flex-col h-full" title={`Talk to ${agent.name}`} variant="paper">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4 bg-[#eaddcf]/10 border-2 border-[#855e42]/20 inset-shadow rounded min-h-[200px]">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-[#eaddcf]/40 italic mt-10 flex flex-col items-center gap-2">
                                    <span className="text-2xl">💬</span>
                                    Start a conversation with {agent.name}...
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 text-sm leading-relaxed border-2 shadow-sm ${msg.sender === 'user' ? 'bg-[#eaddcf] border-[#855e42] text-[#2a1d17]' : 'bg-[#2a1d17] border-[#4a3b32] text-[#eaddcf]'}`}>
                                        {msg.sender === 'agent' && <span className="block text-[9px] uppercase text-[#eaddcf]/50 mb-1 tracking-wider">{agent.name}</span>}
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && <div className="text-[#eaddcf] text-xs animate-pulse flex items-center gap-2"><span>⏳</span> Thinking...</div>}
                        </div>

                        <div className="flex gap-2 pt-2 border-t-2 border-[#855e42]/20">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                className="flex-1 bg-[#1a120b] border-2 border-[#4a3b32] p-3 text-sm focus:outline-none focus:border-[#eaddcf] text-[#eaddcf] placeholder:text-[#eaddcf]/20"
                                placeholder="Say something..."
                            />
                            <PixelButton onClick={handleSend} className="px-4">
                                <Send size={16} />
                            </PixelButton>
                        </div>
                    </PixelBox>

                    <div className="mt-2 bg-[#2a1d17] p-3 border-2 border-[#4a3b32] rounded">
                        <h3 className="text-[10px] uppercase text-[#eaddcf]/50 mb-2 tracking-widest">Appearance</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#ffffff', '#000000'].map(color => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 shrink-0 border-2 ${agent.spriteColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-slate-600 hover:border-slate-400'} transition-all rounded-sm`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        useGameStore.getState().updateAgent(agent.id, { spriteColor: color });
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:flex justify-end mt-auto">
                        <PixelButton variant="danger" onClick={onClose} className="flex items-center gap-2 px-6 py-2">
                            <X size={16} /> Close Panel
                        </PixelButton>
                    </div>
                </div>

            </div>
        </div>
    );
};
