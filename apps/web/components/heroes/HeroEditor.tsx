'use client';

import { useEffect, useState } from 'react';
import { HERO_CLASSES, HeroClass, HeroColors } from '../../lib/services/spriteService';
import { ForgePanel } from './ForgeComponents';
import { SpritePreview } from './SpritePreview';

const DEFAULT_COLORS: HeroColors = {
    skin: '#fdbcb4',
    hair: '#8b4513',
    clothing: '#ef4444',
    accent: '#ffffff',
};

export interface HeroData {
    name: string;
    heroClass: HeroClass;
    colors: HeroColors;
}

interface HeroEditorProps {
    initialData?: Partial<HeroData>;
    onChange?: (data: HeroData) => void;
    onRandomize?: () => void;
    hidePreview?: boolean;
    previewName?: string;
    previewSubtitle?: string;
    namePlaceholder?: string;
    defaultName?: string;
}

export default function HeroEditor({ initialData, onChange, onRandomize, hidePreview = false, previewName, previewSubtitle, namePlaceholder = 'Enter hero name...', defaultName = 'Unknown Hero' }: HeroEditorProps) {
    const [heroClass, setHeroClass] = useState<HeroClass>(initialData?.heroClass || HERO_CLASSES[0]);
    const [name, setName] = useState(initialData?.name || '');
    const [colors, setColors] = useState<HeroColors>(initialData?.colors || DEFAULT_COLORS);

    // Layout State
    const [isIdentityOpen, setIsIdentityOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    useEffect(() => {
        if (onChange) {
            onChange({ name, heroClass, colors });
        }
    }, [name, heroClass, colors, onChange]);

    const handleColorChange = (part: keyof HeroColors, color: string) => {
        setColors(prev => ({ ...prev, [part]: color }));
    };

    const handleRandomize = () => {
        const randomClass = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)] as HeroClass;
        const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const newColors = {
            skin: '#fdbcb4',
            hair: randomColor(),
            clothing: randomColor(),
            accent: randomColor(),
        };

        setHeroClass(randomClass);
        setColors(newColors);

        if (onRandomize) onRandomize();
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto relative">
            {/* 1. Preview (Always Visible, Top) - unless hidden */}
            {!hidePreview && (
                <ForgePanel title="Preview" variant="paper" className="flex flex-col items-center min-h-[300px]">
                    <div className="w-full flex-grow flex flex-col items-center justify-center p-6 mb-4 relative">
                        <div className="scale-150 transform transition-transform hover:scale-[1.6] duration-300 drop-shadow-xl">
                            <SpritePreview
                                type={heroClass as HeroClass}
                                colors={colors}
                                isKeeper={false}
                                scale={5}
                                showFrame={true}
                                name={previewName || name || defaultName}
                                subtitle={previewSubtitle || `Level 1 ${heroClass}`}
                            />
                        </div>
                    </div>
                </ForgePanel>
            )}

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
                                placeholder={namePlaceholder}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-[#d4c5b0] mb-2 uppercase font-bold tracking-wider">Class</label>
                            <div className="grid grid-cols-2 gap-2">
                                {HERO_CLASSES.map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => setHeroClass(cls as HeroClass)}
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
