import { NextRequest, NextResponse } from 'next/server';
import { mcapService } from '../../../lib/services/mcapService';

/**
 * GET /api/mcap
 * Returns KEEP token market cap data
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const forceRefresh = searchParams.get('refresh') === 'true';

        const mcapData = await mcapService.getKeepMcap(forceRefresh);

        if (!mcapData) {
            return NextResponse.json(
                { success: false, error: 'Unable to calculate MCAP. Pool may be empty or data unavailable.' },
                { status: 503 }
            );
        }

        return NextResponse.json({
            success: true,
            data: mcapData,
        });
    } catch (error) {
        console.error('Error in /api/mcap route:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

