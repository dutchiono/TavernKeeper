'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../lib/stores/gameStore';

export const ChatOverlay: React.FC = () => {
    const logs = useGameStore((state) => state.logs);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            // Mock TavernKeeper Agent
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

            // Import dynamically to avoid circular deps if any, or just use standard import
            const { chatWithAgent } = await import('../services/geminiService');
            const response = await chatWithAgent(tavernKeeper, userMessage);

            // Remove thinking log and add real response (in a real app we'd update the log, here we just add new one)
            // Actually, let's just add the new one. The "..." will stay as a "thinking" indicator or we can remove it.
            // For simplicity, let's just add the response.

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
        <div className="w-full h-full flex flex-col">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar p-2 mb-2">
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

            {/* Chat Input */}
            <div className="mt-auto pt-2 border-t-2 border-amber-900/20 flex gap-2 shrink-0">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask the TavernKeeper..."
                    className="flex-1 bg-[#eaddcf] border-2 border-[#855e42] text-amber-950 px-3 py-2 text-xs font-pixel focus:outline-none focus:border-amber-600 placeholder:text-amber-900/40 rounded-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    className="bg-[#855e42] text-[#eaddcf] px-3 border-2 border-[#5c4b40] hover:bg-[#5c4b40] active:translate-y-1 transition-all rounded-sm shadow-md"
                >
                    ➤
                </button>
            </div>
        </div>
    );
};
