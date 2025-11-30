import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // In a real implementation, we would fetch from the database
        // For now, return mock notifications
        const notifications = [
            {
                id: '1',
                type: 'party_invite',
                title: 'Party Invite',
                message: 'You have been invited to join "The Dragon Slayers"!',
                data: { partyId: '123', inviteCode: 'ABC123XY' },
                read: false,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                type: 'system',
                title: 'Welcome',
                message: 'Welcome to InnKeeper! Start your adventure today.',
                read: true,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            }
        ];

        return NextResponse.json({ notifications });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
