
import React from 'react';
import { useReplayStore } from '../../lib/stores/replayStore';
import { PixelButton, PixelBox } from '../PixelComponents';
import { Play, Pause, FastForward, SkipBack, SkipForward } from 'lucide-react';

export const PlaybackControls: React.FC = () => {
    const {
        isPlaying,
        play,
        pause,
        currentTime,
        duration,
        seek,
        playbackSpeed,
        setSpeed
    } = useReplayStore();

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        seek(Number(e.target.value));
    };

    return (
        <div className="w-full bg-[#1a120b] border-t-2 border-[#5c4033] p-4 flex flex-col gap-2 font-pixel">
            {/* Slider */}
            <div className="flex items-center gap-4 text-[#eaddcf] text-xs">
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-2 bg-[#2a1d17] rounded-lg appearance-none cursor-pointer accent-[#8c7b63]"
                />
                <span>{formatTime(duration)}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PixelButton
                        variant="neutral"
                        onClick={() => setSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
                        className="w-16 text-xs"
                    >
                        {playbackSpeed}x
                    </PixelButton>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        className="text-[#8c7b63] hover:text-[#eaddcf]"
                        onClick={() => seek(Math.max(0, currentTime - 5000))}
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        className="w-12 h-12 bg-[#8c7b63] rounded-full flex items-center justify-center text-[#1a120b] hover:bg-[#eaddcf] transition-colors"
                        onClick={isPlaying ? pause : play}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    <button
                        className="text-[#8c7b63] hover:text-[#eaddcf]"
                        onClick={() => seek(Math.min(duration, currentTime + 5000))}
                    >
                        <SkipForward size={20} />
                    </button>
                </div>

                <div className="w-16"></div> {/* Spacer for symmetry */}
            </div>
        </div>
    );
};
