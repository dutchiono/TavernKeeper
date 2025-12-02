import React from 'react';
import { PixelButton } from '../PixelComponents';

export type PartyMode = 'solo' | 'own' | 'public';

interface PartyModeSelectorProps {
    mode: PartyMode;
    onModeChange: (mode: PartyMode) => void;
}

export const PartyModeSelector: React.FC<PartyModeSelectorProps> = ({ mode, onModeChange }) => {
    return (
        <div className="flex gap-2 justify-center">
            <PixelButton
                variant={mode === 'solo' ? 'primary' : 'neutral'}
                isActive={mode === 'solo'}
                onClick={() => onModeChange('solo')}
                className="flex-1"
            >
                Solo (1 Hero)
            </PixelButton>
            <PixelButton
                variant={mode === 'own' ? 'primary' : 'neutral'}
                isActive={mode === 'own'}
                onClick={() => onModeChange('own')}
                className="flex-1"
            >
                Own Party (1-5)
            </PixelButton>
            <PixelButton
                variant={mode === 'public' ? 'primary' : 'neutral'}
                isActive={mode === 'public'}
                onClick={() => onModeChange('public')}
                className="flex-1"
            >
                Public (1-4 + Friends)
            </PixelButton>
        </div>
    );
};
