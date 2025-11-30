import { NextResponse } from 'next/server';
import { heroMinting } from '../../../../lib/services/heroMinting';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletAddress, heroData } = body;

        if (!walletAddress || !heroData) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const txHash = await heroMinting.mintHero(walletAddress, heroData);

        return NextResponse.json({ success: true, txHash });
    } catch (error: any) {
        console.error('Error minting hero:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to mint hero' },
            { status: 500 }
        );
    }
}
