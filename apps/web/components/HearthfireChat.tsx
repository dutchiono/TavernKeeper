'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import tavernSocket, { ChatMessage, SenderType } from '../lib/socket';

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', cleric: '✨',
  innkeeper: '🍺', dm: '🎲', traveler: '👤', system: '🏰',
};

const BADGE: Record<SenderType, { label: string; className: string }> = {
  human:  { label: 'HUMAN', className: 'bg-stone-700 text-stone-300' },
  agent:  { label: 'AGENT', className: 'bg-amber-900 text-amber-300 border border-amber-600' },
  npc:    { label: 'NPC',   className: 'bg-yellow-900 text-yellow-300 border border-yellow-500' },
};

interface Tab { id: string; label: string; room: string; }

interface Props {
  activeRunIds?: string[];
  userProfile?: { name: string; type: SenderType; class: string };
  isDrawerOpen?: boolean;
  onDrawerClose?: () => void;
}

export default function HearthfireChat({
  activeRunIds = [],
  userProfile = { name: 'Traveler', type: 'human', class: 'traveler' },
  isDrawerOpen = true,
  onDrawerClose,
}: Props) {
  const baseTabs: Tab[] = [
    { id: 'general', label: 'Tavern', room: 'tavern-general' },
    ...activeRunIds.map((id) => ({
      id: `run-${id}`,
      label: `Run #${id.slice(-4)}`,
      room: `dungeon-${id}`,
    })),
  ];

  const [tabs, setTabs] = useState<Tab[]>(baseTabs);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update tabs when active runs change
  useEffect(() => {
    setTabs([
      { id: 'general', label: 'Tavern', room: 'tavern-general' },
      ...activeRunIds.map((id) => ({
        id: `run-${id}`,
        label: `Run #${id.slice(-4)}`,
        room: `dungeon-${id}`,
      })),
    ]);
  }, [activeRunIds.join(',')]);

  // Socket setup
  useEffect(() => {
    const socket = tavernSocket.connect();

    socket.on('connect', () => {
      setConnected(true);
      // Join all rooms
      tabs.forEach((tab) => {
        tavernSocket.joinRoom(tab.room, {
          sender_name: userProfile.name,
          sender_type: userProfile.type,
          class: userProfile.class,
        });
      });
    });

    socket.on('disconnect', () => setConnected(false));

    const offMsg = tavernSocket.onMessage((msg) => {
      setMessages((prev) => ({
        ...prev,
        [msg.room]: [...(prev[msg.room] || []), msg],
      }));
      // Track unread for non-active tabs
      const tabForRoom = tabs.find((t) => t.room === msg.room);
      if (tabForRoom && tabForRoom.id !== activeTab) {
        setUnread((prev) => ({ ...prev, [tabForRoom.id]: (prev[tabForRoom.id] || 0) + 1 }));
      }
    });

    const offHistory = tavernSocket.onHistory((msgs) => {
      if (!msgs.length) return;
      const room = msgs[0].room;
      setMessages((prev) => ({ ...prev, [room]: msgs }));
    });

    return () => {
      offMsg();
      offHistory();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Clear unread on tab switch
  const switchTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setUnread((prev) => ({ ...prev, [tabId]: 0 }));
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !connected) return;
    const currentRoom = tabs.find((t) => t.id === activeTab)?.room || 'tavern-general';
    tavernSocket.sendMessage(currentRoom, input.trim());
    setInput('');
  }, [input, connected, activeTab, tabs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const currentRoom = tabs.find((t) => t.id === activeTab)?.room || 'tavern-general';
  const currentMessages = messages[currentRoom] || [];

  return (
    <div className={`
      hearthfire-chat flex flex-col h-full
      bg-[#1c1108] border-l border-[#5c3d1e]
      transition-transform duration-300
      ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#5c3d1e] bg-[#150e05]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="font-cinzel text-amber-400 font-bold text-sm tracking-wider">HEARTHFIRE</span>
          <span className={`w-2 h-2 rounded-full ml-1 ${connected ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`} />
        </div>
        {onDrawerClose && (
          <button onClick={onDrawerClose} className="text-stone-500 hover:text-amber-400 transition-colors text-xl leading-none">×</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#5c3d1e] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`
              relative px-4 py-2 text-xs font-pixel whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'text-amber-400 border-b-2 border-amber-500 bg-[#251a0e]'
                : 'text-stone-500 hover:text-stone-300 hover:bg-[#1e1408]'}
            `}
          >
            {tab.label}
            {(unread[tab.id] || 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unread[tab.id] > 9 ? '9+' : unread[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#5c3d1e]">
        {currentMessages.length === 0 && (
          <div className="text-center text-stone-600 text-xs font-pixel py-8">
            ...the hearth crackles quietly...
          </div>
        )}
        {currentMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_name === userProfile.name} />
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#5c3d1e] bg-[#150e05]">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? 'Speak your piece...' : 'Connecting to tavern...'}
            disabled={!connected}
            maxLength={500}
            className="
              flex-1 bg-[#251a0e] border border-[#5c3d1e] rounded px-3 py-2
              text-stone-200 text-xs placeholder-stone-600
              focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-900
              disabled:opacity-40 transition-all
            "
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="
              px-3 py-2 bg-amber-800 hover:bg-amber-700 active:bg-amber-900
              border border-amber-600 rounded text-amber-200 text-sm
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all hover:shadow-[0_0_8px_rgba(217,119,6,0.4)]
            "
          >
            🍺
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const isNpc = msg.sender_type === 'npc';
  const isAgent = msg.sender_type === 'agent';
  const icon = CLASS_ICONS[msg.class] || CLASS_ICONS[msg.sender_type] || '👤';
  const badge = BADGE[msg.sender_type as SenderType] || BADGE.human;
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`
      flex gap-2 group
      ${isNpc ? 'border-l-2 border-yellow-600 pl-2 bg-yellow-950/20 rounded-r py-1' : ''}
      ${isAgent ? 'border-l-2 border-amber-600 pl-2' : ''}
    `}>
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-sm
        ${isNpc ? 'bg-yellow-900/40' : isAgent ? 'bg-amber-900/40' : 'bg-stone-800'}
        ${isNpc ? 'shadow-[0_0_8px_rgba(234,179,8,0.3)]' : ''}
      `}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-xs font-semibold ${isNpc ? 'text-yellow-400' : isAgent ? 'text-amber-400' : 'text-stone-300'}`}>
            {msg.sender_name}
          </span>
          <span className={`text-[10px] px-1 rounded font-pixel ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-[10px] text-stone-600 ml-auto">{time}</span>
        </div>
        <p className={`text-xs leading-relaxed break-words ${isNpc ? 'text-yellow-200 italic' : 'text-stone-300'}`}>
          {msg.message}
        </p>
      </div>
    </div>
  );
}