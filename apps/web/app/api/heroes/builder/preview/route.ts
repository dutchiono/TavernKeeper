import { NextResponse } from 'next/server';
import { heroMinting } from '../../../../../lib/services/heroMinting';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { heroData } = body;

        if (!heroData) {
            return NextResponse.json(
                { error: 'Missing hero data' },
                { status: 400 }
            );
        }

        const metadata = heroMinting.generateMetadata(heroData);

        return NextResponse.json({ success: true, metadata });
    } catch (error: any) {
        console.error('Error generating preview:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate preview' },
            { status: 500 }
        );
    }
}
