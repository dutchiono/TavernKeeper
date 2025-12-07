'use client';

import { useState } from 'react';
import { SmartLink } from '../../../lib/utils/smartNavigation';

export default function OfficeTutorialPage() {
    const [activeStep, setActiveStep] = useState(0);

    const officeSteps = [
        {
            title: 'Understanding The Office',
            description: 'The Office is a Dutch auction system where players bid MON to become the "Manager" and earn KEEP tokens over time.',
            details: [
                'Each epoch starts with a high initial price',
                'Price decreases linearly over 1 hour (3600 seconds)',
                'Minimum price floor is 1 MON',
                'When someone takes office, they become the new Manager',
                'Previous Manager receives 80% of the payment + accumulated KEEP tokens'
            ],
            visual: '📊'
        },
        {
            title: 'Step 1: Check Current Price',
            description: 'Before taking office, check the current auction price which decreases over time.',
            details: [
                'Price starts at initPrice (set by previous Manager)',
                'Formula: price = initPrice - (initPrice × timePassed / 3600)',
                'Price cannot go below 1 MON minimum',
                'The longer you wait, the cheaper it gets (but someone else might take it!)'
            ],
            visual: '💰'
        },
        {
            title: 'Step 2: Prepare Your Bid',
            description: 'You need MON tokens to take office. The contract will refund any excess payment.',
            details: [
                'Calculate the current price from the auction',
                'Add a small buffer (5%) to handle price changes',
                'Ensure you have enough MON in your wallet',
                'Set a maxPrice to protect against price increases'
            ],
            visual: '💼'
        },
        {
            title: 'Step 3: Take Office',
            description: 'Call the takeOffice function with your bid amount and optional message.',
            details: [
                'Send transaction with MON payment',
                'Contract validates epoch ID and price',
                'Excess payment is automatically refunded',
                'You become the new Manager immediately'
            ],
            visual: '👑'
        },
        {
            title: 'Step 4: Earn KEEP Tokens',
            description: 'As Manager, you earn KEEP tokens at a rate that decreases over time (halving mechanism).',
            details: [
                'Earning rate starts at 0.1 KEEP/second',
                'Rate halves every 30 days',
                'Minimum rate is 0.01 KEEP/second',
                'KEEP accumulates until you claim or are dethroned'
            ],
            visual: '⏰'
        },
        {
            title: 'Step 5: Claim Rewards',
            description: 'When you are dethroned, you automatically receive your accumulated KEEP tokens.',
            details: [
                'KEEP is minted when new Manager takes office',
                'You receive 80% of the payment from new Manager',
                'Total reward = KEEP earned + 80% of new Manager payment',
                'No action needed - rewards are automatic'
            ],
            visual: '🎁'
        }
    ];

    const dutchAuctionSection = {
        title: 'Dutch Auction Mechanics Explained',
        description: 'Both The Office and The Cellar use Dutch auctions - prices start high and decrease over time.',
        points: [
            {
                title: 'Price Decay Formula',
                content: 'price = initPrice - (initPrice × timePassed / epochPeriod)',
                example: 'If initPrice = 10 MON and 30 minutes (1800s) have passed: price = 10 - (10 × 1800 / 3600) = 5 MON'
            },
            {
                title: 'Why Dutch Auctions?',
                content: 'Creates urgency - prices get cheaper over time, but someone else might take it first. Rewards early action with higher prices, but allows latecomers to get better deals.',
                example: 'Early raider pays more but gets pot first. Late raider pays less but risks missing out.'
            },
            {
                title: 'Price Reset',
                content: 'When someone takes office or raids, the price resets to a new initPrice (usually higher).',
                example: 'After raid: newInitPrice = oldInitPrice × multiplier (typically 1.1x to 2x)'
            },
            {
                title: 'Minimum Floor',
                content: 'Prices cannot go below a minimum floor (1 MON for Office, configurable for Cellar).',
                example: 'Even after full epoch period, price stays at minimum floor'
            }
        ]
    };

    return (
        <div className="min-h-screen bg-[#1a120b] text-[#e5e5e5] font-sans">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <h1 className="text-5xl font-bold mb-4 text-yellow-400">Tutorial: Taking Office & Raiding The Cellar</h1>
                <p className="text-xl text-gray-300 mb-12">
                    A complete visual walkthrough of the core mechanics in TavernKeeper
                </p>

                {/* Taking Office Section */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold mb-6 text-yellow-400 border-b-2 border-yellow-600 pb-2">
                        Part 1: Taking The Office 👑
                    </h2>
                    <div className="space-y-8">
                        {officeSteps.map((step, index) => (
                            <div
                                key={index}
                                className={`bg-[#2a1f15] rounded-lg p-6 border-2 transition-all ${
                                    activeStep === index
                                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                                        : 'border-gray-700 hover:border-yellow-600'
                                }`}
                                onClick={() => setActiveStep(index)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">{step.visual}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl font-bold text-yellow-400">Step {index + 1}</span>
                                            <h3 className="text-2xl font-semibold">{step.title}</h3>
                                        </div>
                                        <p className="text-lg text-gray-300 mb-4">{step.description}</p>
                                        <ul className="space-y-2">
                                            {step.details.map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2 text-gray-400">
                                                    <span className="text-yellow-500 mt-1">•</span>
                                                    <span>{detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Dutch Auction Mechanics */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold mb-6 text-yellow-400 border-b-2 border-yellow-600 pb-2">
                        {dutchAuctionSection.title} 📊
                    </h2>
                    <p className="text-lg text-gray-300 mb-8">{dutchAuctionSection.description}</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        {dutchAuctionSection.points.map((point, index) => (
                            <div key={index} className="bg-[#2a1f15] rounded-lg p-6 border-2 border-gray-700">
                                <h3 className="text-xl font-semibold text-yellow-400 mb-3">{point.title}</h3>
                                <p className="text-gray-300 mb-3">{point.content}</p>
                                <div className="bg-[#1a120b] rounded p-3 border border-yellow-600/30">
                                    <p className="text-sm text-yellow-300 font-mono">{point.example}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Navigation */}
                <div className="flex justify-center gap-4 mt-12">
                    <SmartLink
                        href="/docs"
                        className="px-6 py-3 bg-yellow-600 text-black font-semibold rounded hover:bg-yellow-500 transition-colors inline-block"
                    >
                        Read Full Documentation
                    </SmartLink>
                    <SmartLink
                        href="/info"
                        className="px-6 py-3 bg-gray-700 text-white font-semibold rounded hover:bg-gray-600 transition-colors inline-block"
                    >
                        Quick Info Page
                    </SmartLink>
                </div>
            </div>
        </div>
    );
}
