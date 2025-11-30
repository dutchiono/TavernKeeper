import React, { useState, useRef, useEffect } from 'react';
import { PixelButton } from '../PixelComponents';

interface ColorPickerProps {
    label: string;
    color: string;
    onChange: (color: string) => void;
    palette?: string[];
}

const DEFAULT_PALETTE = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#ffffff', // White
    '#000000', // Black
    '#8B4513', // Brown
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, color, onChange, palette = DEFAULT_PALETTE }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={popoverRef}>
            <div className="flex items-center gap-3 bg-[#3e2613] p-2 pr-4 border border-[#1e1209]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-10 h-10 border-2 border-[#1e1209] shadow-sm hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    aria-label={`Pick color for ${label}`}
                />
                <div className="flex flex-col flex-grow">
                    <span className="text-[10px] uppercase text-[#8b7b63] font-bold">{label}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#d4c5b0] font-mono">{color}</span>
                        {/* Hidden native input for fallback/custom */}
                        <label className="cursor-pointer text-[10px] text-amber-500 hover:text-amber-400 underline">
                            Custom
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="sr-only"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 mt-2 p-3 bg-[#2a1d17] border-4 border-[#8b5a2b] shadow-xl w-64 animate-in fade-in zoom-in-95 duration-100">
                    <div className="grid grid-cols-5 gap-2 mb-3">
                        {palette.map((pColor) => (
                            <button
                                key={pColor}
                                onClick={() => {
                                    onChange(pColor);
                                    setIsOpen(false);
                                }}
                                className={`w-8 h-8 border-2 hover:scale-110 transition-transform ${color === pColor ? 'border-white ring-2 ring-amber-500' : 'border-black/50'}`}
                                style={{ backgroundColor: pColor }}
                                title={pColor}
                            />
                        ))}
                    </div>
                    <div className="pt-2 border-t border-[#3e2613]">
                        <label className="flex items-center gap-2 text-xs text-[#d4c5b0] cursor-pointer hover:text-white">
                            <div className="relative w-6 h-6 overflow-hidden border border-white/20">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                                />
                            </div>
                            <span>Custom Picker</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
