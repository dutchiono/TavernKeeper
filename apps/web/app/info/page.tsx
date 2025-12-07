'use client';

import { SmartLink } from '../../lib/utils/smartNavigation';

export default function InfoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1a120b] via-[#2a1f15] to-[#1a120b] text-[#e5e5e5] font-sans">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                    <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent animate-pulse">
                        TavernKeeper
                    </h1>
                    <p className="text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        A decentralized game economy built on Monad with Dutch auctions, liquidity pools, and epic adventures
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <SmartLink
                            href="/tutorial"
                            className="px-8 py-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all transform hover:scale-105 shadow-lg shadow-yellow-600/50 inline-block"
                        >
                            📚 Start Tutorial
                        </SmartLink>
                        <SmartLink
                            href="/docs"
                            className="px-8 py-4 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 border-2 border-gray-600 inline-block"
                        >
                            📖 Full Docs
                        </SmartLink>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-20">
                {/* Core Mechanics */}
                <section className="mb-20">
                    <h2 className="text-4xl font-bold mb-8 text-center text-yellow-400">Core Mechanics</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* The Office */}
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-yellow-600/30 shadow-xl hover:shadow-yellow-600/20 transition-all">
                            <div className="text-5xl mb-4">👑</div>
                            <h3 className="text-2xl font-bold text-yellow-400 mb-4">The Office</h3>
                            <p className="text-gray-300 mb-4">
                                Dutch auction system where players bid MON to become Manager and earn KEEP tokens over time.
                            </p>
                            <ul className="space-y-2 text-gray-400 mb-6">
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>Price decreases from high to 1 MON over 1 hour</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>Earn KEEP tokens while you're Manager</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>Get 80% of payment when dethroned</span>
                                </li>
                            </ul>
                            <SmartLink
                                href="/tutorial/office"
                                className="text-yellow-400 hover:text-yellow-300 font-semibold inline-block"
                            >
                                Learn More →
                            </SmartLink>
                        </div>

                        {/* The Cellar */}
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-yellow-600/30 shadow-xl hover:shadow-yellow-600/20 transition-all">
                            <div className="text-5xl mb-4">🏴‍☠️</div>
                            <h3 className="text-2xl font-bold text-yellow-400 mb-4">The Cellar</h3>
                            <p className="text-gray-300 mb-4">
                                Raid the pot by burning LP tokens. 10% of fees from Uniswap V3 swaps accumulate in the pot (90% goes to deployer).
                            </p>
                            <ul className="space-y-2 text-gray-400 mb-6">
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>Add liquidity to get CLP tokens</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>10% of swap fees go to pot (90% to deployer)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>Burn CLP to raid the entire pot</span>
                                </li>
                            </ul>
                            <SmartLink
                                href="/tutorial/office"
                                className="text-yellow-400 hover:text-yellow-300 font-semibold inline-block"
                            >
                                Learn More →
                            </SmartLink>
                        </div>
                    </div>
                </section>

                {/* Dutch Auction Explained */}
                <section className="mb-20">
                    <h2 className="text-4xl font-bold mb-8 text-center text-yellow-400">Dutch Auction System</h2>
                    <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-yellow-600/30 shadow-xl">
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="text-center">
                                <div className="text-4xl mb-3">📈</div>
                                <h3 className="text-xl font-semibold text-yellow-400 mb-2">High Start</h3>
                                <p className="text-gray-400">Price starts at initPrice</p>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl mb-3">⏱️</div>
                                <h3 className="text-xl font-semibold text-yellow-400 mb-2">Time Decay</h3>
                                <p className="text-gray-400">Price decreases linearly over epoch period</p>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl mb-3">💰</div>
                                <h3 className="text-xl font-semibold text-yellow-400 mb-2">Floor Price</h3>
                                <p className="text-gray-400">Reaches minimum floor (1 MON)</p>
                            </div>
                        </div>
                        <div className="bg-[#1a120b] rounded-lg p-6 border border-yellow-600/30">
                            <p className="text-center text-lg text-gray-300 mb-4">Price Formula</p>
                            <code className="block text-center text-yellow-400 font-mono text-xl">
                                price = initPrice - (initPrice × timePassed / epochPeriod)
                            </code>
                        </div>
                    </div>
                </section>

                {/* LP Seeding System */}
                <section className="mb-20">
                    <h2 className="text-4xl font-bold mb-8 text-center text-yellow-400">LP Seeding & Fee Generation</h2>
                    <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-8 border-2 border-yellow-600/30 shadow-xl">
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-5xl mb-4">💧</div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Add Liquidity</h3>
                                <p className="text-sm text-gray-400">WMON + KEEP → CLP tokens</p>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl mb-4">🔄</div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Swaps Happen</h3>
                                <p className="text-sm text-gray-400">Traders swap on V3 pool</p>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl mb-4">💸</div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Fees Accumulate</h3>
                                <p className="text-sm text-gray-400">1% fee per swap → Pot</p>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl mb-4">⚔️</div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Raid Pot</h3>
                                <p className="text-sm text-gray-400">Burn CLP → Get pot</p>
                            </div>
                        </div>
                        <div className="mt-8 bg-[#1a120b] rounded-lg p-6 border border-yellow-600/30">
                            <p className="text-center text-gray-300">
                                <span className="text-yellow-400 font-semibold">Uniswap V3 Integration:</span> All liquidity is managed through a single V3 NFT position.
                                CLP tokens represent your proportional share of the position. Swap fees are split: 90% to deployer, 10% to pot.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Quick Stats */}
                <section className="mb-20">
                    <h2 className="text-4xl font-bold mb-8 text-center text-yellow-400">Key Numbers</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30 text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">1%</div>
                            <p className="text-gray-400">Swap Fee</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30 text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">1 Hour</div>
                            <p className="text-gray-400">Epoch Period</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30 text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">1 MON</div>
                            <p className="text-gray-400">Min Price Floor</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30 text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">V3</div>
                            <p className="text-gray-400">Uniswap Version</p>
                        </div>
                    </div>
                </section>

                {/* Token Economics */}
                <section className="mb-20">
                    <h2 className="text-4xl font-bold mb-8 text-center text-yellow-400">Token Economics</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30">
                            <h3 className="text-xl font-semibold text-yellow-400 mb-3">MON</h3>
                            <p className="text-gray-300 mb-4">Native currency on Monad. Used for:</p>
                            <ul className="space-y-2 text-gray-400">
                                <li>• Taking The Office</li>
                                <li>• Adding liquidity</li>
                                <li>• All transactions</li>
                            </ul>
                        </div>
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30">
                            <h3 className="text-xl font-semibold text-yellow-400 mb-3">KEEP</h3>
                            <p className="text-gray-300 mb-4">Game token. Earned by:</p>
                            <ul className="space-y-2 text-gray-400">
                                <li>• Being Manager of The Office</li>
                                <li>• Raiding The Cellar</li>
                                <li>• Gameplay rewards</li>
                            </ul>
                        </div>
                        <div className="bg-gradient-to-br from-[#2a1f15] to-[#1a120b] rounded-xl p-6 border-2 border-yellow-600/30">
                            <h3 className="text-xl font-semibold text-yellow-400 mb-3">CLP</h3>
                            <p className="text-gray-300 mb-4">Cellar LP tokens. Represent:</p>
                            <ul className="space-y-2 text-gray-400">
                                <li>• Your share of V3 position</li>
                                <li>• Used to raid the pot</li>
                                <li>• 1:1 with liquidity units</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="text-center">
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 rounded-xl p-12 border-2 border-yellow-600/50">
                        <h2 className="text-4xl font-bold mb-4 text-yellow-400">Ready to Get Started?</h2>
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Dive deep into the mechanics with our comprehensive tutorial, or explore the full documentation for technical details.
                        </p>
                        <div className="flex justify-center gap-4 flex-wrap">
                            <SmartLink
                                href="/tutorial"
                                className="px-8 py-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all transform hover:scale-105 shadow-lg shadow-yellow-600/50 inline-block"
                            >
                                📚 View Tutorial
                            </SmartLink>
                            <SmartLink
                                href="/docs"
                                className="px-8 py-4 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 border-2 border-gray-600 inline-block"
                            >
                                📖 Read Docs
                            </SmartLink>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

