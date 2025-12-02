
import React, { useRef, useEffect, useState } from 'react';
import { HeroClass, Gender, HeroColors } from '../types';
import { drawSpriteFrame, getFramesForEntity, AnimationType } from '../services/spriteService';

interface SpritePreviewProps {
  type: HeroClass | Gender;
  colors: HeroColors;
  scale?: number;
  isKeeper?: boolean;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  type, 
  colors, 
  scale = 10,
  isKeeper = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [anim, setAnim] = useState<AnimationType>('idle');

  // Animation Loop
  useEffect(() => {
    const interval = setInterval(() => {
        // Adjust speed based on animation
        setFrameIndex(prev => prev + 1);
    }, 200); 

    return () => clearInterval(interval);
  }, [anim]);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine grid size based on entity type to set canvas dimensions correctly
    const frames = getFramesForEntity(type, anim, isKeeper);
    const spriteSize = frames[0].length; 

    canvas.width = spriteSize * scale;
    canvas.height = spriteSize * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSpriteFrame(ctx, type, colors, anim, frameIndex, scale, 0, 0, isKeeper);

  }, [type, colors, frameIndex, scale, isKeeper, anim]);

  return (
    <div className="flex flex-col items-center gap-4">
        <div className="relative inline-block group">
            <canvas 
                ref={canvasRef} 
                className="drop-shadow-2xl transition-transform duration-500"
                style={{ 
                    imageRendering: 'pixelated'
                }}
            />
            {/* Shadow underneath */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/40 rounded-[50%] blur-sm pointer-events-none" />
        </div>

        {/* Animation Controls */}
        <div className="flex gap-2 p-1 bg-[#2a1d17] rounded-full border border-[#5c3a1e]">
            {(['idle', 'walk', 'emote'] as AnimationType[]).map(a => (
                <button
                    key={a}
                    onClick={() => setAnim(a)}
                    className={`
                        px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all
                        ${anim === a 
                            ? 'bg-amber-600 text-white shadow-md' 
                            : 'text-[#8b7b63] hover:text-[#fcdfa6] hover:bg-[#3e2613]'
                        }
                    `}
                >
                    {a}
                </button>
            ))}
        </div>
    </div>
  );
};
