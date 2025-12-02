import React, { useState } from 'react';
import HeroBuilder from './components/HeroBuilder';
import TavernKeeperBuilder from './components/TavernKeeperBuilder';

type ViewMode = 'landing' | 'keeper' | 'hero';

function App() {
  const [view, setView] = useState<ViewMode>('landing');

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="text-center mb-8 animate-fade-in">
        <h1 className="text-4xl md:text-5xl text-[#fcdfa6] drop-shadow-xl mb-3" style={{ textShadow: '4px 4px 0px #1a0f0a' }}>
            InnKeeper
        </h1>
        <p className="text-[#8b7b63] text-xs uppercase tracking-[0.3em]">Fantasy Asset Forge</p>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl">
        
        {view === 'landing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12 animate-fade-in">
                <button 
                    onClick={() => setView('keeper')}
                    className="group relative h-64 bg-[#2a1d17] border-4 border-[#5c3a1e] hover:border-[#fcdfa6] transition-all duration-300 flex flex-col items-center justify-center p-8 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors duration-500"></div>
                    <div className="relative z-10 text-center">
                        <span className="text-4xl mb-4 block">🍺</span>
                        <h2 className="text-2xl text-[#fcdfa6] font-bold mb-2 uppercase">Forge Keeper</h2>
                        <p className="text-[#8b7b63] text-xs">Establish your tavern & design your avatar.</p>
                    </div>
                </button>

                <button 
                    onClick={() => setView('hero')}
                    className="group relative h-64 bg-[#2a1d17] border-4 border-[#5c3a1e] hover:border-[#fcdfa6] transition-all duration-300 flex flex-col items-center justify-center p-8 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors duration-500"></div>
                    <div className="relative z-10 text-center">
                        <span className="text-4xl mb-4 block">⚔️</span>
                        <h2 className="text-2xl text-[#fcdfa6] font-bold mb-2 uppercase">Recruit Heroes</h2>
                        <p className="text-[#8b7b63] text-xs">Mint adventurers for your guild.</p>
                    </div>
                </button>
            </div>
        )}

        {view !== 'landing' && (
            <div className="animate-fade-in">
                <button 
                    onClick={() => setView('landing')}
                    className="mb-6 text-[#8b7b63] hover:text-[#fcdfa6] text-xs uppercase font-bold tracking-wider flex items-center gap-2"
                >
                    &larr; Back to Home
                </button>
                
                {view === 'keeper' && <TavernKeeperBuilder onSuccess={() => console.log('Keeper Minted')} />}
                {view === 'hero' && <HeroBuilder />}
            </div>
        )}

      </div>
    </div>
  );
}

export default App;
