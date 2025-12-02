import { metadataStorage } from '../lib/services/metadataStorage';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testPinataUpload() {
    console.log("Testing Pinata Upload...");
    console.log("JWT configured:", !!process.env.NEXT_PUBLIC_PINATA_JWT);
    console.log("Gateway configured:", process.env.NEXT_PUBLIC_PINATA_GATEWAY);

    const testMetadata = {
        name: "Test Hero #1",
        description: "A test hero for verifying Pinata integration",
        image: "ipfs://QmTestImageHash", // Mock image hash for metadata test
        attributes: [
            { trait_type: "Class", value: "Warrior" },
            { trait_type: "Level", value: 1 }
        ]
    };

    try {
        const uri = await metadataStorage.upload(testMetadata, "test-hero-metadata.json");
        console.log("Upload successful!");
        console.log("Metadata URI:", uri);
        console.log("HTTP URL:", metadataStorage.getHttpUrl(uri));
    } catch (error) {
        console.error("Upload failed:", error);
    }
}

testPinataUpload();
