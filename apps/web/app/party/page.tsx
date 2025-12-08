'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import NFTMetadataUpdater from '../../components/NFTMetadataUpdater';
import { PixelButton, PixelCard, PixelPanel } from '../../components/PixelComponents';
import RecruitHeroView from '../../components/RecruitHeroView';
import TavernKeeperBuilder from '../../components/TavernKeeperBuilder';
import { HeroNFT, rpgService, TavernKeeperNFT } from '../../lib/services/rpgService';
import { isInFarcasterMiniapp } from '../../lib/utils/farcasterDetection';

export default function PartyPage() {
  const isMiniapp = isInFarcasterMiniapp();
  const { address, isConnected } = useAccount();
  const authenticated = isConnected;

  const [tavernKeepers, setTavernKeepers] = useState<TavernKeeperNFT[]>([]);
  const [selectedKeeper, setSelectedKeeper] = useState<TavernKeeperNFT | null>(null);
  const [heroes, setHeroes] = useState<HeroNFT[]>([]);
  const [keeperMetadata, setKeeperMetadata] = useState<Record<string, { name: string }>>({});

  const [loading, setLoading] = useState(true);
  const [loadingHeroes, setLoadingHeroes] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'recruit'>('dashboard');

  // Metadata updater state
  const [updatingHero, setUpdatingHero] = useState<HeroNFT | null>(null);
  const [updatingKeeper, setUpdatingKeeper] = useState<{ keeper: TavernKeeperNFT; metadataUri: string } | null>(null);

  const handleUpdateKeeper = async (keeper: TavernKeeperNFT) => {
    try {
      // Fetch tokenURI for the keeper
      const metadataUri = await rpgService.getTavernKeeperTokenURI(keeper.tokenId);
      setUpdatingKeeper({ keeper, metadataUri });
    } catch (error) {
      console.error('Failed to fetch keeper metadata URI:', error);
    }
  };

  // Fetch Tavern Keepers on load
  useEffect(() => {
    if (authenticated && address) {
      fetchKeepers();
    } else if (!authenticated) {
      setLoading(false);
    }
  }, [authenticated, address]);

  // Auto-select first keeper if none selected
  useEffect(() => {
    if (tavernKeepers.length > 0 && !selectedKeeper) {
      setSelectedKeeper(tavernKeepers[0]);
    }
  }, [tavernKeepers, selectedKeeper]);

  // Fetch Heroes when a Keeper is selected
  useEffect(() => {
    if (selectedKeeper && selectedKeeper.tbaAddress && selectedKeeper.tbaAddress.trim() !== '') {
      fetchHeroes(selectedKeeper.tbaAddress);
    } else {
      setHeroes([]);
    }
  }, [selectedKeeper]);

  // Add a refresh button handler
  const handleRefreshHeroes = () => {
    if (selectedKeeper && selectedKeeper.tbaAddress) {
      fetchHeroes(selectedKeeper.tbaAddress);
    }
  };

  const fetchKeepers = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const keepers = await rpgService.getUserTavernKeepers(address);
      setTavernKeepers(keepers);

      // Fetch metadata for each keeper
      const metadataMap: Record<string, { name: string }> = {};
      for (const keeper of keepers) {
        try {
          const tokenURI = await rpgService.getTavernKeeperTokenURI(keeper.tokenId);
          let metadata: { name?: string } = {};

          // Handle data URIs (base64 encoded JSON)
          if (tokenURI.startsWith('data:application/json;base64,')) {
            const base64 = tokenURI.replace('data:application/json;base64,', '');
            const jsonString = atob(base64);
            metadata = JSON.parse(jsonString);
          }
          // Handle HTTP URLs
          else if (tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
            const response = await fetch(tokenURI);
            if (response.ok) {
              metadata = await response.json();
            }
          }
          // Handle IPFS URIs
          else if (tokenURI.startsWith('ipfs://')) {
            const url = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
            const response = await fetch(url);
            if (response.ok) {
              metadata = await response.json();
            }
          }

          if (metadata.name) {
            metadataMap[keeper.tokenId] = { name: metadata.name };
          }
        } catch (e) {
          console.warn(`Failed to fetch metadata for keeper ${keeper.tokenId}:`, e);
        }
      }

      setKeeperMetadata(metadataMap);

      if (keepers.length > 0 && !selectedKeeper) {
        setSelectedKeeper(keepers[0]);
      }
    } catch (e) {
      console.error("Failed to fetch keepers", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroes = async (tbaAddress: string) => {
    // Validate TBA address before fetching
    if (!tbaAddress || tbaAddress.trim() === '' || !tbaAddress.startsWith('0x')) {
      console.warn('⚠️ Cannot fetch heroes: invalid or empty TBA address:', tbaAddress);
      console.warn('   This usually means the TBA address calculation failed. The TavernKeeper may still exist, but heroes cannot be queried.');
      setHeroes([]);
      return;
    }

    console.log(`🔄 fetchHeroes: Fetching heroes for TBA ${tbaAddress}`);
    console.log(`   Selected Keeper: ${selectedKeeper?.tokenId || 'none'}`);
    setLoadingHeroes(true);
    try {
      const heroList = await rpgService.getHeroes(tbaAddress);
      console.log(`✅ fetchHeroes: Got ${heroList.length} hero(es) for TBA ${tbaAddress}`);
      if (heroList.length === 0) {
        console.warn(`⚠️ No heroes found. Check browser console for detailed logs from getHeroes().`);
        console.warn(`   If you just claimed a hero, wait a few seconds and click REFRESH.`);
      }
      setHeroes(heroList);
    } catch (e: any) {
      console.error("❌ fetchHeroes: Failed to fetch heroes", e);
      console.error("   Error details:", e?.message || e);
      setHeroes([]);
    } finally {
      setLoadingHeroes(false);
    }
  };

  const handleRecruitSuccess = async () => {
    setViewMode('dashboard');
    if (selectedKeeper) {
      // Wait a bit for the blockchain state to update, then retry fetching heroes
      // Sometimes the hero isn't immediately queryable after minting
      let retries = 0;
      const maxRetries = 5;
      const retryDelay = 2000; // 2 seconds between retries

      const tryFetchHeroes = async () => {
        try {
          await fetchHeroes(selectedKeeper.tbaAddress);
          // If we got heroes, we're done
          if (heroes.length > 0 || retries >= maxRetries) {
            return;
          }
        } catch (error) {
          console.warn(`Failed to fetch heroes (attempt ${retries + 1}/${maxRetries}):`, error);
        }

        // If no heroes found and we haven't maxed out retries, try again
        if (retries < maxRetries) {
          retries++;
          setTimeout(tryFetchHeroes, retryDelay);
        }
      };

      // Start fetching immediately
      await tryFetchHeroes();
    }
  };

  const handleMintSuccess = () => {
    fetchKeepers();
  };

  if (!authenticated) {
    return (
      <main className="min-h-full bg-[#2a1d17] p-8 flex items-center justify-center font-pixel">
        <PixelPanel title="Access Denied" variant="wood" className="max-w-md text-center">
          <p className="text-[#eaddcf] mb-4">Please connect your wallet to access the Party Manager.</p>
        </PixelPanel>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-full bg-[#2a1d17] p-8 flex items-center justify-center font-pixel">
        <div className="text-yellow-400 animate-pulse">Loading Tavern Data...</div>
      </main>
    );
  }

  // 1. New User Flow: Mint Tavern Keeper
  if (tavernKeepers.length === 0) {
    return <TavernKeeperBuilder onSuccess={handleMintSuccess} />;
  }

  // 2. Recruit Flow
  if (viewMode === 'recruit' && selectedKeeper) {
    return (
      <RecruitHeroView
        tbaAddress={selectedKeeper.tbaAddress}
        tavernKeeperId={selectedKeeper.tokenId}
        onSuccess={handleRecruitSuccess}
        onCancel={() => setViewMode('dashboard')}
      />
    );
  }

  // 3. Dashboard Flow
  return (
    <main className="min-h-full bg-[#2a1d17] p-4 md:p-8 font-pixel">
      {/* Metadata Updater Modals */}
      {updatingHero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="w-full h-full max-w-4xl max-h-[95vh] flex items-center justify-center">
            <NFTMetadataUpdater
              tokenId={updatingHero.tokenId}
              tokenUri={updatingHero.metadataUri}
              contractType="hero"
              onSuccess={() => {
                setUpdatingHero(null);
                if (selectedKeeper) {
                  fetchHeroes(selectedKeeper.tbaAddress);
                }
              }}
              onCancel={() => setUpdatingHero(null)}
            />
          </div>
        </div>
      )}
      {updatingKeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="w-full h-full max-w-4xl max-h-[95vh] flex items-center justify-center">
            <NFTMetadataUpdater
              tokenId={updatingKeeper.keeper.tokenId}
              tokenUri={updatingKeeper.metadataUri}
              contractType="tavernKeeper"
              onSuccess={() => {
                setUpdatingKeeper(null);
                // Refresh keepers to get updated metadata
                fetchKeepers();
              }}
              onCancel={() => setUpdatingKeeper(null)}
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Keeper Selection */}
        <div className="lg:col-span-4 space-y-6">
          <PixelCard variant="wood">
            <h2 className="text-xl text-[#eaddcf] mb-4">TavernKeepers</h2>
            <div className="space-y-4">
              {tavernKeepers.map(keeper => (
                <div
                  key={keeper.tokenId}
                  className={`p-4 border-2 transition-all ${selectedKeeper?.tokenId === keeper.tokenId
                    ? 'border-yellow-400 bg-[#4a3b2a]'
                    : 'border-[#4a3b2a] hover:border-yellow-400/50'
                    }`}
                >
                  <div
                    onClick={() => setSelectedKeeper(keeper)}
                    className="cursor-pointer"
                  >
                    <div className="text-[#eaddcf]">
                      {keeperMetadata[keeper.tokenId]?.name || `TavernKeeper #${keeper.tokenId}`}
                    </div>
                    <div className="text-xs text-[#8b7355] truncate">{keeper.tbaAddress}</div>
                  </div>
                  <div className="mt-2">
                    <PixelButton
                      size="sm"
                      variant="neutral"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateKeeper(keeper);
                      }}
                    >
                      Update
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          </PixelCard>
        </div>

        {/* Main Content: Keeper Details & Heroes */}
        <div className="lg:col-span-8">
          {selectedKeeper ? (
            <div className="space-y-6">
              <PixelPanel title={keeperMetadata[selectedKeeper.tokenId]?.name || `TavernKeeper #${selectedKeeper.tokenId}`} variant="wood">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-sm text-[#8b7355]">Vault Address</div>
                    <div className="text-[#eaddcf] font-mono text-sm">{selectedKeeper.tbaAddress}</div>
                  </div>
                  <div className="flex gap-2">
                    <PixelButton
                      size="sm"
                      variant="neutral"
                      onClick={handleRefreshHeroes}
                      disabled={loadingHeroes}
                    >
                      {loadingHeroes ? 'Loading...' : 'Refresh'}
                    </PixelButton>
                    <PixelButton onClick={() => setViewMode('recruit')}>
                      Recruit Hero
                    </PixelButton>
                  </div>
                </div>

                <h3 className="text-lg text-[#eaddcf] mb-4">Roster</h3>
                {loadingHeroes ? (
                  <div className="text-center text-[#8b7355] py-8">Loading heroes...</div>
                ) : heroes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {heroes.map(hero => (
                      <PixelCard key={hero.tokenId} variant="default" className="bg-[#1a120d]">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="text-[#eaddcf]">Hero #{hero.tokenId}</div>
                            <div className="text-xs text-[#8b7355] truncate" title={hero.metadataUri}>
                              {hero.metadataUri}
                            </div>
                          </div>
                          <PixelButton
                            size="sm"
                            variant="neutral"
                            onClick={() => setUpdatingHero(hero)}
                          >
                            Update
                          </PixelButton>
                        </div>
                      </PixelCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[#8b7355] py-8 italic border-2 border-dashed border-[#4a3b2a] rounded">
                    No heroes in this tavern yet.
                  </div>
                )}
              </PixelPanel>
            </div>
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center text-[#eaddcf]/30 italic border-2 border-dashed border-[#eaddcf]/10 rounded-lg p-12">
              Select a tavern to view details
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
