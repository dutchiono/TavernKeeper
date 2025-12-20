/**
 * Broadcast Notification Test Script
 *
 * Tests Farcaster miniapp broadcast notifications using the Neynar API.
 * This script tests sending notifications to ALL users (empty targetFids array).
 *
 * Usage: pnpm tsx apps/web/scripts/testing/test-broadcast-notifications.ts
 *    or: cd apps/web && pnpm tsx scripts/testing/test-broadcast-notifications.ts
 *    or: cd apps/web && pnpm test:broadcast-notifications
 */

import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('📢 Farcaster Broadcast Notification Test Script\n');
    console.log('This script tests sending notifications to ALL users who have enabled notifications.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check for API key
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: NEYNAR_API_KEY not found in environment variables.');
        console.log('Please set NEYNAR_API_KEY in your .env file.');
        process.exit(1);
    }

    console.log(`✅ Using NEYNAR_API_KEY: ${apiKey.substring(0, 8)}...\n`);

    const client = new NeynarAPIClient({ apiKey });

    try {
        // Get notification details
        console.log('--- Broadcast Notification Details ---');
        const titleInput = await question('Notification title [default: Test Broadcast]: ');
        const title = titleInput.trim() || 'Test Broadcast';

        const bodyInput = await question('Notification body [default: This is a test broadcast notification]: ');
        const body = bodyInput.trim() || 'This is a test broadcast notification';

        const urlInput = await question('Target URL [default: https://tavernkeeper.xyz/miniapp]: ');
        const targetUrl = urlInput.trim() || 'https://tavernkeeper.xyz/miniapp';

        // Optional filters
        console.log('\n--- Optional Filters (press Enter to skip) ---');
        const excludeFidsInput = await question('Exclude FIDs (comma-separated, e.g., 420,69): ');
        const excludeFids = excludeFidsInput.trim()
            ? excludeFidsInput.split(',').map(fid => parseInt(fid.trim(), 10)).filter(fid => !isNaN(fid))
            : undefined;

        const followingFidInput = await question('Only send to users following this FID: ');
        const followingFid = followingFidInput.trim() ? parseInt(followingFidInput.trim(), 10) : undefined;

        const minScoreInput = await question('Minimum user score (0.0-1.0): ');
        const minimumUserScore = minScoreInput.trim() ? parseFloat(minScoreInput.trim()) : undefined;

        // Build filters object
        const filters: any = {};
        if (excludeFids && excludeFids.length > 0) {
            filters.exclude_fids = excludeFids;
        }
        if (followingFid && !isNaN(followingFid)) {
            filters.following_fid = followingFid;
        }
        if (minimumUserScore !== undefined && !isNaN(minimumUserScore)) {
            filters.minimum_user_score = minimumUserScore;
        }

        console.log('\n--- Summary ---');
        console.log('📱 Broadcast Notification:');
        console.log(`   Title: ${title}`);
        console.log(`   Body: ${body}`);
        console.log(`   Target URL: ${targetUrl}`);
        console.log(`   Target: ALL users with notifications enabled`);
        if (Object.keys(filters).length > 0) {
            console.log('   Filters:');
            if (filters.exclude_fids) {
                console.log(`     - Exclude FIDs: ${filters.exclude_fids.join(', ')}`);
            }
            if (filters.following_fid) {
                console.log(`     - Following FID: ${filters.following_fid}`);
            }
            if (filters.minimum_user_score !== undefined) {
                console.log(`     - Minimum User Score: ${filters.minimum_user_score}`);
            }
        } else {
            console.log('   Filters: None (broadcast to all)');
        }
        console.log('');

        const confirm = await question('Send broadcast notification? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            process.exit(0);
        }

        // Send broadcast notification
        console.log('\n📢 Sending broadcast notification...');
        console.log('   (This may take a moment as it targets all users with notifications enabled)\n');

        try {
            const response = await client.publishFrameNotifications({
                targetFids: [], // Empty array = broadcast to all users with notifications enabled
                filters: Object.keys(filters).length > 0 ? filters : undefined,
                notification: {
                    title: title,
                    body: body,
                    target_url: targetUrl,
                },
            });

            console.log('✅ Broadcast notification sent successfully!');
            console.log('   Response:', JSON.stringify(response, null, 2));
            console.log('\n📝 Note: Users will see this notification in their Farcaster miniapp if they have:');
            console.log('   1. Added your miniapp');
            console.log('   2. Enabled notifications for your miniapp');
        } catch (error: any) {
            console.error('\n❌ Error sending broadcast notification:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
            } else if (error.data) {
                console.error('Error data:', JSON.stringify(error.data, null, 2));
            } else {
                console.error('Error message:', error.message || error);
            }
            if (error.stack) {
                console.error('\nStack trace:', error.stack);
            }
            process.exit(1);
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:');
        console.error(error.message || error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

