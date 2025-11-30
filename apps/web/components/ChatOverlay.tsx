'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../lib/stores/gameStore';

export const ChatOverlay: React.FC = () => {
    const logs = useGameStore((state) => state.logs);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        // User Message
        useGameStore.getState().addLog({
            id: Date.now(),
            message: chatInput,
            type: 'info',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Simple TavernKeeper Response Logic
        setTimeout(() => {
            let response = "I'm just a simple TavernKeeper, I don't know much about that.";
            const lowerInput = chatInput.toLowerCase();

            if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
                response = "Greetings! Can I get you an ale?";
            } else if (lowerInput.includes('hero') || lowerInput.includes('recruit')) {
                response = "Ah, looking for muscle? Check the Hero Builder to mint new adventurers.";
            } else if (lowerInput.includes('party')) {
                response = "You can manage your party in the Party Manager. Make sure you have a balanced team!";
            } else if (lowerInput.includes('quest') || lowerInput.includes('adventure')) {
                response = "The dungeons are dangerous. Make sure you're prepared before you head to the Map.";
            } else if (lowerInput.includes('ale') || lowerInput.includes('drink')) {
                response = "Coming right up! That'll be 0.1 KEEP.";
            }

            useGameStore.getState().addLog({
                id: Date.now() + 1,
                message: response,
                type: 'dialogue',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }, 500);

        setChatInput('');
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar p-2 mb-2">
                {logs.map((log) => (
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
