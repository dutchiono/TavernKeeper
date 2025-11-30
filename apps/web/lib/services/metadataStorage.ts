/**
 * Metadata Storage Service
 * Handles uploading metadata to IPFS or other storage solutions
 */

export const metadataStorage = {
    /**
     * Upload JSON metadata to storage
     * Returns the URI to access the metadata
     */
    async upload(metadata: Record<string, unknown>): Promise<string> {
        // In a real implementation, this would upload to IPFS (Pinata, NFT.storage, etc.)
        // For now, we'll return a data URI for small metadata, or a mock URL

        // If metadata is small enough, use data URI
        const jsonString = JSON.stringify(metadata);
        if (jsonString.length < 1000) {
            return `data:application/json;base64,${Buffer.from(jsonString).toString('base64')}`;
        }

        // Mock IPFS hash for larger data (would need real IPFS integration)
        console.log('Mock uploading metadata:', metadata);
        return `ipfs://QmMockHash${Date.now()}`;
    },

    /**
     * Get the HTTP URL for a given metadata URI
     * Handles ipfs://, ar://, and data: protocols
     */
    getHttpUrl(uri: string): string {
        if (!uri) return '';

        if (uri.startsWith('ipfs://')) {
            return `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`;
        }

        if (uri.startsWith('ar://')) {
            return `https://arweave.net/${uri.replace('ar://', '')}`;
        }

        return uri;
    }
};
