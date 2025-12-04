/**
 * Office Manager FID Cache Service
 *
 * Stores Farcaster FID/name data for office managers when they take office from miniapp.
 * Uses in-memory cache with localStorage backup for persistence.
 */

export interface OfficeManagerData {
    fid?: number;
    username?: string;
    displayName?: string;
    cachedAt: number; // timestamp
}

const CACHE_KEY = 'office_manager_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache
const memoryCache = new Map<string, OfficeManagerData>();

// Load from localStorage on init
if (typeof window !== 'undefined') {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Record<string, OfficeManagerData>;
            Object.entries(parsed).forEach(([address, data]) => {
                // Only load if not expired
                if (Date.now() - data.cachedAt < CACHE_EXPIRY) {
                    memoryCache.set(address.toLowerCase(), data);
                }
            });
        }
    } catch (e) {
        console.warn('Failed to load office manager cache from localStorage', e);
    }
}

/**
 * Save cache to localStorage
 */
function saveToLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
        const data: Record<string, OfficeManagerData> = {};
        memoryCache.forEach((value, key) => {
            data[key] = value;
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save office manager cache to localStorage', e);
    }
}

/**
 * Set office manager data for an address
 */
export function setOfficeManagerData(
    address: string,
    data: { fid?: number; username?: string; displayName?: string }
): void {
    if (!address) return;

    const normalizedAddress = address.toLowerCase();
    const cacheData: OfficeManagerData = {
        ...data,
        cachedAt: Date.now(),
    };

    memoryCache.set(normalizedAddress, cacheData);
    saveToLocalStorage();
}

/**
 * Get office manager data for an address
 */
export function getOfficeManagerData(address: string): OfficeManagerData | null {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();
    const data = memoryCache.get(normalizedAddress);

    if (!data) return null;

    // Check if expired
    if (Date.now() - data.cachedAt > CACHE_EXPIRY) {
        memoryCache.delete(normalizedAddress);
        saveToLocalStorage();
        return null;
    }

    return data;
}

/**
 * Clear cache for a specific address
 */
export function clearOfficeManagerData(address: string): void {
    if (!address) return;

    const normalizedAddress = address.toLowerCase();
    memoryCache.delete(normalizedAddress);
    saveToLocalStorage();
}

/**
 * Clear all cached data
 */
export function clearAllOfficeManagerData(): void {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {
            console.warn('Failed to clear office manager cache from localStorage', e);
        }
    }
}
