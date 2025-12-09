'use client';

import { PixelBox, PixelButton } from './PixelComponents';
import { SmartLink } from '../lib/utils/smartNavigation';
import { useGameStore } from '../lib/stores/gameStore';
import { GameView } from '../lib/types';

export default function TavernLanding() {
    const { switchView } = useGameStore();

    return (
        <div className="w-full p-2 sm:p-3 space-y-3 max-w-full overflow-x-hidden">
            {/* Welcome Header */}
            <PixelBox variant="dark" className="p-4 text-center">
                <h2 className="text-yellow-400 text-lg font-bold uppercase tracking-wider mb-2">
                    Welcome to the Tavern
                </h2>
                <p className="text-zinc-300 text-xs leading-relaxed">
                    Your adventure begins here. Navigate the realm, manage your party, and claim your throne.
                </p>
            </PixelBox>

            {/* Navigation Guide */}
            <PixelBox variant="dark" className="p-3">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-3">
                    Navigation
                </div>
                <div className="space-y-2 text-[9px] text-zinc-300">
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">👑 Office:</span>
                        <span>Take control of the Office, access the Cellar, and stake your KEEP tokens</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">🗺️ Map:</span>
                        <span>Explore the world and discover new adventures</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">⚔️ Battle:</span>
                        <span>Review your dungeon runs and combat history</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">👥 Party:</span>
                        <span>Manage your heroes and form parties</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">💬 Chat:</span>
                        <span>Interact with the Tavern Keeper and get help</span>
                    </div>
                </div>
            </PixelBox>

            {/* Resources */}
            <PixelBox variant="dark" className="p-3">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2">
                    Resources
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    <SmartLink href="/tutorial" className="block">
                        <PixelButton variant="wood" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider">
                            Tutorial
                        </PixelButton>
                    </SmartLink>
                    <SmartLink href="/docs" className="block">
                        <PixelButton variant="wood" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider">
                            Docs
                        </PixelButton>
                    </SmartLink>
                    <SmartLink href="/info" className="block">
                        <PixelButton variant="wood" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider">
                            Info
                        </PixelButton>
                    </SmartLink>
                </div>
            </PixelBox>

            {/* Community Links */}
            <div className="grid grid-cols-2 gap-1.5">
                <a
                    href="https://discord.gg/85RxzdaR"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                >
                    <PixelButton variant="wood" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <span>💬</span>
                        <span>Discord</span>
                    </PixelButton>
                </a>
                <a
                    href="https://t.me/tavernkeeper_portal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                >
                    <PixelButton variant="wood" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <span>📱</span>
                        <span>Telegram</span>
                    </PixelButton>
                </a>
            </div>
        </div>
    );
}

