'use client';

import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel, PixelCard } from '../../../components/PixelComponents';
import { usePartyStore } from '../../../lib/stores/partyStore';
import { useHeroStore } from '../../../lib/stores/heroStore';

export default function PartyPage() {
  const { userParties, currentParty, isLoading: partyLoading, fetchUserParties, createParty, fetchPartyDetails, generateInvite, startRun } = usePartyStore();
  const { userHeroes, isLoading: heroLoading, fetchUserHeroes, syncHeroes } = useHeroStore();

  const [userId, setUserId] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    // Simple auth simulation
    let storedId = localStorage.getItem('innkeeper_user_id');
    if (!storedId) {
      storedId = `user_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('innkeeper_user_id', storedId);
    }
    setUserId(storedId);

    fetchUserParties(storedId);
    // Auto-sync heroes on load
    syncHeroes(storedId);
  }, [fetchUserParties, syncHeroes]);

  const handleCreateParty = async () => {
    if (!userId) return;
    await createParty(userId);
  };

  const handleSelectParty = (partyId: string) => {
    fetchPartyDetails(partyId);
    setInviteCode(null);
  };

  const handleGenerateInvite = async () => {
    if (!currentParty || !userId) return;
    const code = await generateInvite(currentParty.id, userId);
    setInviteCode(code);
  };

  const handleStartRun = async () => {
    if (!currentParty) return;
    await startRun(currentParty.id, 'dungeon_1'); // Default dungeon for now
    // Redirect or update UI
  };

  return (
    <main className="min-h-full bg-[#2a1d17] p-4 sm:p-6 md:p-8 flex flex-col items-center gap-4 sm:gap-6 md:gap-8 font-pixel overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      <header className="w-full max-w-6xl flex flex-row justify-between items-center gap-2 mb-2 sm:mb-4 flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg sm:text-3xl md:text-4xl text-yellow-400 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] tracking-widest truncate">Party Manager</h1>
          <p className="text-[#eaddcf]/60 text-[10px] sm:text-xs truncate">ID: {userId}</p>
        </div>
        <div className="flex-shrink-0">
          <PixelButton variant="secondary" onClick={() => window.location.href = '/'} className="text-[10px] sm:text-xs px-2 py-2 sm:px-4 sm:py-2 whitespace-nowrap">Back to Inn</PixelButton>
        </div>
      </header>

      <div className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 flex-1">
        {/* Left: Party List */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full order-2 lg:order-1">
          <PixelPanel title="Your Parties" className="flex flex-col" variant="wood">
            <div className="flex-1 overflow-y-auto pr-2 max-h-[200px] sm:max-h-[500px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <div className="grid grid-cols-1 gap-3">
                {userParties.length === 0 ? (
                  <div className="text-[#eaddcf]/50 text-center italic p-4">No active parties.</div>
                ) : (
                  userParties.map((party) => (
                    <PixelCard
                      key={party.id}
                      onClick={() => handleSelectParty(party.id)}
                      variant={currentParty?.id === party.id ? 'paper' : 'wood'}
                      className={`cursor-pointer ${currentParty?.id === party.id ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-900 text-xs sm:text-sm">Party {party.id.substring(0, 6)}</span>
                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded ${party.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-200' :
                          party.status === 'in_progress' ? 'bg-green-500/20 text-green-200' :
                            'bg-gray-500/20 text-gray-200'
                          }`}>
                          {party.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-900/70 mt-1">
                        Created: {new Date(party.created_at).toLocaleDateString()}
                      </div>
                    </PixelCard>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2a1d17]/20 flex-shrink-0">
              <PixelButton variant="primary" className="w-full" onClick={handleCreateParty} disabled={partyLoading}>
                {partyLoading ? 'Creating...' : 'Create New Party'}
              </PixelButton>
            </div>
          </PixelPanel>
        </div>

        {/* Center & Right: Party Details */}
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6 order-1 lg:order-2">
          {currentParty ? (
            <PixelPanel title={`Party Details: ${currentParty.id.substring(0, 8)}`} variant="paper" className="flex flex-col h-full min-h-[300px]">
              <div className="flex flex-col gap-6 p-4">
                {/* Status Bar */}
                <div className="flex justify-between items-center bg-[#d4c5b0] p-3 rounded border border-[#8c7b63]">
                  <div>
                    <span className="text-amber-900 font-bold">Status: </span>
                    <span className="text-amber-950">{currentParty.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <PixelButton variant="secondary" size="sm" onClick={handleGenerateInvite}>
                      Invite Friends
                    </PixelButton>
                    <PixelButton variant="primary" size="sm" onClick={handleStartRun} disabled={currentParty.status !== 'waiting' && currentParty.status !== 'ready'}>
                      Start Run
                    </PixelButton>
                  </div>
                </div>

                {inviteCode && (
                  <div className="bg-yellow-100 border-2 border-yellow-400 p-4 rounded text-center animate-pulse">
                    <p className="text-amber-900 text-sm mb-1">Share this code with friends:</p>
                    <p className="text-2xl font-bold text-amber-950 tracking-widest select-all">{inviteCode}</p>
                  </div>
                )}

                {/* Members */}
                <div>
                  <h3 className="text-amber-900 font-bold mb-3 uppercase tracking-wide">Party Members</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Placeholder for members list - need to fetch members */}
                    <div className="bg-[#d4c5b0]/50 border border-dashed border-[#8c7b63] rounded p-4 flex items-center justify-center text-amber-900/50 italic">
                      Members list loading... (Implement fetchMembers)
                    </div>
                  </div>
                </div>

                {/* Available Heroes (to add) */}
                <div>
                  <h3 className="text-amber-900 font-bold mb-3 uppercase tracking-wide">Your Heroes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {userHeroes.length === 0 ? (
                      <div className="col-span-full text-center text-amber-900/50 italic py-4">
                        No heroes found. Sync your wallet!
                      </div>
                    ) : (
                      userHeroes.map(hero => (
                        <div key={hero.token_id} className="agent-card bg-[#d4c5b0] border border-[#8c7b63] rounded p-2 cursor-pointer hover:border-amber-600 transition-colors">
                          <div className="aspect-square bg-black/10 rounded mb-2 overflow-hidden">
                            {/* Sprite placeholder */}
                            <div className="w-full h-full flex items-center justify-center text-xs text-amber-900/30">Sprite</div>
                          </div>
                          <div className="text-xs font-bold text-amber-950 truncate">Hero #{hero.token_id}</div>
                          <PixelButton variant="secondary" size="sm" className="w-full mt-2 text-[10px]">Add</PixelButton>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </PixelPanel>
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center text-[#eaddcf]/30 italic border-2 border-dashed border-[#eaddcf]/10 rounded-lg p-12">
              Select a party to view details or create a new one
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
