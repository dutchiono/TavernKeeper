'use client';

import { X, BookOpen, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GameView } from '../lib/types';
import { getContextualHelp, getTutorialForView, searchAndAnswer } from '../lib/services/tutorialService';
import { PixelBox, PixelButton } from './PixelComponents';

interface TutorialOverlayProps {
    view: GameView | string;
    isOpen: boolean;
    onClose: () => void;
    mode?: 'help' | 'tutorial' | 'search';
    initialQuestion?: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    view,
    isOpen,
    onClose,
    mode = 'tutorial',
    initialQuestion
}) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(initialQuestion || '');
    const [currentMode, setCurrentMode] = useState(mode);

    useEffect(() => {
        if (isOpen) {
            loadContent();
        } else {
            setContent('');
            setSearchQuery('');
        }
    }, [isOpen, view, currentMode]);

    const loadContent = async () => {
        setLoading(true);
        try {
            if (currentMode === 'tutorial') {
                const tutorial = await getTutorialForView(view);
                setContent(tutorial);
            } else if (currentMode === 'help') {
                const help = await getContextualHelp(view);
                setContent(help);
            } else if (currentMode === 'search' && searchQuery) {
                const answer = await searchAndAnswer(searchQuery);
                setContent(answer);
            }
        } catch (error) {
            console.error('Error loading tutorial content:', error);
            setContent('Sorry, I couldn\'t load the help information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setCurrentMode('search');
        setLoading(true);
        try {
            const answer = await searchAndAnswer(searchQuery);
            setContent(answer);
        } catch (error) {
            console.error('Error searching:', error);
            setContent('Sorry, I couldn\'t process that question. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <PixelBox variant="dark" className="max-w-md w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        {currentMode === 'tutorial' && <BookOpen className="w-4 h-4 text-yellow-400" />}
                        {currentMode === 'help' && <HelpCircle className="w-4 h-4 text-blue-400" />}
                        {currentMode === 'search' && <HelpCircle className="w-4 h-4 text-green-400" />}
                        <h3 className="text-sm font-bold text-white uppercase">
                            {currentMode === 'tutorial' ? 'Tutorial' : currentMode === 'help' ? 'Help' : 'Search'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-1 p-2 border-b border-white/10">
                    <button
                        onClick={() => setCurrentMode('tutorial')}
                        className={`px-2 py-1 text-[10px] uppercase font-bold transition-colors ${
                            currentMode === 'tutorial'
                                ? 'bg-yellow-400/20 text-yellow-400'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Tutorial
                    </button>
                    <button
                        onClick={() => setCurrentMode('help')}
                        className={`px-2 py-1 text-[10px] uppercase font-bold transition-colors ${
                            currentMode === 'help'
                                ? 'bg-blue-400/20 text-blue-400'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Help
                    </button>
                    <button
                        onClick={() => setCurrentMode('search')}
                        className={`px-2 py-1 text-[10px] uppercase font-bold transition-colors ${
                            currentMode === 'search'
                                ? 'bg-green-400/20 text-green-400'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Search
                    </button>
                </div>

                {/* Search Bar (for search mode) */}
                {currentMode === 'search' && (
                    <div className="p-2 border-b border-white/10">
                        <div className="flex gap-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Ask a question..."
                                className="flex-1 bg-black/50 border border-white/10 p-1.5 text-xs text-white font-pixel"
                            />
                            <PixelButton
                                onClick={handleSearch}
                                disabled={loading || !searchQuery.trim()}
                                variant="primary"
                                className="!px-3 !py-1.5 !text-xs"
                            >
                                Search
                            </PixelButton>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center text-zinc-400 text-xs animate-pulse">
                            Loading...
                        </div>
                    ) : (
                        <div className="text-xs text-[#eaddcf] leading-relaxed whitespace-pre-wrap">
                            {content || 'No content available.'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-white/10">
                    <PixelButton
                        onClick={onClose}
                        variant="wood"
                        className="w-full !py-1.5 !text-xs"
                    >
                        Close
                    </PixelButton>
                </div>
            </PixelBox>
        </div>
    );
};
