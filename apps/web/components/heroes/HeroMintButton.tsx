'use client';

import { PixelButton } from '../../components/PixelComponents';

export default function HeroMintButton() {
    return (
        <PixelButton
            variant="primary"
            onClick={() => window.location.href = '/hero-builder'}
            className="w-full"
        >
            Mint New Hero
        </PixelButton>
    );
}
