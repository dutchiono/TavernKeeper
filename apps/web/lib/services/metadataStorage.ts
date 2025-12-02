/**
 * Metadata Storage Service
 * Handles uploading metadata to IPFS via Pinata API (using fetch)
 */

const PINATA_API_URL = "https://api.pinata.cloud";

export const metadataStorage = {
    /**
     * Upload JSON metadata to Pinata
     * Returns the IPFS URI to access the metadata
     */
    async upload(metadata: Record<string, unknown>, name: string = "metadata.json"): Promise<string> {
        try {
            const jwt = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;

            // If no JWT is configured, fall back to mock/data URI for development
            if (!jwt) {
                console.warn("Pinata JWT not found, falling back to data URI");
                const jsonString = JSON.stringify(metadata);
                return `data:application/json;base64,${Buffer.from(jsonString).toString('base64')}`;
            }

            const data = JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: {
                    name: name,
                    keyvalues: {
                        type: "metadata",
                        app: "innkeeper"
                    }
                },
                pinataOptions: {
                    cidVersion: 1,
                    group_id: process.env.PINATA_GROUP_ID
                }
            });

            const res = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: data,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Pinata upload failed: ${res.status} ${res.statusText} - ${errorText}`);
            }

            const result = await res.json();
            return `ipfs://${result.IpfsHash}`;
        } catch (error) {
            console.error("Failed to upload to Pinata:", error);
            throw error;
        }
    },

    /**
     * Upload a file (Blob/File) to Pinata
     */
    async uploadFile(file: File, name?: string): Promise<string> {
        try {
            const jwt = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;

            if (!jwt) {
                throw new Error("Pinata JWT not configured");
            }

            const formData = new FormData();
            formData.append("file", file);

            const metadata = JSON.stringify({
                name: name || file.name,
                keyvalues: {
                    type: "asset",
                    app: "innkeeper"
                }
            });
            formData.append("pinataMetadata", metadata);

            const options = JSON.stringify({
                cidVersion: 1,
                group_id: process.env.PINATA_GROUP_ID
            });
            formData.append("pinataOptions", options);

            const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Pinata file upload failed: ${res.status} ${res.statusText} - ${errorText}`);
            }

            const result = await res.json();
            return `ipfs://${result.IpfsHash}`;
        } catch (error) {
            console.error("Failed to upload file to Pinata:", error);
            throw error;
        }
    },

    /**
     * Get the HTTP URL for a given metadata URI
     * Handles ipfs://, ar://, and data: protocols
     */
    getHttpUrl(uri: string): string {
        if (!uri) return '';

        if (uri.startsWith('ipfs://')) {
            const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
            return `https://${gateway}/ipfs/${uri.replace('ipfs://', '')}`;
        }

        if (uri.startsWith('ar://')) {
            return `https://arweave.net/${uri.replace('ar://', '')}`;
        }

        return uri;
    }
};
