/**
 * Test Pinata Integration
 *
 * Tests metadata upload, image upload, and gateway URL generation
 *
 * Usage:
 *   npx tsx apps/web/scripts/testing/test-pinata-integration.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { metadataStorage } from '../lib/services/metadataStorage';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testPinataIntegration() {
    console.log('🧪 Testing Pinata Integration...\n');

    // Check configuration
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

    console.log('Configuration:');
    console.log(`  JWT configured: ${jwt ? '✅ YES' : '❌ NO'}`);
    console.log(`  Gateway configured: ${gateway || '❌ NO (will use default)'}\n`);

    if (!jwt) {
        console.error('❌ ERROR: Pinata JWT not configured!');
        console.error('   Set NEXT_PUBLIC_PINATA_JWT or PINATA_JWT in .env');
        console.error('   Without JWT, uploads will fall back to data URIs\n');
    }

    // Test 1: Metadata Upload
    console.log('Test 1: Metadata Upload');
    try {
        const testMetadata = {
            name: "Test Hero #1",
            description: "A test hero for verifying Pinata integration",
            image: "ipfs://QmTestImageHash",
            attributes: [
                { trait_type: "Class", value: "Warrior" },
                { trait_type: "Level", value: 1 },
                { trait_type: "Test", value: true }
            ]
        };

        const metadataUri = await metadataStorage.upload(testMetadata, "test-hero-metadata.json");
        console.log(`  ✅ Upload successful!`);
        console.log(`  Metadata URI: ${metadataUri}`);

        if (metadataUri.startsWith('ipfs://')) {
            console.log(`  ✅ IPFS URI detected`);
            const httpUrl = metadataStorage.getHttpUrl(metadataUri);
            console.log(`  HTTP URL: ${httpUrl}`);
        } else if (metadataUri.startsWith('data:')) {
            console.log(`  ⚠️  Fallback to data URI (Pinata may not be configured)`);
        } else {
            console.log(`  ⚠️  Unexpected URI format: ${metadataUri}`);
        }
    } catch (error: any) {
        console.error(`  ❌ Upload failed: ${error.message}`);
    }

    console.log('\n');

    // Test 2: Image Upload (if we can create a test image)
    console.log('Test 2: Image Upload');
    try {
        // Create a simple test image (1x1 pixel PNG)
        const pngData = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );
        const testImage = new File([pngData], 'test-image.png', { type: 'image/png' });

        const imageUri = await metadataStorage.uploadFile(testImage, 'test-image.png');
        console.log(`  ✅ Upload successful!`);
        console.log(`  Image URI: ${imageUri}`);

        if (imageUri.startsWith('ipfs://')) {
            console.log(`  ✅ IPFS URI detected`);
            const httpUrl = metadataStorage.getHttpUrl(imageUri);
            console.log(`  HTTP URL: ${httpUrl}`);
        } else {
            console.log(`  ⚠️  Unexpected URI format: ${imageUri}`);
        }
    } catch (error: any) {
        if (error.message.includes('JWT not configured')) {
            console.log(`  ⚠️  Skipped (JWT not configured)`);
        } else {
            console.error(`  ❌ Upload failed: ${error.message}`);
        }
    }

    console.log('\n');

    // Test 3: Gateway URL Generation
    console.log('Test 3: Gateway URL Generation');
    try {
        const testIpfsUri = 'ipfs://QmTestHash123456789';
        const httpUrl = metadataStorage.getHttpUrl(testIpfsUri);
        console.log(`  ✅ Gateway URL generated`);
        console.log(`  IPFS URI: ${testIpfsUri}`);
        console.log(`  HTTP URL: ${httpUrl}`);

        if (httpUrl.includes('gateway.pinata.cloud') || httpUrl.includes('ipfs.io')) {
            console.log(`  ✅ Valid gateway URL`);
        } else {
            console.log(`  ⚠️  Unexpected gateway format`);
        }
    } catch (error: any) {
        console.error(`  ❌ Failed: ${error.message}`);
    }

    console.log('\n');

    // Summary
    console.log('📊 Summary:');
    if (jwt) {
        console.log('  ✅ Pinata is configured and ready to use');
        console.log('  ✅ Uploads should work correctly');
    } else {
        console.log('  ⚠️  Pinata JWT not configured');
        console.log('  ⚠️  Uploads will fall back to data URIs');
        console.log('  ⚠️  To enable Pinata: Set NEXT_PUBLIC_PINATA_JWT in .env');
    }
}

testPinataIntegration().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});

