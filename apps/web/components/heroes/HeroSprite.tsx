'use client';

import { useState, useEffect } from 'react';
import { HeroMetadata } from '../../lib/services/heroMinting';
import { spriteRenderer } from '../../lib/services/spriteRenderer';

interface HeroSpriteProps {
    heroClass: string;
    animation?: string;
    metadata?: HeroMetadata | null; // If null, use default colors
    className?: string;
}

export default function HeroSprite({ heroClass, animation = 'idle', metadata, className = '' }: HeroSpriteProps) {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [colors, setColors] = useState<any>(null);
    const [filterStyle, setFilterStyle] = useState<string>('none');

    useEffect(() => {
        // Base sprite URL
        const src = `/sprites/${heroClass.toLowerCase()}_${animation}.png`;
        setImageSrc(src);

        if (metadata?.hero?.colorPalette) {
            setColors(metadata.hero.colorPalette);
            // Apply filter
            setFilterStyle(spriteRenderer.getColorFilter(metadata.hero.colorPalette));
        } else {
            setFilterStyle('none');
        }
    }, [heroClass, animation, metadata]);

    return (
        <div className={`relative ${className}`}>
            <img
                src={imageSrc}
                alt={`${heroClass} ${animation}`}
                className="w-full h-full object-contain pixelated"
                style={{ filter: filterStyle }}
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />

            {/* Debug: Show color indicators if we have metadata */}
            {colors && (
                <div className="absolute bottom-0 right-0 flex gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
                    {Object.values(colors).map((c: any, i) => (
                        <div key={i} className="w-2 h-2 border border-black/50" style={{ backgroundColor: c }} />
                    ))}
                </div>
            )}
        </div>
    );
}
