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
 * First checks cache, then fetches from database if not found
 */
export async function getOfficeManagerData(address: string): Promise<OfficeManagerData | null> {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();
    const cachedData = memoryCache.get(normalizedAddress);

    // Return cached data if valid
    if (cachedData && Date.now() - cachedData.cachedAt < CACHE_EXPIRY) {
        return cachedData;
    }

    // If expired or not in cache, fetch from database
    try {
        const response = await fetch(`/api/office/get-manager?address=${encodeURIComponent(normalizedAddress)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.fid || data.username) {
                const managerData: OfficeManagerData = {
                    fid: data.fid,
                    username: data.username,
                    displayName: data.displayName,
                    cachedAt: Date.now(),
                };
                // Update cache
                memoryCache.set(normalizedAddress, managerData);
                saveToLocalStorage();
                return managerData;
            }
        }
    } catch (error) {
        console.error('Failed to fetch office manager data from database:', error);
    }

    // Return expired cache if available (better than nothing)
    if (cachedData) {
        return cachedData;
    }

    return null;
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
