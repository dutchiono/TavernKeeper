import { NextRequest, NextResponse } from 'next/server';
import { getHeroByTokenId } from '../../../../lib/services/heroOwnership';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tokenId = searchParams.get('tokenId');

        if (!tokenId) {
            return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
        }

        const heroData = await getHeroByTokenId(tokenId);
        return NextResponse.json(heroData);
    } catch (error) {
        console.error('Error fetching hero by token ID:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hero data' },
            { status: 500 }
        );
    }
}
