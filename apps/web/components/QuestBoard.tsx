'use client';

import React, { useEffect, useState, useRef } from 'react';
import tavernSocket, { DungeonEvent } from '../lib/socket';

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', cleric: '✨', traveler: '👤',
};

interface PartyMember {
  id: string;
  name: string;
  class: string;
  epithet: string;
  hp: number;
  max_hp: number;
}

interface ActiveRun {
  run_id: string;
  status: string;
  current_room: number;
  total_rooms: number;
  party: PartyMember[];
  last_narration: { narration?: string; message?: string } | null;
}

interface Props {
  onRunSelect?: (runId: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function QuestBoard({ onRunSelect }: Props) {
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  const [feed, setFeed] = useState<DungeonEvent[]>([]);
  const [pulsingRuns, setPulsingRuns] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch active runs
  const fetchRuns = async () => {
    try {
      const res = await fetch(`${API}/tavern/party-status`);
      const data = await res.json();
      const runIds: string[] = (data.active_runs || []).map((r: { id: string }) => r.id);
      const details = await Promise.all(
        runIds.map((id) =>
          fetch(`${API}/dungeon/state/${id}`).then((r) => r.json()).catch(() => null)
        )
      );
      setRuns(details.filter(Boolean));
    } catch (e) {
      console.error('[QuestBoard] fetch error', e);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, []);

  // Listen to dungeon events from socket
  useEffect(() => {
    tavernSocket.connect();
    tavernSocket.joinRoom('tavern-general', { sender_name: 'Observer', sender_type: 'human', class: 'traveler' });

    const offEvent = tavernSocket.onDungeonEvent((event) => {
      setFeed((prev) => [event, ...prev].slice(0, 20));
      // Pulse the relevant run card
      const runId = event.room?.replace('dungeon-', '');
      if (runId) {
        setPulsingRuns((prev) => new Set(prev).add(runId));
        setTimeout(() => {
          setPulsingRuns((prev) => { const s = new Set(prev); s.delete(runId); return s; });
        }, 2000);
      }
      // Refresh run data
      fetchRuns();
    });

    return () => { offEvent(); };
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollLeft = 0;
  }, [feed]);

  return (
    <div className="flex flex-col gap-6">
      {/* Active Dungeon Runs */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-cinzel text-amber-400 text-lg font-bold tracking-widest uppercase">Active Quests</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-amber-800 to-transparent" />
          <span className="text-xs font-pixel text-stone-500">{runs.length} running</span>
        </div>

        {runs.length === 0 ? (
          <div className="border border-dashed border-[#5c3d1e] rounded-lg p-8 text-center">
            <p className="text-stone-600 text-sm font-pixel">No parties in the dungeon...</p>
            <p className="text-stone-700 text-xs mt-2">Waiting for brave souls to form a party.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {runs.map((run) => (
              <RunCard
                key={run.run_id}
                run={run}
                isPulsing={pulsingRuns.has(run.run_id)}
                onClick={() => onRunSelect?.(run.run_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Live Feed Ticker */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-red-500 animate-pulse text-xs font-pixel">LIVE</span>
          <h2 className="font-cinzel text-stone-400 text-sm font-bold tracking-wider uppercase">Dungeon Feed</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-stone-800 to-transparent" />
        </div>
        <div
          ref={feedRef}
          className="bg-[#0e0905] border border-[#3d2810] rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-[#5c3d1e] scrollbar-track-transparent"
        >
          {feed.length === 0 ? (
            <p className="text-stone-700 text-xs font-pixel text-center py-2">...silence from the depths...</p>
          ) : (
            feed.map((event, i) => (
              <div key={event.id || i} className="flex items-start gap-2 text-xs">
                <span className="text-stone-600 shrink-0 tabular-nums">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-amber-700">🎲</span>
                <span className="text-stone-400 leading-relaxed">{event.message}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function RunCard({ run, isPulsing, onClick }: { run: ActiveRun; isPulsing: boolean; onClick: () => void }) {
  const isActive = run.status === 'active';
  const narration = run.last_narration?.narration || run.last_narration?.message || 'The party descends into darkness...';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg border p-4 transition-all duration-300 cursor-pointer
        hover:border-amber-600 hover:shadow-[0_0_16px_rgba(217,119,6,0.2)]
        ${isPulsing
          ? 'border-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.35)] animate-pulse-subtle'
          : 'border-[#5c3d1e] bg-[#1c1108]'}
      `}
    >
      {/* Run header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-pixel text-stone-500">RUN</span>
          <span className="text-xs font-pixel text-amber-600">#{run.run_id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] font-pixel text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ACTIVE
            </span>
          )}
          <span className="text-xs text-stone-500">
            Room {run.current_room}/{run.total_rooms}
          </span>
        </div>
      </div>

      {/* Room progress bar */}
      <div className="w-full h-1.5 bg-stone-900 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-800 to-amber-500 rounded-full transition-all duration-700"
          style={{ width: `${(run.current_room / run.total_rooms) * 100}%` }}
        />
      </div>

      {/* Party members */}
      <div className="flex flex-wrap gap-2 mb-3">
        {run.party.map((member) => (
          <MemberPip key={member.id} member={member} />
        ))}
      </div>

      {/* Last narration */}
      <p className="text-xs text-stone-500 italic leading-relaxed line-clamp-2 border-t border-[#3d2810] pt-2 mt-2">
        &ldquo;{narration}&rdquo;
      </p>
    </button>
  );
}

function MemberPip({ member }: { member: PartyMember }) {
  const hpPct = Math.max(0, (member.hp / member.max_hp) * 100);
  const hpColor = hpPct > 60 ? 'bg-green-600' : hpPct > 30 ? 'bg-yellow-600' : 'bg-red-600';
  const icon = CLASS_ICONS[member.class] || '👤';

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="relative">
        <div className="w-8 h-8 rounded bg-stone-800 border border-[#5c3d1e] flex items-center justify-center text-base group-hover:border-amber-600 transition-colors">
          {icon}
        </div>
        {hpPct < 30 && (
          <span className="absolute -top-1 -right-1 text-[8px]">💀</span>
        )}
      </div>
      {/* HP bar */}
      <div className="w-8 h-1 bg-stone-900 rounded-full overflow-hidden">
        <div className={`h-full ${hpColor} rounded-full transition-all duration-500`} style={{ width: `${hpPct}%` }} />
      </div>
      <span className="text-[9px] text-stone-600 max-w-[32px] truncate">{member.name.split(' ')[0]}</span>
    </div>
  );
}