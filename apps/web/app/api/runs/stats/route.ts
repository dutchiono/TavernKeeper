import { NextRequest, NextResponse } from 'next/server';
import { dungeonStateService } from '@/lib/services/dungeonStateService';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    try {
        const stats = await dungeonStateService.getUserDailyStats(wallet);

        let dailyRuns = stats.dailyRuns;
        if (stats.needsReset) {
            dailyRuns = 0;
        }

        return NextResponse.json({
            dailyRuns,
            freeRunsLimit: 2,
            remainingFreeRuns: Math.max(0, 2 - dailyRuns)
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
