# Cellar Integration Analysis

## Overview

This document provides a comprehensive analysis of the Cellar system (CellarHook and CellarZapV4) to understand how Bar Regulars and Town Posse will integrate with it.

## Current CellarHook Architecture

### Contract Details

**File**: `packages/contracts/contracts/hooks/CellarHook.sol`
**Type**: UUPS Upgradeable Proxy
**Inheritance**: `IHooks`, `ERC20Upgradeable`, `OwnableUpgradeable`, `UUPSUpgradeable`

### State Variables

```solidity
IPoolManager public poolManager;        // Uniswap V4 PoolManager
Currency public MON;                    // MON token (native if address(0))
Currency public KEEP;                   // KEEP token address
uint256 public potBalance;              // Accumulated fees (the pot)
mapping(address => uint256) public lastTradeBlock; // Anti-sandwich protection

// Auction parameters
uint256 public epochPeriod;             // Duration of each auction epoch
uint256 public priceMultiplier;         // Price multiplier for next epoch
uint256 public minInitPrice;            // Minimum initial price

// Auction state
Slot0 public slot0;                    // Packed auction state
struct Slot0 {
    uint8 locked;                       // Reentrancy lock (1=unlocked, 2=locked)
    uint16 epochId;                     // Current epoch ID
    uint192 initPrice;                  // Initial price for this epoch
    uint40 startTime;                   // Epoch start timestamp
}
```

### Key Functions

#### 1. `addLiquidity()`
**Purpose**: Add MON+KEEP liquidity, receive LP tokens

**Flow**:
1. Transfers MON and KEEP from caller to contract
2. Approves PoolManager to spend tokens
3. Adds liquidity to PoolManager (placeholder - actual implementation needed)
4. Mints LP tokens (CLP) to caller (1:1 with MON amount - placeholder)

**Current Implementation**:
```solidity
function addLiquidity(PoolKey calldata key, uint256 amountMON, uint256 amountKEEP, int24 tickLower, int24 tickUpper) external payable {
    // Transfer tokens
    // Approve PoolManager
    // Add liquidity (placeholder)
    // Mint LP tokens (1:1 with MON - placeholder)
    _mint(msg.sender, liquidityMinted);
}
```

**Integration Point for Groups**:
- Groups will call this function on behalf of members
- Groups need to track LP tokens received
- Groups need to handle 1% contribution tax before calling

#### 2. `raid()`
**Purpose**: Burn LP tokens to claim the pot

**Flow**:
1. Calculate current auction price
2. Verify caller has enough LP tokens
3. Burn LP tokens (payment)
4. Transfer potBalance to caller
5. Reset potBalance to 0
6. Start new auction epoch

**Current Implementation**:
```solidity
function raid(uint256 maxPaymentAmount) external nonReentrant returns (uint256 paymentAmount) {
    // Calculate price from slot0
    // Verify balance
    // Burn LP tokens
    // Transfer pot
    // Reset pot
    // Setup new auction
}
```

**Integration Point for Groups**:
- Groups could potentially raid (burn group LP tokens)
- Reward would go to group contract
- Group would distribute to members proportionally

#### 3. `receive()`
**Purpose**: Receive native MON and update potBalance

**Current Implementation**:
```solidity
receive() external payable {
    if (Currency.unwrap(MON) == address(0) && msg.value > 0) {
        potBalance += msg.value;
    }
}
```

**Integration Point for Groups**:
- Groups will call this via `contributeToPot()` function (to be added)
- Groups send 20% of fees here
- Groups send 1% contribution tax here

#### 4. `getAuctionPrice()`
**Purpose**: Get current auction price (LP tokens needed to raid)

**Returns**: Current price based on time elapsed in epoch

**Integration Point for Groups**:
- Groups can check price before deciding to raid
- Used for UI display

### ERC20 LP Token (CLP)

**Token Name**: "Cellar LP"
**Token Symbol**: "CLP"
**Standard**: ERC20Upgradeable

**Key Functions**:
- `balanceOf(address)` - Get LP token balance
- `transfer()` - Transfer LP tokens
- `_mint()` - Mint new LP tokens (internal)
- `_burn()` - Burn LP tokens (internal)

**Integration Point for Groups**:
- Groups will hold LP tokens in their contract
- Groups track member shares proportionally
- Groups can transfer/burn LP tokens

## Current CellarZapV4 Architecture

### Contract Details

**File**: `packages/contracts/contracts/CellarZapV4.sol`
**Type**: UUPS Upgradeable Proxy
**Purpose**: Entry point for adding liquidity

### State Variables

```solidity
IPoolManager public poolManager;
address public cellarHook;
Currency public MON;
Currency public KEEP;
```

### Key Functions

#### `mintLP()`
**Purpose**: User-friendly entry point for adding liquidity

**Flow**:
1. Receives MON and KEEP from user
2. Approves CellarHook to spend tokens
3. Constructs PoolKey
4. Calls `CellarHook.addLiquidity()`
5. Transfers LP tokens to user

**Integration Point for Groups**:
- Groups can use this OR call CellarHook directly
- Groups need to handle contribution tax before calling
- Groups receive LP tokens in their contract

## Fee Flow Analysis

### Current Fee Sources

1. **TavernKeeper Fees**:
   - 15% of office price → CellarHook.potBalance
   - Sent via `payable(treasury).transfer()`
   - CellarHook.receive() updates potBalance

2. **Future Group Fees**:
   - 20% of group earnings → CellarHook.potBalance
   - 1% of group contributions → CellarHook.potBalance
   - Sent via `contributeToPot()` function (to be added)

### Fee Distribution Flow

```
TavernKeeper.takeOffice()
  └─> 15% fee → CellarHook.receive()
        └─> potBalance += fee

Group.earnFees()
  └─> 20% → CellarHook.contributeToPot()
        └─> potBalance += fee

Group.addLiquidity()
  └─> 1% tax → CellarHook.contributeToPot()
        └─> potBalance += tax
```

## Integration Points

### 1. Adding Liquidity

**Current Flow**:
```
User → CellarZapV4.mintLP() → CellarHook.addLiquidity() → LP tokens to user
```

**Group Flow**:
```
Group Member → BarRegularsManager.contributeToGroup()
  ├─> Calculate 1% tax
  ├─> Send tax to CellarHook.contributeToPot()
  └─> Call CellarHook.addLiquidity() with 99%
      └─> LP tokens minted to group contract
          └─> Track member shares proportionally
```

### 2. Fee Distribution

**Current Flow**:
- Fees accumulate in potBalance
- Users raid to claim

**Group Flow**:
```
Group LP Position earns fees
  ├─> Calculate total fees earned
  ├─> 80% → Distribute to members (proportional)
  └─> 20% → CellarHook.contributeToPot()
      └─> potBalance += fee
```

### 3. Raiding

**Current Flow**:
```
User → CellarHook.raid() → Burn LP → Claim pot
```

**Group Flow** (Optional):
```
Group → BarRegularsManager.raidAsGroup()
  ├─> Verify group has enough LP
  ├─> Call CellarHook.raid() (or implement in manager)
  ├─> Receive pot reward
  └─> Distribute to members proportionally
```

## Required CellarHook Extensions

### Function: `contributeToPot()`

**Purpose**: Allow groups to contribute fees/taxes to potBalance

**Signature**:
```solidity
function contributeToPot() external payable {
    if (Currency.unwrap(MON) == address(0) && msg.value > 0) {
        potBalance += msg.value;
    }
}
```

**Rationale**:
- Groups need a way to contribute to pot
- Uses same logic as receive() but explicit function
- Maintains backward compatibility
- No breaking changes

**Alternative**: Could use `receive()` directly, but explicit function is clearer

### Optional: `raidForGroup()`

**Purpose**: Allow groups to raid (burn group LP, claim pot)

**Consideration**: Could be implemented in manager contracts instead

**If implemented in CellarHook**:
```solidity
function raidForGroup(uint256 maxPaymentAmount, address groupContract)
    external
    nonReentrant
    returns (uint256 paymentAmount)
{
    require(balanceOf(groupContract) >= paymentAmount, "Insufficient group LP");
    _burn(groupContract, paymentAmount);

    uint256 reward = potBalance;
    potBalance = 0;

    if (Currency.unwrap(MON) == address(0)) {
        (bool success, ) = groupContract.call{value: reward}("");
        require(success, "Transfer failed");
    } else {
        IERC20(Currency.unwrap(MON)).safeTransfer(groupContract, reward);
    }

    // Setup new auction (same as individual raid)
    // ...
}
```

**Recommendation**: Implement in manager contracts for simplicity

## State Tracking Requirements

### For Groups

**LP Token Tracking**:
- Groups need to track total LP tokens held
- Groups need to track member shares
- Groups need to handle LP token transfers

**Fee Tracking**:
- Groups need to calculate fees earned
- Groups need to track fee distribution
- Groups need to track pot contributions

**Integration**:
- Groups call CellarHook functions
- Groups track state in their own contracts
- CellarHook doesn't need to know about groups

## Backward Compatibility

### Critical Requirements

1. **No Breaking Changes**:
   - All existing CellarHook functions unchanged
   - All existing ABIs unchanged
   - All existing frontend code continues working

2. **Additive Only**:
   - New functions added, not modified
   - New state variables (if needed) don't conflict
   - Existing users unaffected

3. **Proxy Compatibility**:
   - UUPS proxy pattern maintained
   - Upgrade path preserved
   - Storage layout compatible

## Gas Considerations

### Current Operations

- `addLiquidity()`: ~100k-200k gas (estimated)
- `raid()`: ~150k-250k gas (estimated)
- `receive()`: ~21k gas (simple update)

### Group Operations (Estimated)

- Group contribution: ~150k-250k gas (includes tax + LP)
- Fee distribution: ~50k-100k per member (batchable)
- Group raid: ~200k-300k gas (includes distribution)

### Optimization Opportunities

- Batch operations for multiple members
- Efficient storage packing
- Minimal external calls
- Gas-efficient fee calculations

## Security Considerations

### Current Protections

1. **Reentrancy**: `nonReentrant` modifier on `raid()`
2. **Access Control**: `onlyPoolManager` on hook functions
3. **Ownership**: `onlyOwner` for upgrades

### Group Integration Security

1. **Member Verification**: Groups must verify members
2. **Contribution Validation**: Groups must validate contributions
3. **Fee Distribution Accuracy**: Groups must distribute correctly
4. **Pot Contribution Verification**: Groups must contribute correct amounts

## Testing Requirements

### Unit Tests Needed

1. `contributeToPot()` function
2. Group integration with `addLiquidity()`
3. Group integration with `raid()` (if implemented)
4. Fee flow verification
5. Backward compatibility tests

### Integration Tests Needed

1. Group → CellarHook → Pot flow
2. Multiple groups simultaneously
3. Fee distribution accuracy
4. Contribution tax accuracy
5. Pot growth verification

## Deployment Considerations

### CellarHook Upgrade

**If adding `contributeToPot()`**:
- Deploy new implementation
- Upgrade proxy
- Verify function works
- No migration needed (additive)

**If NOT modifying CellarHook**:
- Groups use `receive()` directly
- No upgrade needed
- Simpler deployment

### Recommendation

**Add `contributeToPot()`**:
- More explicit and clear
- Better for documentation
- Easier to track in events
- Minimal gas cost
- Maintains backward compatibility

## Frontend Integration

### Current Frontend Patterns

**Service Layer** (`apps/web/lib/services/theCellarService.ts`):
- Reads potBalance
- Reads auction price
- Handles raids
- Caches data

**Contract Registry** (`apps/web/lib/contracts/registry.ts`):
- Defines contract ABIs
- Provides address resolution
- Handles localhost/mainnet switching

**Integration Points**:
- Groups will need similar service layer
- Groups will need registry entries
- Groups will need UI components
- Groups will display alongside individual positions

## Summary

### Key Integration Points

1. **Adding Liquidity**: Groups call `CellarHook.addLiquidity()` with 1% tax
2. **Fee Distribution**: Groups call `contributeToPot()` with 20% of fees
3. **LP Tracking**: Groups track LP tokens in their contracts
4. **Pot Contribution**: Groups feed potBalance via `contributeToPot()`

### Minimal Changes Required

1. Add `contributeToPot()` to CellarHook (optional but recommended)
2. Groups implement manager contracts
3. Groups integrate with existing CellarHook functions
4. Frontend adds group UI components

### Backward Compatibility

- All existing functionality preserved
- No breaking changes
- Additive only
- Existing users unaffected

---

**Last Updated**: 2025-12-02
**Status**: Analysis complete, ready for implementation
