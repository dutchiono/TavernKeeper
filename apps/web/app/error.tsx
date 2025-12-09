'use client';

import { PixelBox, PixelButton } from '../components/PixelComponents';
import { useSmartNavigate } from '../lib/utils/smartNavigation';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { navigate } = useSmartNavigate();

    return (
        <main className="min-h-screen bg-[#1a120b] flex items-center justify-center font-pixel p-4">
            <PixelBox variant="wood" className="max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-red-400 mb-4">⚠️ Error</h1>
                <p className="text-[#eaddcf] mb-2 text-sm">
                    {error.message || 'Something went wrong'}
                </p>
                {error.digest && (
                    <p className="text-[#a8a29e] text-xs mb-4 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
                <div className="flex gap-2 justify-center">
                    <PixelButton
                        onClick={reset}
                        variant="primary"
                        className="!px-4 !py-2"
                    >
                        Try Again
                    </PixelButton>
                    <PixelButton
                        onClick={() => navigate('/')}
                        variant="neutral"
                        className="!px-4 !py-2"
                    >
                        Go Home
                    </PixelButton>
                </div>
            </PixelBox>
        </main>
    );
}
