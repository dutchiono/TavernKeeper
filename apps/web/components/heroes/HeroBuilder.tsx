'use client';

import { useState, useEffect } from 'react';
import { ForgeButton, ForgePanel } from './ForgeComponents';
import { generateMetadata, uploadMetadata, mintHero } from '../../lib/services/heroMinting';
import { generateSpriteURI, HeroColors } from '../../lib/services/spriteService';
import { SpritePreview } from './SpritePreview';
import { useWalletClient, useAccount } from 'wagmi';

const HERO_CLASSES = ['Warrior', 'Mage', 'Rogue', 'Cleric'];

const DEFAULT_COLORS: HeroColors = {
    skin: '#fdbcb4',
    hair: '#8b4513',
    clothing: '#ef4444',
    accent: '#ffffff',
};

export default function HeroBuilder() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [heroClass, setHeroClass] = useState(HERO_CLASSES[0]);
    const [name, setName] = useState('');
    const [colors, setColors] = useState<HeroColors>(DEFAULT_COLORS);
    const [isMinting, setIsMinting] = useState(false);
    const [mintStatus, setMintStatus] = useState<string | null>(null);
    const [lastMint, setLastMint] = useState<{ name: string, hash: string } | null>(null);

    // Layout State
    const [isIdentityOpen, setIsIdentityOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        // Show tutorial on first visit
        const hasSeenTutorial = localStorage.getItem('innkeeper_forge_tutorial_seen');
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('innkeeper_forge_tutorial_seen', 'true');
    };

    const handleColorChange = (part: keyof HeroColors, color: string) => {
        setColors(prev => ({ ...prev, [part]: color }));
    };

    const handleRandomize = () => {
        const randomClass = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];
        const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        setHeroClass(randomClass);
        setColors({
            skin: '#fdbcb4', // Keep skin somewhat realistic or default
            hair: randomColor(),
            clothing: randomColor(),
            accent: randomColor(),
        });
    };

    const handleMint = async () => {
        if (!address || !walletClient || !name) return;

        setIsMinting(true);
        setMintStatus('Generating Arcane Metadata...');

        try {
            // 1. Generate Sprite Image
            const imageUri = generateSpriteURI(heroClass, colors);

            // 2. Generate Metadata
            const metadata = {
                name,
                description: `A brave ${heroClass} adventurer.`,
                image: imageUri,
                attributes: [
                    { trait_type: 'Class', value: heroClass },
                    { trait_type: 'Level', value: 1 },
                ],
                hero: {
                    class: heroClass,
                    colorPalette: colors,
                    spriteSheet: heroClass.toLowerCase(),
                    animationFrames: {
                        idle: [0, 1, 2, 3],
                        walk: [4, 5, 6, 7],
                        emote: [8],
                        talk: [9, 10],
                    },
                },
            };

            // 3. Upload Metadata
            setMintStatus('Uploading metadata...');
            const metadataUri = await uploadMetadata(metadata);

            // 4. Mint Hero
            setMintStatus('Minting hero... (Please confirm in wallet)');
            const hash = await mintHero(walletClient, address, metadataUri);

            setMintStatus(`Minted! Tx: ${hash}`);
            setLastMint({ name, hash });

        } catch (error) {
            console.error(error);
            setMintStatus('Error minting hero');
        } finally {
            setIsMinting(false);
        }
    };

    if (lastMint) {
        return (
            <div className="max-w-md mx-auto w-full">
                <ForgePanel title="Hero Forged!" variant="paper" className="text-center animate-fade-in">
                    <div className="mb-6 flex justify-center">
                        <SpritePreview heroClass={heroClass} colors={colors} scale={12} />
                    </div>
                    <h2 className="text-xl font-bold text-amber-950 mb-2">{lastMint.name}</h2>
                    <p className="text-amber-800 text-sm mb-6">Class: {heroClass}</p>
                    <p className="text-xs text-amber-600 mb-6 bg-amber-100 p-2 border border-amber-200 truncate">
                        Tx: {lastMint.hash}
                    </p>
                    <ForgeButton onClick={() => { setLastMint(null); setName(''); }} className="w-full">Forge Another</ForgeButton>
                </ForgePanel>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto relative">

            {/* Tutorial Modal */}
            {showTutorial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <ForgePanel title="Welcome!" variant="paper" className="max-w-sm w-full shadow-2xl">
                        <div className="text-center space-y-4">
                            <p className="text-sm text-[#3e3224] leading-relaxed">
                                Welcome to the <span className="font-bold text-amber-800">InnKeeper Forge</span>!
                            </p>
                            <div className="text-xs text-[#8b7b63] space-y-2 text-left bg-[#d4c5b0]/20 p-4 rounded border border-[#8c7b63]/30">
                                <p>1. <strong>Preview</strong> your hero at the top.</p>
                                <p>2. Open <strong>Identity</strong> to set name & class.</p>
                                <p>3. Open <strong>Palette</strong> to customize colors.</p>
                                <p>4. <strong>Mint</strong> to recruit them to your party!</p>
                            </div>
                            <ForgeButton onClick={closeTutorial} className="w-full mt-4">
                                Start Forging
                            </ForgeButton>
                        </div>
                    </ForgePanel>
                </div>
            )}

            {/* Header */}
            <header className="text-center flex justify-between items-center px-2">
                <h1 className="text-2xl text-[#fcdfa6] drop-shadow-md" style={{ textShadow: '2px 2px 0px #000' }}>Hero Builder</h1>
                <button
                    onClick={() => setShowTutorial(true)}
                    className="text-[10px] text-[#8b7b63] hover:text-[#fcdfa6] underline cursor-pointer"
                >
                    Help
                </button>
            </header>

            {/* 1. Preview (Always Visible, Top) */}
            <ForgePanel title="Preview" variant="paper" className="flex flex-col items-center min-h-[400px]">
                <div className="w-full flex-grow flex flex-col items-center justify-center p-6 mb-4 relative">
                    <div className="absolute inset-4 border-2 border-[#8c7b63]/20 pointer-events-none" />
                    <div className="scale-150 transform transition-transform hover:scale-[1.6] duration-300 drop-shadow-xl">
                        <SpritePreview heroClass={heroClass} colors={colors} scale={10} />
                    </div>
                    <div className="mt-12 text-center space-y-1 z-10 relative w-full">
                        <h3 className="text-xl font-bold text-[#3e3224] leading-tight break-words border-b-2 border-[#8c7b63]/20 pb-2 mx-8">{name || 'Unknown Hero'}</h3>
                        <p className="text-[#8c7b63] text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Level 1 {heroClass}</p>
                    </div>
                </div>

                <div className="w-full space-y-3 px-4 pb-2">
                    <ForgeButton
                        variant="primary"
                        className="w-full text-sm py-3 shadow-lg"
                        onClick={handleMint}
                        disabled={!name || !address || isMinting}
                    >
                        {isMinting ? mintStatus || 'Forging...' : 'Mint Hero (0.01 ETH)'}
                    </ForgeButton>
                    {mintStatus && (
                        <div className="bg-amber-100 border border-amber-300 p-2 text-center rounded">
                            <p className="text-[10px] text-amber-800 font-bold animate-pulse uppercase tracking-wide">
                                {mintStatus}
                            </p>
                        </div>
                    )}
                </div>
            </ForgePanel>

            {/* 2. Identity (Collapsible) */}
            {isIdentityOpen ? (
                <ForgePanel
                    title={
                        <button
                            onClick={() => setIsIdentityOpen(false)}
                            className="w-full h-full flex items-center justify-center gap-2 hover:text-white transition-colors"
                        >
                            Identity <span className="text-[10px]">▼</span>
                        </button>
                    }
                    variant="wood"
                    className="animate-fade-in"
                >
                    <div className="space-y-6 pt-2">
                        <div>
                            <label className="block text-[10px] text-[#d4c5b0] mb-1 uppercase font-bold tracking-wider">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-[#5c3a1e] py-2 font-pixel text-[#fcdfa6] focus:outline-none focus:border-amber-500 placeholder-[#5c3a1e] transition-colors"
                                placeholder="Enter hero name..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-[#d4c5b0] mb-2 uppercase font-bold tracking-wider">Class</label>
                            <div className="grid grid-cols-2 gap-2">
                                {HERO_CLASSES.map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => setHeroClass(cls)}
                                        className={`
                                            w-full px-2 py-2 border-b-4 active:border-b-0 active:translate-y-1 transition-all
                                            ${heroClass === cls
                                                ? 'bg-amber-600 border-amber-800 text-white'
                                                : 'bg-[#3e2613] border-[#1e1209] text-[#a68b70] hover:bg-[#4e3019]'
                                            }
                                        `}
                                    >
                                        <span className="text-[10px] uppercase font-bold tracking-wider">{cls}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </ForgePanel>
            ) : (
                <button
                    onClick={() => setIsIdentityOpen(true)}
                    className="w-full py-4 bg-[#8b5a2b] border-4 border-[#5c3a1e] text-[#fcdfa6] font-bold uppercase tracking-widest shadow-md hover:bg-[#9c6b3c] transition-all active:scale-[0.99]"
                >
                    Identity <span className="ml-2 text-xs">▶</span>
                </button>
            )}

            {/* 3. Palette (Collapsible) */}
            {isPaletteOpen ? (
                <ForgePanel
                    title={
                        <button
                            onClick={() => setIsPaletteOpen(false)}
                            className="w-full h-full flex items-center justify-center gap-2 hover:text-white transition-colors"
                        >
                            Palette <span className="text-[10px]">▼</span>
                        </button>
                    }
                    variant="wood"
                    className="animate-fade-in"
                >
                    <div className="space-y-6 pt-2">
                        <div className="grid grid-cols-4 gap-3">
                            {Object.entries(colors).map(([part, color]) => (
                                <div key={part} className="flex flex-col items-center gap-2 bg-[#3e2613] p-2 border border-[#1e1209] shadow-inner">
                                    <span className="text-[8px] uppercase text-[#8b7b63] font-bold tracking-wide w-full text-center border-b border-[#1e1209]/50 pb-1">{part}</span>
                                    <div className="relative w-8 h-8 flex-shrink-0 overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => handleColorChange(part as keyof HeroColors, e.target.value)}
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleRandomize}
                            className="w-full py-2 text-[10px] uppercase font-bold text-amber-500 hover:text-amber-300 hover:bg-[#3e2613] border border-dashed border-amber-900/50 rounded transition-colors"
                        >
                            Randomize Colors
                        </button>
                    </div>
                </ForgePanel>
            ) : (
                <button
                    onClick={() => setIsPaletteOpen(true)}
                    className="w-full py-4 bg-[#8b5a2b] border-4 border-[#5c3a1e] text-[#fcdfa6] font-bold uppercase tracking-widest shadow-md hover:bg-[#9c6b3c] transition-all active:scale-[0.99]"
                >
                    Palette <span className="ml-2 text-xs">▶</span>
                </button>
            )}

        </div>
    );
}
