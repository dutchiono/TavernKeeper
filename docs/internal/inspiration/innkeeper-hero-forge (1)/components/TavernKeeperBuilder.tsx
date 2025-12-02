
import React, { useState } from 'react';
import { ForgeButton, ForgePanel } from './ForgeComponents';
import { SpritePreview } from './SpritePreview';
import { Gender, HeroColors, GENDERS, DEFAULT_COLORS } from '../types';

// Mock Minting Hook for Demo
const useMockMinting = () => {
    const [status, setStatus] = useState<string | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    
    const mint = async () => {
        setIsMinting(true);
        setStatus('Generating Metadata...');
        await new Promise(r => setTimeout(r, 800));
        setStatus('Printing Tavern License...');
        await new Promise(r => setTimeout(r, 1200));
        setStatus('Success! Tavern Established.');
        setIsMinting(false);
    };

    return { mint, status, isMinting };
};

export default function TavernKeeperBuilder({ onSuccess }: { onSuccess?: () => void }) {
    const [gender, setGender] = useState<Gender>('Male');
    const [name, setName] = useState('');
    const [colors, setColors] = useState<HeroColors>({...DEFAULT_COLORS, clothing: '#22c55e'}); // Default keeper green
    const [activeTab, setActiveTab] = useState<'design' | 'mint'>('design');

    const { mint, status, isMinting } = useMockMinting();

    const handleColorChange = (part: keyof HeroColors, color: string) => {
        setColors(prev => ({ ...prev, [part]: color }));
    };

    const handleMint = async () => {
        await mint();
        if (onSuccess) onSuccess();
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex border-b-4 border-[#5c3a1e] mb-6">
                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-3 text-center font-bold uppercase tracking-wider text-xs transition-colors ${activeTab === 'design'
                            ? 'bg-[#8b5a2b] text-[#fcdfa6]'
                            : 'bg-[#2a1d17] text-[#8b7355] hover:bg-[#3e2613]'
                        }`}
                >
                    1. Design Keeper
                </button>
                <button
                    onClick={() => setActiveTab('mint')}
                    className={`flex-1 py-3 text-center font-bold uppercase tracking-wider text-xs transition-colors ${activeTab === 'mint'
                            ? 'bg-[#8b5a2b] text-[#fcdfa6]'
                            : 'bg-[#2a1d17] text-[#8b7355] hover:bg-[#3e2613]'
                        }`}
                >
                    2. Establish Tavern
                </button>
            </div>

            {/* Design Tab */}
            {activeTab === 'design' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Controls */}
                    <div className="space-y-6">
                        <ForgePanel title="Identity" variant="wood">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-[#d4c5b0] mb-1 uppercase font-bold tracking-wider">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-[#3e2613] border-b-2 border-[#5c3a1e] py-2 font-pixel text-[#fcdfa6] focus:outline-none focus:border-amber-500 placeholder-[#5c3a1e]"
                                        placeholder="Keeper Name..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[#d4c5b0] mb-2 uppercase font-bold tracking-wider">Appearance</label>
                                    <div className="flex gap-2">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setGender(g)}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase border-2 transition-all ${
                                                    gender === g 
                                                    ? 'bg-amber-600 border-amber-800 text-white' 
                                                    : 'bg-[#3e2613] border-[#1e1209] text-[#8b7355] hover:bg-[#4e3019]'
                                                }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ForgePanel>

                        <ForgePanel title="Palette" variant="wood">
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(colors).map(([part, color]) => (
                                    <div key={part} className="flex items-center gap-2 bg-[#1e1209] p-2 border border-[#3e2613]">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => handleColorChange(part as keyof HeroColors, e.target.value)}
                                            className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
                                        />
                                        <span className="text-[10px] text-[#8b7b63] uppercase">{part}</span>
                                    </div>
                                ))}
                            </div>
                        </ForgePanel>
                    </div>

                    {/* Preview */}
                    <div className="flex flex-col gap-4">
                        <ForgePanel title="Preview" variant="paper" className="flex-grow flex flex-col items-center justify-center min-h-[350px]">
                            <div className="relative p-8">
                                <SpritePreview 
                                    type={gender}
                                    colors={colors}
                                    isKeeper={true}
                                    scale={5}
                                />
                            </div>
                            
                            <div className="mt-4 text-center">
                                <h3 className="text-xl font-bold text-[#3e3224]">{name || 'Unknown Keeper'}</h3>
                                <p className="text-[#8c7b63] text-[10px] uppercase tracking-widest mt-1">Proprietor</p>
                            </div>
                        </ForgePanel>
                        
                        <ForgeButton onClick={() => setActiveTab('mint')} className="w-full">
                            Next: Establish Tavern &rarr;
                        </ForgeButton>
                    </div>
                </div>
            )}

            {/* Mint Tab */}
            {activeTab === 'mint' && (
                <div className="max-w-md mx-auto animate-fade-in">
                    <ForgePanel title="Confirm Tavern Details" variant="wood">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-[#d4c5b0] text-sm">
                                <span>Proprietor:</span>
                                <span className="text-[#fcdfa6] font-bold">{name}</span>
                            </div>
                            <div className="flex justify-between text-[#d4c5b0] text-sm">
                                <span>Style:</span>
                                <span className="text-[#fcdfa6] font-bold">{gender}</span>
                            </div>
                            <div className="border-t border-[#5c3a1e] my-4" />
                            <div className="flex justify-between text-[#fcdfa6] font-bold text-lg">
                                <span>License Cost:</span>
                                <span>0.05 ETH</span>
                            </div>
                        </div>

                        {status === 'Success! Tavern Established.' ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-green-900/30 border border-green-800 text-green-200 text-sm font-bold">
                                    {status}
                                </div>
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="text-[#8b7b63] text-xs underline"
                                >
                                    Restart
                                </button>
                            </div>
                        ) : (
                            <ForgeButton 
                                onClick={handleMint} 
                                disabled={isMinting || !name} 
                                className="w-full"
                            >
                                {isMinting ? status : 'Mint License'}
                            </ForgeButton>
                        )}
                    </ForgePanel>
                    <button 
                        onClick={() => setActiveTab('design')}
                        className="w-full text-center text-[#8b7b63] text-xs mt-4 hover:text-[#d4c5b0]"
                    >
                        &larr; Back to Design
                    </button>
                </div>
            )}
        </div>
    );
}
