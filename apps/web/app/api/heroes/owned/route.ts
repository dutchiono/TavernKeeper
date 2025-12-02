import { NextRequest, NextResponse } from 'next/server';
import { getUserOwnedTokenIds } from '../../../../lib/services/heroOwnership';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get('walletAddress');

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const tokenIds = await getUserOwnedTokenIds(walletAddress);
        return NextResponse.json({ tokenIds });
    } catch (error) {
        console.error('Error fetching owned token IDs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch owned token IDs' },
            { status: 500 }
        );
    }
}
