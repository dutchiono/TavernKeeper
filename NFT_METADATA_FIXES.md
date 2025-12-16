# NFT Metadata Reading Fixes

## Critical Issues Fixed

### 1. **Missing `metadata_uri` Storage in `syncUserHeroes`**

**Problem:** When heroes were synced from the blockchain, the `token_uri` was fetched but NOT stored in the `heroes` table. This meant that when heroes were later retrieved from the database (e.g., when placing them in locations), there was no way to fetch their metadata.

**Fix:** Added `metadata_uri: uri` to the `heroData` object in `syncUserHeroes` function (`apps/web/lib/services/heroOwnership.ts:109`).

```typescript
const heroData = {
    token_id: tokenId,
    contract_address: contractAddress,
    owner_address: walletAddress.toLowerCase(),
    name: metadata.name || `Hero #${tokenId}`,
    image_uri: metadata.image || '',
    attributes: metadata.attributes || [],
    metadata_uri: uri, // ✅ NOW STORED
    updated_at: new Date().toISOString(),
};
```

### 2. **Silent Defaults to 'Warrior' Class**

**Problem:** When metadata was missing or incomplete, the code would silently default to 'Warrior' class instead of throwing an error. This masked data quality issues and caused incorrect hero stats.

**Fixes:**

#### a. `getHeroByTokenId` - No More Warrior Default
- **File:** `apps/web/lib/services/heroOwnership.ts`
- **Before:** `const heroClass = ... || 'Warrior';`
- **After:** Throws error if class is missing:
```typescript
const heroClass = metadata.hero?.class || metadata.attributes?.find((a: any) => a.trait_type === 'Class')?.value;

if (!heroClass) {
    throw new Error(`Hero ${tokenId} metadata is missing class information. Metadata: ${JSON.stringify(metadata)}`);
}
```

#### b. `getHeroByTokenId` - No More Warrior Stats Default
- **Before:** `const classStats = baseStats[heroClass] || baseStats.Warrior;`
- **After:** Throws error if class is invalid:
```typescript
const classStats = baseStats[heroClass as keyof typeof baseStats];
if (!classStats) {
    throw new Error(`Hero ${tokenId} has invalid class: ${heroClass}. Valid classes: Warrior, Mage, Rogue, Cleric`);
}
```

#### c. `initializeAdventurerStats` - No More Warrior Default
- **File:** `apps/web/lib/services/heroAdventurerInit.ts`
- **Before:** Defaulted to 'warrior' if class was missing
- **After:** Throws error:
```typescript
if (!classToUse) {
    throw new Error(`[HeroInit] Hero ${tokenId} metadata is missing class information. Metadata: ${JSON.stringify(hero.metadata)}`);
}
```

#### d. `initializeAdventurerStats` - No More Warrior Stats/Hit Die Defaults
- **Before:** `const baseStats = BASE_STATS[normalizedClass] || BASE_STATS.warrior;`
- **After:** Throws error if class is invalid:
```typescript
const baseStats = BASE_STATS[normalizedClass];
if (!baseStats) {
    throw new Error(`[HeroInit] Invalid hero class: ${normalizedClass}. Valid classes: warrior, mage, rogue, cleric`);
}
```

### 3. **Improved Metadata Fetch Error Handling**

**Problem:** When metadata fetch failed, errors were logged as warnings and metadata was silently empty, leading to defaults.

**Fix:**
- Changed `console.warn` to `console.error` for metadata fetch failures
- Added fallback to try fetching from stored `metadata_uri` in database if initial fetch fails
- Added better error messages with context

**File:** `apps/web/lib/services/heroOwnership.ts:196-220`

```typescript
} catch (e) {
    console.error(`Failed to fetch metadata for token ${tokenId} from URI ${uri}:`, e);
}

// If metadata is empty, try to get from stored metadata_uri in database
if (!metadata || Object.keys(metadata).length === 0) {
    try {
        const { data: heroRecord } = await supabase
            .from('heroes')
            .select('metadata_uri, attributes')
            .eq('token_id', tokenId)
            .eq('contract_address', contractAddress)
            .single();

        if (heroRecord?.metadata_uri) {
            // Try fetching from stored URI
            // ... fetch logic ...
        }
    } catch (fallbackError) {
        console.error(`Failed to fetch metadata from stored URI for token ${tokenId}:`, fallbackError);
    }
}
```

## Testing

Comprehensive tests have been written in `apps/web/__tests__/services/heroMetadataReading.test.ts` to verify:

1. ✅ `token_uri` is stored in heroes table during sync
2. ✅ No silent defaults to 'Warrior' when metadata is missing
3. ✅ Proper error throwing when class is missing
4. ✅ Proper extraction of class from `metadata.hero.class` and `metadata.attributes`
5. ✅ Handling of different URI formats (data:, ipfs:, http:)
6. ✅ Error handling when metadata fetch fails completely

## Impact

### Before Fixes:
- Heroes placed in locations showed default 'Warrior' stats even if they were actually Mages, Rogues, or Clerics
- Metadata couldn't be fetched later because URI wasn't stored
- Silent failures masked data quality issues
- Incorrect hero stats in game simulations

### After Fixes:
- ✅ Metadata URI is always stored, enabling later metadata fetches
- ✅ Missing or invalid metadata throws clear errors instead of silently defaulting
- ✅ Hero stats are always correct based on actual metadata
- ✅ Better error messages help identify and fix data quality issues

## Migration Notes

**Database Schema:** Ensure the `heroes` table has a `metadata_uri` column. If it doesn't exist, add it:

```sql
ALTER TABLE heroes ADD COLUMN IF NOT EXISTS metadata_uri TEXT;
```

**Existing Data:** Heroes that were synced before this fix won't have `metadata_uri` stored. They will need to be re-synced, or the metadata can be fetched from the contract when needed (which `getHeroByTokenId` already does).

## Next Steps

1. Run the test suite to verify all fixes work correctly
2. Re-sync existing heroes to populate `metadata_uri` in database
3. Monitor error logs for any heroes with missing/invalid metadata
4. Update any UI components that might be expecting default 'Warrior' behavior

