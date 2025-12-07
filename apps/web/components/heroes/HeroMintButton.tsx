'use client';

import { PixelButton } from '../../components/PixelComponents';
import { useSmartNavigate } from '../../lib/utils/smartNavigation';

export default function HeroMintButton() {
    const { navigate } = useSmartNavigate();

    return (
        <PixelButton
            variant="primary"
            onClick={() => navigate('/hero-builder')}
            className="w-full"
        >
            Mint New Hero
        </PixelButton>
    );
}
