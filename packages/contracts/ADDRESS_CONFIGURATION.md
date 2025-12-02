# Address Configuration Guide

## Overview

This document explains how different addresses are configured for fee collection and treasury management across the InnKeeper protocol.

## Address Types

### 1. **DEPLOYER_ADDRESS** (Team/Dev Fees)
**Purpose**: Wallet that receives team and developer fees

**Receives:**
- 5% dev fee from TavernKeeper Office payments (when someone takes office)
- Owner tax from group managers (TavernRegulars/TownPosse) - if enabled (configurable 0-10%)

**Environment Variable:**
- `DEPLOYER_ADDRESS` - Used in deployment scripts
- Defaults to the wallet running the deployment script if not set

**Used In:**
- Contract owner initialization (all contracts)
- TavernKeeper dev fee (5% of Office payments)
- Group manager owner tax (if enabled)

---

### 2. **FEE_RECIPIENT_ADDRESS** (Inventory Fees)
**Purpose**: Wallet that receives fees from Inventory contract (loot claiming operations)

**Receives:**
- Protocol fees from loot claiming via `Inventory.claimLootWithFee()`

**Environment Variables:**
- `FEE_RECIPIENT_ADDRESS` - Used in deployment scripts (backend)
- `NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS` - Used in frontend (Next.js)
- Defaults to `DEPLOYER_ADDRESS` if not set

**Used In:**
- Inventory contract initialization
- Frontend fee calculation

---

### 3. **TREASURY_ADDRESS** (Group Treasury)
**Purpose**: Wallet that receives treasury fees from group managers

**Receives:**
- 5% of fees from TavernRegularsManager groups
- 5% of fees from TownPosseManager groups

**Environment Variable:**
- `TREASURY_ADDRESS` - Used in deployment scripts
- Defaults to `DEPLOYER_ADDRESS` if not set

**Used In:**
- TavernRegularsManager initialization
- TownPosseManager initialization

**Note**: This is separate from the CellarHook. Group treasury fees go to a wallet address, not the Cellar contract.

---

### 4. **THE_CELLAR** (CellarHook Contract)
**Purpose**: Contract that receives and manages the Office pot

**Receives:**
- 15% of fees from TavernKeeper Office payments (when someone takes office)
- Fees are stored in the pot for raids

**Configuration:**
- Set automatically when deploying CellarHook
- TavernKeeper treasury is set to CellarHook address via `initializeOfficeV2()`

**Note**: The CellarHook is the "treasury" for TavernKeeper Office fees, but it's a contract (not a wallet) that manages a pot for game mechanics.

---

## Fee Distribution Summary

### TavernKeeper Office Fees (100%)
When someone pays to take the office:
- **80%** → Previous king/miner
- **5%** → `DEPLOYER_ADDRESS` (dev fee)
- **15%** → CellarHook contract (pot for raids)

### Inventory Fees (100%)
When claiming loot:
- **100%** → `FEE_RECIPIENT_ADDRESS`

### Group Manager Fees (100%)
After owner tax (if enabled):
- **75%** → Group members (proportional to LP shares)
- **20%** → CellarHook pot
- **5%** → `TREASURY_ADDRESS`

---

## Environment Variables

### Backend (.env in packages/contracts/)
```env
# Deployer wallet - receives team/dev fees
DEPLOYER_ADDRESS=0x...

# Fee recipient - receives Inventory contract fees
FEE_RECIPIENT_ADDRESS=0x...

# Treasury - receives 5% from group manager fees
TREASURY_ADDRESS=0x...
```

### Frontend (.env in apps/web/)
```env
# Fee recipient - must match FEE_RECIPIENT_ADDRESS
NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS=0x...
```

---

## Deployment Script Behavior

The `deploy_localhost.ts` script uses these variables in order:

1. **DEPLOYER_ADDRESS**: Used for contract owner and team fees
   - Falls back to `deployer.address` (wallet running script)

2. **FEE_RECIPIENT_ADDRESS**: Used for Inventory contract
   - Falls back to `DEPLOYER_ADDRESS`
   - Falls back to `deployer.address`

3. **TREASURY_ADDRESS**: Used for group managers
   - Falls back to `DEPLOYER_ADDRESS`
   - Falls back to `deployer.address`

4. **CellarHook**: Always deployed, address stored and used for TavernKeeper treasury

---

## Recommended Setup

### For Development/Testing
- All addresses can point to the same wallet (deployer)
- Simplifies testing and fee tracking

### For Production
- **DEPLOYER_ADDRESS**: Team multisig wallet (receives dev fees)
- **FEE_RECIPIENT_ADDRESS**: Protocol treasury multisig (receives Inventory fees)
- **TREASURY_ADDRESS**: Protocol treasury multisig (receives group fees) - can be same as FEE_RECIPIENT
- **CellarHook**: Separate contract (automatically configured)

---

## Updating Addresses After Deployment

Some addresses can be updated by contract owners:

1. **Inventory fee recipient**: `Inventory.setFeeRecipient(newAddress)` (owner only)
2. **TavernKeeper treasury**: `TavernKeeper.setTreasury(newAddress)` (owner only)
3. **Group manager treasury**: `TavernRegularsManager.setTreasury(newAddress)` (owner only)
4. **Group manager treasury**: `TownPosseManager.setTreasury(newAddress)` (owner only)

**Note**: Contract owner cannot be changed after deployment (set during initialization).

---

## Quick Reference

| Address Type | Env Var | Default | Receives |
|-------------|---------|---------|----------|
| Deployer/Owner | `DEPLOYER_ADDRESS` | `deployer.address` | 5% dev fee, owner tax |
| Fee Recipient | `FEE_RECIPIENT_ADDRESS` | `DEPLOYER_ADDRESS` | Inventory fees |
| Treasury | `TREASURY_ADDRESS` | `DEPLOYER_ADDRESS` | 5% group fees |
| CellarHook | (deployed) | (n/a) | 15% Office fees |
