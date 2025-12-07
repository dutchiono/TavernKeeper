'use client';

import { SmartLink } from '../../lib/utils/smartNavigation';

export default function TutorialPage() {
    return (
        <div className="min-h-screen bg-[#1a120b] text-[#e5e5e5] font-sans">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <h1 className="text-5xl font-bold mb-4 text-yellow-400 text-center">Tutorials</h1>
                <p className="text-xl text-gray-300 mb-12 text-center">
                    Learn how to play TavernKeeper
                </p>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Office Tutorial Card */}
                    <SmartLink
                        href="/tutorial/office"
                        className="group bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-yellow-600/30 hover:border-yellow-500 transition-all transform hover:scale-105 shadow-xl hover:shadow-yellow-600/20 block"
                    >
                        <div className="text-6xl mb-4 text-center">👑</div>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">Taking The Office</h2>
                        <p className="text-gray-300 mb-6 text-center">
                            Learn how to become the Manager, earn KEEP tokens, and understand the Dutch auction system.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-yellow-400 group-hover:text-yellow-300">
                            <span className="font-semibold">Start Tutorial</span>
                            <span>→</span>
                        </div>
                        <div className="mt-4 text-sm text-gray-500 text-center">
                            6 interactive steps
                        </div>
                    </SmartLink>

                    {/* Game Tutorial Card - Coming Soon */}
                    <div className="group bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-gray-700 opacity-60 cursor-not-allowed">
                        <div className="text-6xl mb-4 text-center">⚔️</div>
                        <h2 className="text-3xl font-bold text-gray-500 mb-4 text-center">Game Mechanics</h2>
                        <p className="text-gray-500 mb-6 text-center">
                            Learn about dungeons, combat, parties, and gameplay mechanics.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                            <span className="font-semibold">Coming Soon</span>
                        </div>
                        <div className="mt-4 text-sm text-gray-600 text-center">
                            Tutorial in development
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-12 text-center">
                    <div className="flex justify-center gap-4 flex-wrap">
                        <SmartLink
                            href="/info"
                            className="px-6 py-3 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors inline-block"
                        >
                            Quick Info
                        </SmartLink>
                        <SmartLink
                            href="/docs"
                            className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors inline-block"
                        >
                            Full Documentation
                        </SmartLink>
                    </div>
                </div>
            </div>
        </div>
    );
}
