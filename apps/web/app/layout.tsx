'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import HearthfireChat from '../components/HearthfireChat';
import QuestBoard from '../components/QuestBoard';

// Lazy wallet imports — only loaded client-side
let ConnectButton: React.ComponentType<{ showBalance?: boolean }> | null = null;
if (typeof window !== 'undefined') {
  import('@rainbow-me/rainbowkit').then((m) => { ConnectButton = m.ConnectButton; });
}

const NAV_ITEMS = [
  { href: '/', label: 'Tavern', icon: '🏰' },
  { href: '/board', label: 'Board', icon: '📋' },
  { href: '/leaderboard', label: 'Legends', icon: '🏆' },
  { href: '/docs', label: 'Dev Guide', icon: '📖' },
];

interface ActiveRun { id: string; }

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TavernLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeRunIds, setActiveRunIds] = useState<string[]>([]);
  const [unreadBoard, setUnreadBoard] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch active run IDs for chat tabs
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch(`${API}/tavern/party-status`);
        const data = await res.json();
        setActiveRunIds((data.active_runs || []).map((r: ActiveRun) => r.id));
      } catch {}
    };
    fetchRuns();
    const interval = setInterval(fetchRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tavern-root min-h-screen bg-[#0e0905] flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-[#5c3d1e] bg-[#0e0905]/95 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded bg-amber-900 border border-amber-700 flex items-center justify-center text-base
                            group-hover:shadow-[0_0_12px_rgba(217,119,6,0.5)] transition-all">
              🏰
            </div>
            <span className="font-cinzel text-amber-400 font-black text-base tracking-widest hidden sm:block
                             group-hover:text-amber-300 transition-colors">
              TAVERNKEEPER
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-pixel text-stone-400
                           hover:text-amber-400 hover:bg-amber-950/40 transition-all relative"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/board' && unreadBoard > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unreadBoard}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right: wallet + chat toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Wallet connect — only on desktop */}
            <div className="hidden lg:block">
              <Suspense fallback={<div className="w-32 h-8 bg-stone-800 rounded animate-pulse" />}>
                <WalletButton />
              </Suspense>
            </div>

            {/* Chat toggle button */}
            <button
              onClick={() => setChatOpen((v) => !v)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-pixel transition-all
                ${chatOpen
                  ? 'bg-amber-900 border-amber-600 text-amber-300 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                  : 'bg-stone-900 border-stone-700 text-stone-400 hover:border-amber-700 hover:text-amber-400'}
              `}
            >
              🔥 <span className="hidden sm:inline">Hearthfire</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main two-column layout ── */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">

        {/* LEFT: main content column */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 overflow-y-auto">
          {/* Quest Board always visible on main page */}
          <Suspense fallback={<QuestBoardSkeleton />}>
            <QuestBoard onRunSelect={(runId) => {
              if (!activeRunIds.includes(runId)) setActiveRunIds((prev) => [...prev, runId]);
              setChatOpen(true);
            }} />
          </Suspense>

          {/* Page-specific content below */}
          <div className="mt-8">{children}</div>
        </main>

        {/* RIGHT: HearthfireChat — desktop sidebar */}
        {!isMobile && (
          <aside
            className={`
              flex-shrink-0 border-l border-[#5c3d1e] transition-all duration-300 overflow-hidden
              ${chatOpen ? 'w-80' : 'w-0'}
            `}
          >
            {chatOpen && (
              <div className="w-80 h-full sticky top-14" style={{ height: 'calc(100vh - 3.5rem)' }}>
                <HearthfireChat
                  activeRunIds={activeRunIds}
                  isDrawerOpen={chatOpen}
                  onDrawerClose={() => setChatOpen(false)}
                />
              </div>
            )}
          </aside>
        )}

        {/* Mobile: chat as bottom drawer */}
        {isMobile && chatOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setChatOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 h-[70vh] rounded-t-2xl overflow-hidden shadow-2xl">
              <HearthfireChat
                activeRunIds={activeRunIds}
                isDrawerOpen={true}
                onDrawerClose={() => setChatOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0e0905]/95 backdrop-blur border-t border-[#5c3d1e]">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-stone-500 hover:text-amber-400 transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-pixel">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${chatOpen ? 'text-amber-400' : 'text-stone-500 hover:text-amber-400'}`}
          >
            <span className="text-xl">🔥</span>
            <span className="text-[9px] font-pixel">Chat</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function WalletButton() {
  const [Btn, setBtn] = useState<React.ComponentType<{ showBalance?: boolean }> | null>(null);
  useEffect(() => {
    import('@rainbow-me/rainbowkit').then((m) => setBtn(() => m.ConnectButton));
  }, []);
  if (!Btn) return <div className="w-28 h-8 bg-stone-800 rounded animate-pulse" />;
  return <Btn showBalance={false} />;
}

function QuestBoardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 bg-stone-800 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-stone-900 border border-stone-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}