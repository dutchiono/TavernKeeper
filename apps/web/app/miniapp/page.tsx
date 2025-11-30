'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import HeroSprite from '../../components/heroes/HeroSprite';
import { PixelButton, PixelPanel } from '../../components/PixelComponents';
import { useHeroStore } from '../../lib/stores/heroStore';
import { usePartyStore } from '../../lib/stores/partyStore';

function SearchParamsHandler({ onInviteCode }: { onInviteCode: (code: string | null) => void }) {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('party');

  useEffect(() => {
    onInviteCode(inviteCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode]);

  return null;
}

function MiniappContent({ inviteCode }: { inviteCode: string | null }) {
  const [activeFrame, setActiveFrame] = useState<'home' | 'party' | 'adventure' | 'multiplayer'>('home');

  const { userParties, joinParty, fetchUserParties } = usePartyStore();
  const { userHeroes, fetchUserHeroes } = useHeroStore();
  const [userId, setUserId] = useState<string>('');

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [invitePartyId, setInvitePartyId] = useState<string | null>(null);

  // Signal to Farcaster that the miniapp is ready
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      import('@farcaster/miniapp-sdk').then(({ sdk }) => {
        sdk.actions.ready();
      }).catch((err) => {
        console.log('Farcaster SDK not available:', err);
      });
    }
  }, []);

  // Auth & Data Fetching
  useEffect(() => {
    let storedId = localStorage.getItem('innkeeper_user_id');
    if (!storedId) {
      storedId = `user_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('innkeeper_user_id', storedId);
    }
    setUserId(storedId);
    fetchUserParties(storedId);
    fetchUserHeroes(storedId);

    if (inviteCode) {
      // In a real app, we'd validate the code first to get the party ID
      // For now, we'll assume the code maps to a party or use a mock ID if needed
      // But wait, joinParty needs a partyId, not a code.
      // We need the API to resolve code -> partyId.
      // For now, let's just show the invite UI and assume we can resolve it or use code as ID for testing.
      setShowInvite(true);
      setInvitePartyId(inviteCode); // Temporary: using code as ID for now
    }
  }, [inviteCode, fetchUserParties, fetchUserHeroes]);

  const handleJoin = async (heroTokenId: string, heroContract: string) => {
    if (!invitePartyId) return;
    await joinParty(invitePartyId, userId, heroTokenId, heroContract);
    setShowInvite(false);
    setActiveFrame('multiplayer');
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white font-sans max-w-[600px] mx-auto border-x border-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
        <h1 className="font-pixel text-amber-500 text-lg">TavernKeeper Mini</h1>
        <div className="text-xs text-slate-400">v0.2</div>
      </header>

      {/* Content Area */}
      <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto pb-20">

        {/* Invite Overlay */}
        {showInvite && (
          <PixelPanel title="Party Invite" variant="paper" className="mb-4 border-2 border-yellow-400">
            <div className="text-center mb-4">
              <p className="text-amber-900 mb-2">You've been invited to a party!</p>
              <div className="text-2xl font-bold text-amber-950 tracking-widest">{inviteCode}</div>
            </div>
            <h3 className="text-xs font-bold text-amber-900 uppercase mb-2">Select Hero to Join</h3>
            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
              {userHeroes.map(hero => (
                <div key={hero.token_id} onClick={() => handleJoin(hero.token_id, hero.contract_address)} className="bg-[#d4c5b0] border border-[#8c7b63] rounded p-1 cursor-pointer hover:border-amber-600">
                  <div className="aspect-square bg-black/10 rounded mb-1 overflow-hidden">
                    <HeroSprite heroClass="Warrior" metadata={null} />
                  </div>
                  <div className="text-[10px] text-center font-bold text-amber-950">#{hero.token_id}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <PixelButton variant="secondary" className="w-full" onClick={() => setShowInvite(false)}>Dismiss</PixelButton>
            </div>
          </PixelPanel>
        )}

        {activeFrame === 'home' && (
          <div className="flex flex-col gap-4">
            <div className="aspect-video bg-slate-800 rounded border border-slate-600 flex items-center justify-center">
              <span className="font-pixel text-slate-500">INN SCENE</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <PixelButton onClick={() => setActiveFrame('adventure')} className="w-full py-4">Adventure</PixelButton>
              <PixelButton onClick={() => setActiveFrame('party')} variant="secondary" className="w-full py-4">Roster</PixelButton>
              <PixelButton onClick={() => setActiveFrame('multiplayer')} variant="primary" className="col-span-2 py-4 border-yellow-500 text-yellow-400">Multiplayer Parties</PixelButton>
            </div>

            <PixelPanel title="Status">
              <div className="flex justify-between text-sm">
                <span>Gold</span>
                <span className="text-amber-400">1,250</span>
              </div>
            </PixelPanel>
          </div>
        )}

        {activeFrame === 'party' && (
          <div className="flex flex-col gap-4">
            <PixelButton size="sm" variant="secondary" onClick={() => setActiveFrame('home')}>← Back</PixelButton>
            <h2 className="font-pixel text-slate-400 text-sm">Single Player Roster</h2>
            <div className="flex flex-col gap-2">
              {['Gimli', 'Legolas', 'Gandalf'].map((name) => (
                <div key={name} className="bg-slate-800 p-3 rounded border border-slate-600 flex justify-between items-center">
                  <div className="font-bold">{name}</div>
                  <div className="text-xs text-green-400">READY</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeFrame === 'multiplayer' && (
          <div className="flex flex-col gap-4">
            <PixelButton size="sm" variant="secondary" onClick={() => setActiveFrame('home')}>← Back</PixelButton>
            <h2 className="font-pixel text-yellow-400 text-sm">Active Parties</h2>

            {userParties.length === 0 ? (
              <div className="text-center text-slate-500 italic py-8 border border-dashed border-slate-700 rounded">
                No active parties.
              </div>
            ) : (
              userParties.map(p => (
                <div key={p.id} className="bg-slate-800 p-3 rounded border border-slate-600">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-amber-500">Party {p.id.substring(0, 4)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'waiting' ? 'bg-yellow-900/50 text-yellow-200' : 'bg-green-900/50 text-green-200'
                      }`}>{p.status}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Created: {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}

            <div className="mt-4 p-4 bg-slate-800/50 rounded border border-slate-700 text-center">
              <p className="text-xs text-slate-400 mb-2">Create new parties via the main web app.</p>
              <a href="/party" target="_blank" className="text-yellow-400 text-xs hover:underline">Open Web App ↗</a>
            </div>
          </div>
        )}

        {activeFrame === 'adventure' && (
          <div className="flex flex-col gap-4">
            <PixelButton size="sm" variant="secondary" onClick={() => setActiveFrame('home')}>← Retreat</PixelButton>

            <div className="aspect-square bg-slate-800 rounded border border-slate-600 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="font-pixel text-red-500 animate-pulse">COMBAT!</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <PixelButton variant="danger" className="w-full">Attack</PixelButton>
              <PixelButton variant="secondary" className="w-full">Defend</PixelButton>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav (Simulated Frame Buttons) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto bg-slate-800 p-2 border-t border-slate-700 flex gap-2 shrink-0 z-10">
        <button className="flex-1 bg-slate-700 text-white py-3 rounded text-sm font-bold hover:bg-slate-600 transition-colors" onClick={() => window.location.reload()}>Refresh</button>
        <button className="flex-1 bg-slate-700 text-white py-3 rounded text-sm font-bold hover:bg-slate-600 transition-colors">Share</button>
      </div>
    </main>
  );
}

function MiniappPageContent() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  return (
    <>
      <SearchParamsHandler onInviteCode={setInviteCode} />
      <MiniappContent inviteCode={inviteCode} />
    </>
  );
}

export default function MiniappPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading Tavern...</div>}>
      <MiniappPageContent />
    </Suspense>
  );
}
