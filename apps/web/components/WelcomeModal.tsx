import React, { useState, useEffect } from 'react';
import { PixelBox, PixelButton } from './PixelComponents';

interface WelcomeModalProps {
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has seen the welcome modal
        const hasSeenWelcome = localStorage.getItem('innkeeper_welcome_seen');
        if (!hasSeenWelcome) {
            setIsVisible(true);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('innkeeper_welcome_seen', 'true');
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <PixelBox title="Welcome Traveler!" variant="paper" className="max-w-md w-full shadow-2xl">
                <div className="text-center space-y-6 p-2">
                    <div className="w-16 h-16 mx-auto bg-[#2a1d17] border-2 border-[#8c7b63] rounded-full flex items-center justify-center text-4xl shadow-inner">
                        🍺
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-[#3e3224] leading-relaxed font-bold">
                            Welcome to the <span className="text-amber-800">Rusty Tankard Inn</span>!
                        </p>
                        <p className="text-xs text-[#5c4b40] leading-relaxed">
                            I am the TavernKeeper. The fire is warm and the ale is cold.
                        </p>
                        <div className="text-xs text-[#8b7b63] bg-[#d4c5b0]/30 p-4 rounded border border-[#8c7b63]/30 text-left space-y-2">
                            <p>⚔️ <strong>Recruit Heroes</strong>: Mint unique adventurers.</p>
                            <p>👥 <strong>Form Parties</strong>: Group them for quests.</p>
                            <p>🗺️ <strong>Explore</strong>: Send them into dangerous dungeons.</p>
                        </div>
                    </div>

                    <PixelButton variant="primary" onClick={handleClose} className="w-full py-3 text-sm shadow-lg">
                        Let's Adventure!
                    </PixelButton>
                </div>
            </PixelBox>
        </div>
    );
};
