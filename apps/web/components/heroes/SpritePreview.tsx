'use client';

import React, { useRef, useEffect, useState } from 'react';
import { drawSprite, HeroColors } from '../../lib/services/spriteService';

interface SpritePreviewProps {
    heroClass: string;
    colors: HeroColors;
    scale?: number;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({
    heroClass,
    colors,
    scale = 10
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [frame, setFrame] = useState<'A' | 'B'>('A');

    // Animation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(prev => prev === 'A' ? 'B' : 'A');
        }, 600); // Breathe every 600ms

        return () => clearInterval(interval);
    }, []);

    // Drawing Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (16px base size * scale)
        canvas.width = 16 * scale;
        canvas.height = 16 * scale;

        // Ensure crisp pixels
        ctx.imageSmoothingEnabled = false;

        drawSprite(ctx, heroClass, colors, frame, scale);

    }, [heroClass, colors, frame, scale]);

    return (
        <div className="relative inline-block">
            <canvas
                ref={canvasRef}
                className="drop-shadow-2xl"
                style={{
                    imageRendering: 'pixelated'
                }}
            />
            {/* Shadow underneath */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-[50%] blur-sm pointer-events-none" />
        </div>
    );
};
