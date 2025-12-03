'use client';

import { Send, Minus, Maximize2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { chatWithAgent } from '../app/actions/aiActions';
import { useGameStore } from '../lib/stores/gameStore';
import { PixelButton } from './PixelComponents';

export const ChatOverlay: React.FC = () => {
    const logs = useGameStore((state) => state.logs);
    const [chatInput, setChatInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');

        // User Message
        useGameStore.getState().addLog({
            id: Date.now(),
            message: userMessage,
            type: 'info',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // AI Response Logic
        try {
            // TavernKeeper Agent
            const tavernKeeper = {
                id: 'tavern-keeper',
                name: 'TavernKeeper',
                class: 'Innkeeper',
                level: 99,
                traits: ['Friendly', 'Knowledgeable', 'Busy', 'Gossip'],
                backstory: 'I have run this inn for as long as I can remember. I know everyone and everything that passes through.',
                stats: { strength: 10, dexterity: 10, intelligence: 18, vitality: 10, speed: 10 }
            };

            // Add "Thinking..." placeholder
            const thinkingId = Date.now() + 1;
            useGameStore.getState().addLog({
                id: thinkingId,
                message: "...",
                type: 'dialogue',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // Call actual AI function
            const response = await chatWithAgent(tavernKeeper as any, userMessage);

            // Remove thinking log and add real response
            useGameStore.getState().addLog({
                id: Date.now() + 2,
                message: response,
                type: 'dialogue',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

        } catch (error) {
            console.error("AI Chat Error:", error);
            // Fallback
            useGameStore.getState().addLog({
                id: Date.now() + 3,
                message: "I'm a bit overwhelmed right now, ask me later!",
                type: 'dialogue',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    };

    return (
        <div className={`w-full flex flex-col bg-[#1a120b]/80 backdrop-blur-sm rounded-lg border-2 border-[#4a3b32] shadow-xl overflow-hidden relative transition-all duration-300 ${isMinimized ? 'h-auto' : 'h-full'}`}>
            {/* Header */}
            <div className="bg-[#2a1d17] p-2 border-b-2 border-[#4a3b32] flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[#eaddcf] font-bold text-xs tracking-wider">TAVERN CHAT</span>
                </div>
                <button className="text-[#a8a29e] hover:text-[#eaddcf] transition-colors">
                    {isMinimized ? <Maximize2 size={12} /> : <Minus size={12} />}
                </button>
            </div>

            {/* Chat Content - Hidden when minimized */}
            {!isMinimized && (
                <>
                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar p-2 mb-2" ref={scrollContainerRef}>
                        {[...logs].reverse().map((log) => (
                            <div key={log.id} className={`flex flex-col gap-1 ${log.type === 'info' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-2 rounded text-xs leading-relaxed shadow-sm border-b-2
                ${log.type === 'info'
                                        ? 'bg-[#d4c5b0] text-[#3e3224] border-[#8c7b63] rounded-tr-none'
                                        : 'bg-[#2a1d17] text-[#eaddcf] border-[#1a120b] rounded-tl-none'
                                    }`}>
                                    {log.message}
                                </div>
                                <span className="text-[8px] text-amber-900/40 font-mono px-1">{log.timestamp}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-2 bg-[#2a1d17] border-t-2 border-[#4a3b32] flex gap-2">
                        <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Speak thy mind..."
                            className="flex-1 bg-[#1a120b] border border-[#4a3b32] text-[#eaddcf] px-3 py-2 text-xs font-pixel focus:outline-none focus:border-[#eaddcf] placeholder:text-[#eaddcf]/20 rounded resize-none h-10 custom-scrollbar"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <PixelButton
                            onClick={handleSendMessage}
                            className="h-10 w-10 flex items-center justify-center !p-0"
                            variant="wood"
                        >
                            <Send size={16} />
                        </PixelButton>
                    </div>
                </>
            )}
        </div>
    );
};
