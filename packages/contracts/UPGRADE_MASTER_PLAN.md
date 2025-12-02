# UUPS Conversion Master Plan

## Overview
Convert all non-upgradeable contracts to UUPS proxy pattern to enable future upgrades and fix the CellarHook potBalance bug. This requires contract refactoring, deployment scripts, frontend updates, and comprehensive testing.

## Contracts Requiring Conversion

### 1. CellarHook (Priority: CRITICAL - Has Bug)
- **Current**: Direct deployment, not upgradeable
- **Issue**: `receive()` function doesn't update `potBalance`, causing `raid()` to send 0 rewards
- **Dependencies**: Used by TavernKeeper (treasury), CellarZapV4, PoolManager
- **Complexity**: HIGH - Inherits from BaseHook and ERC20, has Uniswap v4 hook requirements

### 2. CellarZapV4
- **Current**: Direct deployment, not upgradeable
- **Dependencies**: Uses CellarHook, PoolManager, MON, KEEP
- **Complexity**: MEDIUM - Simple Ownable contract

### 3. Create2Factory
- **Current**: Direct deployment, not upgradeable
- **Dependencies**: Used to deploy CellarHook with specific address requirements
- **Complexity**: LOW - Simple factory contract
- **Note**: May not need conversion if only used for initial deployment

## Contracts Already Upgradeable
- KeepToken ✅
- Inventory ✅
- Adventurer ✅
- TavernKeeper ✅
- DungeonGatekeeper ✅

## Contracts That Cannot Be Changed
- PoolManager (Uniswap v4 contract)
- ERC6551Registry (Standard infrastructure)
- ERC6551Account (Implementation contract)

## Implementation Strategy

### Phase 1: Contract Conversion
1. Convert CellarHook to UUPS pattern
2. Convert CellarZapV4 to UUPS pattern
3. Evaluate Create2Factory conversion necessity
4. Fix potBalance bug in CellarHook during conversion

### Phase 2: Deployment Scripts
1. Create upgrade scripts for each contract
2. Update deployment-info-v4.json structure
3. Create migration scripts to preserve state

### Phase 3: Frontend Updates
1. Update contract addresses in addresses.ts
2. Update contract registry with proxy addresses
3. Update all service files that reference contracts
4. Test all frontend integrations

### Phase 4: Testing & Validation
1. Unit tests for converted contracts
2. Integration tests for contract interactions
3. Frontend integration tests
4. End-to-end testing

## Key Technical Challenges

1. **CellarHook BaseHook Inheritance**: Uniswap v4 hooks have specific requirements. Need to verify UUPS compatibility with BaseHook.

2. **Address Mining for CellarHook**: Current deployment uses Create2Factory with salt mining for specific hook flags. UUPS proxy will have different address - need to verify hook flag requirements still met.

3. **State Migration**: Existing contracts have state (potBalance, slot0, etc.). Need to ensure initialization preserves this.

4. **Frontend Address Updates**: Multiple files reference contract addresses. Need systematic update.

5. **Deployment Order**: CellarHook must be deployed before CellarZapV4 (dependency). TavernKeeper treasury must be updated.

## Checklist Files

1. `CHECKLIST_CELLARHOOK.md` - CellarHook conversion checklist
2. `CHECKLIST_CELLARZAP.md` - CellarZapV4 conversion checklist
3. `CHECKLIST_FRONTEND.md` - Frontend updates checklist
4. `CHECKLIST_DEPLOYMENT.md` - Deployment execution checklist
5. `CHECKLIST_TESTING.md` - Testing and validation checklist

## Success Criteria

- [ ] All target contracts converted to UUPS pattern
- [ ] potBalance bug fixed in CellarHook
- [ ] All contracts successfully deployed
- [ ] Frontend updated and functional
- [ ] All tests passing
- [ ] No state loss during migration
- [ ] Documentation complete
