# MCAP Display & Enhanced Office PnL Plan

## Overview
Add Market Cap (MCAP) display alongside Pool MON/KEEP, and enhance Office PnL calculation to include KEEP earnings based on MCAP.

## Goals
1. Display KEEP token Market Cap (MCAP) alongside Pool MON and Pool KEEP
2. Calculate Office PnL using two methods:
   - **Current**: Dutch auction calculation (price paid vs current price)
   - **New**: KEEP minted × current KEEP price (derived from MCAP)
3. Use backend API for accurate MCAP calculation (consistent with other calculations)

---

## Implementation Plan

### Phase 1: Backend - MCAP Calculation Service

#### 1.1 Create MCAP Calculation Service
**File**: `apps/web/lib/services/mcapService.ts`

**Functions**:
- `getKeepTotalSupply()`: Fetch KEEP token totalSupply from contract
- `getKeepPrice()`: Calculate KEEP price from pool (Pool MON / Pool KEEP ratio)
- `getKeepMcap()`: Calculate MCAP = totalSupply × price per KEEP
- `getKeepPriceUsd()`: Calculate KEEP price in USD (using MON price)

**Implementation Details**:
```typescript
export interface KeepMcapData {
    totalSupply: string;        // Total KEEP supply (formatted)
    pricePerKeep: string;       // KEEP price in MON (formatted)
    pricePerKeepUsd: string;    // KEEP price in USD (formatted)
    mcap: string;               // Market cap in MON (formatted)
    mcapUsd: string;            // Market cap in USD (formatted)
}

export const mcapService = {
    async getKeepMcap(forceRefresh = false): Promise<KeepMcapData | null>
}
```

**Calculation Logic**:
1. Fetch KEEP `totalSupply()` from contract
2. Get pool liquidity (MON and KEEP amounts) from `getPoolLiquidity()`
3. Calculate KEEP price: `pricePerKeep = poolMon / poolKeep`
4. Get MON price in USD from `monPriceService.getMonPrice()`
5. Calculate:
   - `mcap = totalSupply × pricePerKeep` (in MON)
   - `mcapUsd = mcap × monPriceUsd` (in USD)
   - `pricePerKeepUsd = pricePerKeep × monPriceUsd` (in USD)

**Caching**: Use same pattern as other services (30s TTL)

---

#### 1.2 Create Backend API Route
**File**: `apps/web/app/api/mcap/route.ts`

**Endpoint**: `GET /api/mcap`

**Response**:
```json
{
    "success": true,
    "data": {
        "totalSupply": "1000000.00",
        "pricePerKeep": "0.0128",
        "pricePerKeepUsd": "0.000384",
        "mcap": "12800.00",
        "mcapUsd": "384.00"
    }
}
```

**Error Handling**: Return error response if calculation fails

---

### Phase 2: Frontend - MCAP Display

#### 2.1 Update HomeInfoDisplay Component
**File**: `apps/web/components/HomeInfoDisplay.tsx`

**Changes**:
1. Add state for MCAP data:
   ```typescript
   const [mcapData, setMcapData] = useState<KeepMcapData | null>(null);
   ```

2. Fetch MCAP data on mount and poll every 30s:
   ```typescript
   useEffect(() => {
       const fetchMcap = async () => {
           const data = await mcapService.getKeepMcap();
           setMcapData(data);
       };
       fetchMcap();
       const interval = setInterval(fetchMcap, 30000);
       return () => clearInterval(interval);
   }, []);
   ```

3. Update Pool display grid from 2 columns to 3 columns:
   ```tsx
   <div className="grid grid-cols-3 gap-2">
       {/* Pool MON */}
       {/* Pool KEEP */}
       {/* NEW: MCAP */}
       <PixelBox variant="dark" className="p-2 flex flex-col items-center justify-center min-w-0">
           <div className="text-[8px] text-zinc-400 uppercase tracking-wider mb-0.5">MCAP</div>
           <div className="text-green-400 font-bold text-xs font-mono truncate w-full text-center">
               {mcapData?.mcapUsd ? `$${parseFloat(mcapData.mcapUsd).toFixed(2)}` : '...'}
           </div>
           {mcapData?.mcap && (
               <div className="text-[6px] text-zinc-500 mt-0.5">
                   {parseFloat(mcapData.mcap).toFixed(2)} MON
               </div>
           )}
       </PixelBox>
   </div>
   ```

**Display Format**:
- Primary: USD value (e.g., "$384.00")
- Secondary: MON value (e.g., "12800.00 MON") in smaller text

---

### Phase 3: Enhanced Office PnL Calculation

#### 3.1 Update Office State Interface
**File**: `apps/web/lib/services/tavernKeeperService.ts`

**Add to OfficeState interface**:
```typescript
export interface OfficeState {
    // ... existing fields ...
    keepMinted?: string;        // KEEP tokens minted by current manager
    keepPriceUsd?: string;      // Current KEEP price in USD
    keepEarningsUsd?: string;   // KEEP earnings value in USD
}
```

**Note**: `keepMinted` is already available as `totalEarned` - we can use that!

---

#### 3.2 Create Office PnL Service
**File**: `apps/web/lib/services/officePnlService.ts`

**Functions**:
```typescript
export interface OfficePnlData {
    // Dutch Auction PnL (current)
    dutchAuctionPnl: {
        value: number;          // Raw value
        formatted: string;      // Formatted string (e.g., "+$5.23")
        color: 'green' | 'red'; // Color for display
    };

    // KEEP Earnings PnL (new)
    keepEarningsPnl: {
        value: number;          // Raw value in USD
        formatted: string;      // Formatted string (e.g., "+$12.45")
        keepMinted: string;     // KEEP tokens minted
        keepPriceUsd: string;   // Current KEEP price
        color: 'green' | 'red';
    };

    // Combined PnL
    totalPnl: {
        value: number;
        formatted: string;
        color: 'green' | 'red';
    };
}

export const officePnlService = {
    async calculateOfficePnl(
        officeState: OfficeState,
        monPriceUsd: number
    ): Promise<OfficePnlData>
}
```

**Calculation Logic**:

1. **Dutch Auction PnL** (existing logic):
   ```typescript
   const initPrice = parseFloat(officeState.initPrice);
   const currentPrice = parseFloat(officeState.currentPrice);
   const halfInitPrice = initPrice / 2.0;

   const dutchPnlValue = currentPrice > initPrice
       ? (currentPrice * 0.8) - halfInitPrice  // If price went UP
       : currentPrice - halfInitPrice;          // If price went DOWN

   const dutchPnlUsd = dutchPnlValue * monPriceUsd;
   ```

2. **KEEP Earnings PnL** (new):
   ```typescript
   const keepMinted = parseFloat(officeState.totalEarned); // Already available!
   const keepPriceUsd = await mcapService.getKeepPriceUsd();
   const keepEarningsUsd = keepMinted * keepPriceUsd;
   ```

3. **Total PnL**:
   ```typescript
   const totalPnlUsd = dutchPnlUsd + keepEarningsUsd;
   ```

---

#### 3.3 Update TheOffice Component
**File**: `apps/web/components/TheOffice.tsx`

**Changes**:
1. Import `officePnlService` and `mcapService`
2. Add state for enhanced PnL:
   ```typescript
   const [enhancedPnl, setEnhancedPnl] = useState<OfficePnlData | null>(null);
   ```

3. Calculate enhanced PnL in interpolation loop:
   ```typescript
   useEffect(() => {
       const calculatePnl = async () => {
           if (!state.currentKing || state.currentKing !== address) return;

           const monPriceUsd = await getMonPrice();
           const pnlData = await officePnlService.calculateOfficePnl(state, monPriceUsd);
           setEnhancedPnl(pnlData);
       };

       calculatePnl();
       const interval = setInterval(calculatePnl, 30000); // Every 30s
       return () => clearInterval(interval);
   }, [state, address]);
   ```

---

#### 3.4 Update TheOfficeView Component
**File**: `apps/web/components/TheOfficeView.tsx`

**Changes**:
1. Accept `enhancedPnl` as prop:
   ```typescript
   interface TheOfficeViewProps {
       // ... existing props ...
       enhancedPnl?: OfficePnlData | null;
   }
   ```

2. Update PnL display section to show both:
   ```tsx
   <div className="bg-[#2a1d17] border border-[#5c4033] rounded p-1 flex flex-col items-center justify-center">
       <div className="text-[6px] text-[#86efac] uppercase tracking-widest mb-0.5">Office PNL</div>

       {/* Total PnL */}
       <div className={`font-bold text-[10px] ${enhancedPnl?.totalPnl.color === 'green' ? 'text-green-400' : 'text-red-400'}`}>
           {enhancedPnl?.totalPnl.formatted || pnl || '$0.00'}
       </div>

       {/* Breakdown (if available) */}
       {enhancedPnl && (
           <div className="text-[5px] text-zinc-500 mt-0.5 space-y-0.5">
               <div>Dutch: {enhancedPnl.dutchAuctionPnl.formatted}</div>
               <div>KEEP: {enhancedPnl.keepEarningsPnl.formatted}</div>
           </div>
       )}
   </div>
   ```

**Alternative Display** (if space is limited):
- Show total PnL prominently
- Add tooltip/hover to show breakdown
- Or add a toggle to switch between "Simple" and "Detailed" view

---

### Phase 4: Testing & Validation

#### 4.1 Test Cases
1. **MCAP Calculation**:
   - Verify totalSupply is fetched correctly
   - Verify pool price calculation is accurate
   - Verify USD conversion uses correct MON price
   - Test with zero pool liquidity (edge case)
   - Test with zero totalSupply (edge case)

2. **Office PnL Calculation**:
   - Test with positive Dutch auction PnL
   - Test with negative Dutch auction PnL
   - Test with zero KEEP minted
   - Test with large KEEP amounts
   - Verify both calculations combine correctly

3. **UI Display**:
   - Verify MCAP displays correctly in HomeInfoDisplay
   - Verify PnL breakdown displays correctly
   - Test responsive layout (3 columns on mobile)
   - Verify loading states

---

### Phase 5: Documentation Updates

#### 5.1 Update Info/Tutorial Pages
- Add explanation of MCAP in info page
- Explain what MCAP represents (total value of all KEEP tokens)
- Explain how Office PnL is calculated (both methods)

#### 5.2 Update Docs
- Document MCAP calculation methodology
- Document Office PnL calculation (both methods)

---

## File Structure Summary

### New Files:
- `apps/web/lib/services/mcapService.ts` - MCAP calculation service
- `apps/web/lib/services/officePnlService.ts` - Enhanced PnL calculation service
- `apps/web/app/api/mcap/route.ts` - Backend API route for MCAP

### Modified Files:
- `apps/web/components/HomeInfoDisplay.tsx` - Add MCAP display
- `apps/web/components/TheOffice.tsx` - Add enhanced PnL calculation
- `apps/web/components/TheOfficeView.tsx` - Display enhanced PnL
- `apps/web/lib/services/tavernKeeperService.ts` - Add optional fields to OfficeState

---

## Implementation Order

1. **Phase 1**: Backend MCAP service and API route
2. **Phase 2**: Frontend MCAP display
3. **Phase 3**: Enhanced Office PnL calculation
4. **Phase 4**: Testing
5. **Phase 5**: Documentation

---

## Notes

- **MCAP Calculation**: Uses pool price (Pool MON / Pool KEEP) as the source of truth for KEEP price
- **Caching**: All services use 30s TTL for consistency
- **Error Handling**: Graceful degradation if MCAP calculation fails (show "..." or previous value)
- **Performance**: MCAP calculation is lightweight (just contract reads + simple math)
- **Backend Consistency**: Follows same pattern as other backend calculations (pool liquidity, office state, etc.)

---

## Future Enhancements (Optional)

1. **Historical MCAP**: Track MCAP over time (chart)
2. **MCAP Change**: Show 24h change percentage
3. **KEEP Price Chart**: Show KEEP price history
4. **Advanced PnL Metrics**: ROI, break-even analysis, etc.

