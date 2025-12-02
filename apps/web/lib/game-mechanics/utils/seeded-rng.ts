/**
 * Seeded Random Number Generator (Mulberry32)
 * 
 * Provides deterministic random number generation based on a seed.
 * This ensures that the same seed always produces the same sequence of random numbers.
 */

export class SeededRNG {
    private seed: number;

    constructor(seed?: number | string | null) {
        if (typeof seed === 'string') {
            // Convert string seed to number
            this.seed = this.hashString(seed);
        } else if (typeof seed === 'number') {
            this.seed = seed;
        } else {
            // Generate random seed if none provided
            this.seed = Math.floor(Math.random() * 0xFFFFFFFF);
        }
    }

    /**
     * Hash a string to a number
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Generate next random number in sequence
     */
    private next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Get a random number between 0 and 1
     */
    public random(): number {
        return this.next();
    }

    /**
     * Get a random integer between min and max (inclusive)
     */
    public range(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Choose a random element from an array
     */
    public choice<T>(array: T[]): T {
        return array[Math.floor(this.next() * array.length)];
    }

    /**
     * Get the current seed (useful for debugging)
     */
    public getSeed(): number {
        return this.seed;
    }
}
