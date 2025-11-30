import { NextRequest, NextResponse } from 'next/server';
import { syncUserHeroes } from '../../../../lib/services/heroOwnership';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { walletAddress } = body;

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const tokenIds = await syncUserHeroes(walletAddress);

        return NextResponse.json({ success: true, tokenIds });
    } catch (error) {
        console.error('Error syncing heroes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
