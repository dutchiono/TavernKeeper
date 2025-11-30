'use client';

import { SignInButton } from '@farcaster/auth-kit';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { ChatOverlay } from '../components/ChatOverlay';
import { PixelBox, PixelButton } from '../components/PixelComponents';
import { BattleScene } from '../components/scenes/BattleScene';
import { InnScene } from '../components/scenes/InnScene';
import { MapScene } from '../components/scenes/MapScene';
import { TheOffice } from '../components/TheOffice';
import { WelcomeModal } from '../components/WelcomeModal';
import { WorldGeneratorDebug } from '../components/WorldGeneratorDebug';
import { useGameStore } from '../lib/stores/gameStore';
import { GameView } from '../lib/types';

import { formatEther } from 'viem';

import { useAccount } from 'wagmi';
import { keepTokenService } from '../lib/services/keepToken';

function SearchParamsHandler({ onViewChange }: { onViewChange: (view: string | null) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const view = searchParams.get('view');
    onViewChange(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

function HomeContent() {
  const { currentView, switchView, party, keepBalance, setKeepBalance } = useGameStore();
  const { address } = useAccount();

  // Fetch KEEP Balance
  useEffect(() => {
    if (!address) {
      setKeepBalance("0");
      return;
    }

    const fetchBalance = async () => {
      const balance = await keepTokenService.getBalance(address);
      setKeepBalance(balance);
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [address, setKeepBalance]);

  // Initial Greeting
  useEffect(() => {
    const hasGreeted = sessionStorage.getItem('innkeeper_greeted');
    if (!hasGreeted) {
      useGameStore.getState().addLog({
        id: Date.now(),
        message: "Welcome back, traveler! The hearth is warm. How can I help you today?",
        type: 'dialogue',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      sessionStorage.setItem('innkeeper_greeted', 'true');
    }
  }, []);

  // Handle URL Query Params for View Switching
  const handleViewChange = (view: string | null) => {
    if (view === 'map') switchView(GameView.MAP);
    if (view === 'battle') switchView(GameView.BATTLE);
    if (view === 'inn') switchView(GameView.INN);
  };

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler onViewChange={handleViewChange} />
      </Suspense>
      <main className="h-full w-full flex flex-col font-pixel">
      <WelcomeModal onClose={() => { }} />

      {/* Mobile Container Wrapper - Filling Parent from Layout */}
      <div className="flex-1 relative flex flex-col overflow-hidden">

        {/* --- TOP BAR: Title & Status --- */}
        <div className="h-12 bg-[#2a1d17] border-b-4 border-[#1a120b] flex items-center justify-between px-4 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-yellow-400 text-sm md:text-lg font-bold tracking-widest px-2 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
              TAVERN<span className="text-white">KEEPER</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Scaled down Sign In Button */}
            <div className="transform scale-75 origin-right">
              <SignInButton />
            </div>

            <div className="hidden md:flex items-center gap-4 px-4 bg-black/30 py-1 rounded border border-white/5">
              <div className="text-[10px] text-yellow-400 flex flex-col items-end leading-tight">
                <span>DAY 1</span>
                <span className="text-white/50">{parseFloat(formatEther(BigInt(keepBalance))).toFixed(2)} KEEP</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN SCENE AREA --- */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {currentView === GameView.INN && (
            <InnScene />
          )}
          {currentView === GameView.MAP && (
            <MapScene />
          )}
          {currentView === GameView.BATTLE && (
            <BattleScene
              party={party}
              onComplete={(success) => {
                useGameStore.getState().addLog({
                  id: Date.now(),
                  message: success ? "Victory! The party returns to the inn." : "Defeat... The party retreats.",
                  type: 'combat',
                  timestamp: new Date().toLocaleTimeString()
                });
                switchView(GameView.INN);
              }}
            />
          )}

          {/* TAVERNKEEPER CHAT OVERLAY & THE OFFICE */}
          {currentView === GameView.INN && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] h-[85%] z-30 pointer-events-none flex flex-col gap-4">

              {/* The Office (King of the Hill) wrapping the Chat */}
              <div className="pointer-events-auto w-full max-w-md mx-auto h-full flex flex-col">
                <TheOffice>
                  <ChatOverlay />
                </TheOffice>
              </div>
            </div>
          )}

          {/* WORLD GENERATOR DEBUG OVERLAY */}
          <div className="absolute bottom-4 right-4 z-40 pointer-events-auto max-w-md max-h-[50vh] overflow-auto">
            <WorldGeneratorDebug />
          </div>

        </div>

        {/* --- BOTTOM HUD: Party Roster Only --- */}
        <div className="w-full h-40 bg-[#1e1e24] border-t-4 border-slate-800 p-2 flex gap-2 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] shrink-0">

          {/* HERO ACTIONS SECTION */}
          <PixelBox className="w-full" variant="wood" title="Actions">
            <div className="flex gap-4 h-full items-center justify-center px-4">
              <PixelButton
                variant="primary"
                onClick={() => window.location.href = '/hero-builder'}
                className="flex items-center gap-2"
              >
                <span className="text-lg">⚔️</span>
                <div className="flex flex-col items-start">
                  <span className="text-[10px]">NEW HERO</span>
                  <span className="text-[8px] text-white/60">Mint NFT</span>
                </div>
              </PixelButton>

              <PixelButton
                variant="secondary"
                onClick={() => window.location.href = '/party'}
                className="flex items-center gap-2"
              >
                <span className="text-lg">👥</span>
                <div className="flex flex-col items-start">
                  <span className="text-[10px]">PARTY</span>
                  <span className="text-[8px] text-white/60">Manage</span>
                </div>
              </PixelButton>
            </div>
          </PixelBox>
        </div>

      </div>
    </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-black text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
