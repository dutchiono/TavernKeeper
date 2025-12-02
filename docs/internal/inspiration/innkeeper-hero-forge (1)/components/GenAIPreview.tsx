
import React, { useState, useEffect } from 'react';
import { checkApiKey, promptForApiKey } from '../services/aiService';

interface GenAIPreviewProps {
    onGenerate: () => Promise<string | null>;
    generatedImage: string | null;
    label: string;
}

export const GenAIPreview: React.FC<GenAIPreviewProps> = ({ onGenerate, generatedImage, label }) => {
    const [hasKey, setHasKey] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkApiKey().then(setHasKey);
    }, []);

    const handleConnect = async () => {
        await promptForApiKey();
        const connected = await checkApiKey();
        setHasKey(connected);
    };

    const handleGenerate = async () => {
        if (!hasKey) return;
        setIsGenerating(true);
        setError(null);
        try {
            const result = await onGenerate();
            if (!result) {
                setError("AI generation returned no image. Please try again.");
            }
        } catch (e) {
            setError("Failed to generate. Ensure your API key has access to Gemini 2.5.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] gap-4">
            
            <div className="relative w-64 h-64 bg-slate-100 border-4 border-[#8c7b63] shadow-inner flex items-center justify-center overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/1/18/Photoshop_transparent_background.svg')] bg-repeat bg-[length:20px_20px]"></div>
                
                {generatedImage ? (
                    <img 
                        src={generatedImage} 
                        alt="Generated Sprite" 
                        className="w-full h-full object-contain relative z-10"
                        style={{ imageRendering: 'pixelated' }}
                    />
                ) : (
                    <div className="text-center text-[#8c7b63] p-4 relative z-10">
                        {isGenerating ? (
                             <div className="flex flex-col items-center animate-pulse">
                                <span className="text-4xl mb-2">🎨</span>
                                <span className="text-xs uppercase font-bold">Painting...</span>
                             </div>
                        ) : (
                            <span className="text-xs uppercase font-bold opacity-50">No Sprite Generated</span>
                        )}
                    </div>
                )}
            </div>

            <div className="w-full max-w-xs space-y-3">
                {!hasKey ? (
                    <button
                        onClick={handleConnect}
                        className="w-full py-3 bg-blue-600 text-white font-bold text-xs uppercase hover:bg-blue-500 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Connect Google AI Key
                    </button>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`
                            w-full py-3 font-bold text-xs uppercase border-b-4 active:border-b-0 active:translate-y-1 transition-all
                            ${isGenerating 
                                ? 'bg-gray-400 text-gray-200 border-gray-600 cursor-not-allowed' 
                                : 'bg-purple-600 text-white border-purple-800 hover:bg-purple-500'
                            }
                        `}
                    >
                        {isGenerating ? 'Forging Sprite...' : `Generate ${label} (Gemini AI)`}
                    </button>
                )}
                
                {error && (
                    <p className="text-[10px] text-red-600 font-bold text-center bg-red-100 p-1 border border-red-300">
                        {error}
                    </p>
                )}
                
                {hasKey && !generatedImage && (
                    <p className="text-[10px] text-[#8c7b63] text-center">
                        Powered by Gemini 2.5 Flash Image
                    </p>
                )}
            </div>
        </div>
    );
};
