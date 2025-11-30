import { describe, it, expect } from 'vitest';
import { metadataStorage } from '../../lib/services/metadataStorage';

describe('metadataStorage', () => {
    describe('upload', () => {
        it('should return data URI for small metadata', async () => {
            const metadata = { name: 'Test' };
            const uri = await metadataStorage.upload(metadata);
            expect(uri).toContain('data:application/json;base64,');
        });

        it('should return ipfs URI for large metadata (mock)', async () => {
            const largeData = { data: 'a'.repeat(2000) };
            const uri = await metadataStorage.upload(largeData);
            expect(uri).toContain('ipfs://');
        });
    });

    describe('getHttpUrl', () => {
        it('should convert ipfs:// to https://ipfs.io/ipfs/', () => {
            const uri = 'ipfs://QmHash';
            expect(metadataStorage.getHttpUrl(uri)).toBe('https://ipfs.io/ipfs/QmHash');
        });

        it('should return http urls as is', () => {
            const uri = 'https://example.com/meta.json';
            expect(metadataStorage.getHttpUrl(uri)).toBe('https://example.com/meta.json');
        });
    });
});
