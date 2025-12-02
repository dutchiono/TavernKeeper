
import React, { useState } from 'react';
import { ForgeButton, ForgePanel } from './ForgeComponents';
import { SpritePreview } from './SpritePreview';
import { HeroClass, HeroColors, HERO_CLASSES, DEFAULT_COLORS } from '../types';

// Mock Web3 Interaction
const useMockMinting = () => {
    const [status, setStatus] = useState<string | null>(null);
    const [isMinting, setIsMinting] = useState(false);

    const mint = async (name: string, heroClass: HeroClass, colors: HeroColors) => {
        setIsMinting(true);
        setStatus('Packaging Asset...');
        await new Promise(r => setTimeout(r, 800));
        setStatus('Forging Hero on Blockchain...');
        await new Promise(r => setTimeout(r, 1500));
        setStatus('Mint Successful!');
        setIsMinting(false);
    };

    return { mint, status, isMinting };
};

export default function HeroBuilder() {
    const [heroClass, setHeroClass] = useState<HeroClass>(HERO_CLASSES[0]);
    const [name, setName] = useState('');
    const [colors, setColors] = useState<HeroColors>(DEFAULT_COLORS);
    
    const { mint, status, isMinting } = useMockMinting();

    const handleColorChange = (part: keyof HeroColors, color: string) => {
        setColors(prev => ({ ...prev, [part]: color }));
    };

    const handleRandomize = () => {
        const randomClass = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];
        const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        
        setHeroClass(randomClass);
        setColors({
            skin: '#fdbcb4',
            hair: randomColor(),
            clothing: randomColor(),
            accent: randomColor(),
        });
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Controls */}
                <div className="lg:col-span-6 space-y-6">
                    <ForgePanel title="Hero Identity" variant="wood">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-[10px] text-[#d4c5b0] mb-2 uppercase font-bold tracking-wider">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#3e2613] border-2 border-[#1e1209] p-3 font-pixel text-[#fcdfa6] focus:outline-none focus:border-amber-500 placeholder-[#5c3a1e]"
                                    placeholder="Enter hero name..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-[#d4c5b0] mb-2 uppercase font-bold tracking-wider">Class</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HERO_CLASSES.map(cls => (
                                        <button
                                            key={cls}
                                            onClick={() => setHeroClass(cls)}
                                            className={`
                                                relative p-2 border-b-4 active:border-b-0 active:translate-y-1 transition-all
                                                flex flex-col items-center gap-1
                                                ${heroClass === cls
                                                    ? 'bg-amber-600 border-amber-800 text-white'
                                                    : 'bg-[#5c3a1e] border-[#3e2613] text-[#a68b70] hover:bg-[#6d4626]'
                                                }
                                            `}
                                        >
                                            <span className="text-[10px] uppercase font-bold">{cls}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ForgePanel>

                    <ForgePanel title="Equipment & Colors" variant="wood">
                         <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-[#d4c5b0] uppercase font-bold">Palette</span>
                                <button onClick={handleRandomize} className="text-[10px] text-amber-400 hover:text-amber-200 underline cursor-pointer">
                                    Randomize
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(colors).map(([part, color]) => (
                                    <div key={part} className="flex items-center gap-3 bg-[#3e2613] p-2 pr-4 border border-[#1e1209]">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => handleColorChange(part as keyof HeroColors, e.target.value)}
                                            className="w-8 h-8 cursor-pointer border-none bg-transparent p-0"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-[#8b7b63] font-bold">{part}</span>
                                            <span className="text-[10px] text-[#d4c5b0] font-mono">{color}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ForgePanel>
                </div>

                {/* Right: Preview & Mint */}
                <div className="lg:col-span-6 sticky top-6">
                    <ForgePanel title="Preview" variant="paper" className="flex flex-col items-center justify-between min-h-[500px]">
                        
                        <div className="w-full flex-grow flex flex-col items-center justify-center mb-6 py-10 relative">
                             {/* Decorative Background Frame */}
                             <div className="absolute inset-4 border-2 border-[#8c7b63]/20 pointer-events-none" />
                             
                             <div className="scale-125">
                                 <SpritePreview 
                                    type={heroClass}
                                    colors={colors}
                                    scale={5} 
                                 />
                             </div>
                             
                             <div className="mt-8 text-center space-y-1 relative z-10">
                                <h3 className="text-xl font-bold text-[#3e3224]">{name || 'Unknown Hero'}</h3>
                                <p className="text-[#8c7b63] text-[10px] uppercase tracking-widest">Level 1 {heroClass}</p>
                            </div>
                        </div>

                        <div className="w-full space-y-3 border-t-2 border-[#8c7b63] pt-6">
                            {status === 'Mint Successful!' ? (
                                <div className="space-y-2">
                                    <div className="bg-green-100 border border-green-300 p-2 text-center text-green-800 font-bold text-xs uppercase">
                                        Hero Recruited!
                                    </div>
                                    <button onClick={() => window.location.reload()} className="w-full text-center text-xs text-[#8c7b63] underline"> Recruit Another </button>
                                </div>
                            ) : (
                                <>
                                    <ForgeButton
                                        variant="primary"
                                        className="w-full text-sm py-4 shadow-lg"
                                        onClick={() => mint(name, heroClass, colors)}
                                        disabled={!name || isMinting}
                                    >
                                        {isMinting ? 'Forging...' : 'Recruit Hero (0.01 ETH)'}
                                    </ForgeButton>

                                    {status && (
                                        <div className="bg-amber-100 border border-amber-300 p-2 text-center">
                                            <p className="text-[10px] text-amber-800 font-bold animate-pulse uppercase tracking-wide">
                                                {status}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ForgePanel>
                </div>
            </div>
        </div>
    );
}
