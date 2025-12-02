# Deployment Plan: Bar Regulars & Town Posse Integration

## Overview

This document outlines the deployment strategy for integrating Bar Regulars and Town Posse group LP management contracts into the InnKeeper system. The deployment follows a phased approach: localhost testing first, then mainnet deployment.

## Deployment Phases

### Phase 1: Localhost Deployment & Testing
- Deploy `BarRegularsManager` and `TownPosseManager` contracts
- Test group creation, contributions, fee distribution
- Verify integration with `CellarHook`
- Test pot contribution flows (1% tax, 20% fee split)

### Phase 2: Mainnet Deployment
- Deploy to Monad mainnet
- Verify contract addresses
- Update frontend configuration
- Test on mainnet

## Prerequisites

### Contract Dependencies

Before deploying Bar Regulars and Town Posse contracts, ensure these contracts are deployed:
- `CellarHook` (UUPS proxy)
- `CellarZapV4` (UUPS proxy)
- `PoolManager` (Uniswap V4)
- `KeepToken` (MON/KEEP currencies)

### Required Updates to Existing Contracts

#### CellarHook Updates

Add `contributeToPot()` function to `CellarHook`:

```solidity
function contributeToPot() external payable {
    potBalance += msg.value;
    emit PotContributed(msg.sender, msg.value);
}
```

**Note**: This maintains backward compatibility - existing fee flows via `receive()` continue to work.

## Deployment Script Structure

### New Deployment Scripts

#### `deploy_bar_regulars_localhost.ts`

Deploys `BarRegularsManager` as a UUPS proxy:

```typescript
async function main() {
    const [deployer] = await ethers.getSigners();

    // 1. Get existing contract addresses
    const cellarHook = await getContractAddress('THE_CELLAR');
    const cellarZap = await getContractAddress('CELLAR_ZAP');
    const poolManager = await getContractAddress('POOL_MANAGER');

    // 2. Deploy implementation
    const BarRegularsManagerImpl = await ethers.getContractFactory('BarRegularsManager');
    const impl = await BarRegularsManagerImpl.deploy();
    await impl.waitForDeployment();

    // 3. Deploy proxy
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');
    const initData = impl.interface.encodeFunctionData('initialize', [
        cellarHook,
        cellarZap,
        poolManager,
        MON_CURRENCY_ADDRESS,
        KEEP_CURRENCY_ADDRESS,
        deployer.address
    ]);
    const proxy = await ERC1967Proxy.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    // 4. Update frontend
    await updateFrontendAddresses({
        BAR_REGULARS_MANAGER: await proxy.getAddress()
    });

    // 5. Update tracker
    await updateDeploymentTracker({
        BAR_REGULARS_MANAGER: await proxy.getAddress(),
        BAR_REGULARS_MANAGER_IMPL: await impl.getAddress()
    });
}
```

#### `deploy_town_posse_localhost.ts`

Similar structure, with tier thresholds:

```typescript
const initData = impl.interface.encodeFunctionData('initialize', [
    cellarHook,
    cellarZap,
    poolManager,
    MON_CURRENCY_ADDRESS,
    KEEP_CURRENCY_ADDRESS,
    BRONZE_THRESHOLD,  // e.g., 1000 MON
    SILVER_THRESHOLD,  // e.g., 10000 MON
    GOLD_THRESHOLD,    // e.g., 100000 MON
    deployer.address
]);
```

### Integration into Existing Deployment Script

#### Update `deploy_localhost.ts`

Add Bar Regulars and Town Posse deployment steps:

```typescript
// After CellarHook deployment (around line 165)

// 13. Deploy Bar Regulars Manager
console.log("\n--- Deploying Bar Regulars Manager ---");
const BarRegularsManagerImpl = await ethers.getContractFactory('BarRegularsManager');
const barRegularsImpl = await BarRegularsManagerImpl.deploy();
await barRegularsImpl.waitForDeployment();
const barRegularsImplAddress = await barRegularsImpl.getAddress();

const barRegularsInitData = barRegularsImpl.interface.encodeFunctionData('initialize', [
    hookAddress,
    zapAddress,
    poolManagerAddress,
    MON_CURRENCY,
    KEEP_CURRENCY,
    deployer.address
]);

const barRegularsProxy = await ERC1967ProxyFactory.deploy(
    barRegularsImplAddress,
    barRegularsInitData
);
await barRegularsProxy.waitForDeployment();
const barRegularsAddress = await barRegularsProxy.getAddress();
console.log("Bar Regulars Manager:", barRegularsAddress);

// 14. Deploy Town Posse Manager
console.log("\n--- Deploying Town Posse Manager ---");
const TownPosseManagerImpl = await ethers.getContractFactory('TownPosseManager');
const townPosseImpl = await TownPosseManagerImpl.deploy();
await townPosseImpl.waitForDeployment();
const townPosseImplAddress = await townPosseImpl.getAddress();

const townPosseInitData = townPosseImpl.interface.encodeFunctionData('initialize', [
    hookAddress,
    zapAddress,
    poolManagerAddress,
    MON_CURRENCY,
    KEEP_CURRENCY,
    BRONZE_THRESHOLD,
    SILVER_THRESHOLD,
    GOLD_THRESHOLD,
    deployer.address
]);

const townPosseProxy = await ERC1967ProxyFactory.deploy(
    townPosseImplAddress,
    townPosseInitData
);
await townPosseProxy.waitForDeployment();
const townPosseAddress = await townPosseProxy.getAddress();
console.log("Town Posse Manager:", townPosseAddress);

// Update frontend addresses
await updateFrontendAddresses({
    // ... existing addresses ...
    BAR_REGULARS_MANAGER: barRegularsAddress,
    TOWN_POSSE_MANAGER: townPosseAddress
});

await updateDeploymentTracker({
    // ... existing addresses ...
    BAR_REGULARS_MANAGER: barRegularsAddress,
    BAR_REGULARS_MANAGER_IMPL: barRegularsImplAddress,
    TOWN_POSSE_MANAGER: townPosseAddress,
    TOWN_POSSE_MANAGER_IMPL: townPosseImplAddress
});
```

## Frontend Integration Updates

### Update `updateFrontend.ts`

Add new contract keys:

```typescript
export function updateFrontendAddresses(addresses: {
    // ... existing keys ...
    BAR_REGULARS_MANAGER?: string;
    TOWN_POSSE_MANAGER?: string;
}) {
    // ... existing code ...
    replaceLocalhostAddr('BAR_REGULARS_MANAGER', addresses.BAR_REGULARS_MANAGER);
    replaceLocalhostAddr('TOWN_POSSE_MANAGER', addresses.TOWN_POSSE_MANAGER);
}
```

### Update `addresses.ts`

Add to `LOCALHOST_ADDRESSES`:

```typescript
export const LOCALHOST_ADDRESSES = {
    // ... existing addresses ...
    BAR_REGULARS_MANAGER: '0x0000000000000000000000000000000000000000', // Updated by deploy script
    TOWN_POSSE_MANAGER: '0x0000000000000000000000000000000000000000', // Updated by deploy script
};
```

Add to `MONAD_ADDRESSES` (for mainnet):

```typescript
export const MONAD_ADDRESSES = {
    // ... existing addresses ...
    BAR_REGULARS_MANAGER: '0x0000000000000000000000000000000000000000', // Set after mainnet deploy
    TOWN_POSSE_MANAGER: '0x0000000000000000000000000000000000000000', // Set after mainnet deploy
};
```

### Update `registry.ts`

Add contract configurations:

```typescript
export const CONTRACTS = {
    // ... existing contracts ...
    BAR_REGULARS_MANAGER: {
        abi: BarRegularsManagerABI,
        getAddress: () => getContractAddress('BAR_REGULARS_MANAGER'),
    },
    TOWN_POSSE_MANAGER: {
        abi: TownPosseManagerABI,
        getAddress: () => getContractAddress('TOWN_POSSE_MANAGER'),
    },
};
```

## Initialization Parameters

### BarRegularsManager

```typescript
{
    cellarHook: string,      // CellarHook proxy address
    cellarZap: string,       // CellarZapV4 proxy address
    poolManager: string,     // Uniswap V4 PoolManager address
    mon: Currency,           // MON currency address
    keep: Currency,          // KEEP currency address
    owner: string            // Owner address (for upgrades)
}
```

### TownPosseManager

```typescript
{
    cellarHook: string,      // CellarHook proxy address
    cellarZap: string,       // CellarZapV4 proxy address
    poolManager: string,     // Uniswap V4 PoolManager address
    mon: Currency,           // MON currency address
    keep: Currency,          // KEEP currency address
    bronzeThreshold: uint256, // e.g., 1000 MON
    silverThreshold: uint256, // e.g., 10000 MON
    goldThreshold: uint256,   // e.g., 100000 MON
    owner: string            // Owner address (for upgrades)
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] Verify `CellarHook` has `contributeToPot()` function
- [ ] Compile contracts (`npx hardhat compile`)
- [ ] Run unit tests (`npx hardhat test`)
- [ ] Review gas estimates
- [ ] Verify initialization parameters

### Localhost Deployment

- [ ] Start local Hardhat node (`npx hardhat node`)
- [ ] Deploy all contracts (`npx hardhat run scripts/deploy_localhost.ts`)
- [ ] Verify frontend addresses updated (`apps/web/lib/contracts/addresses.ts`)
- [ ] Verify deployment tracker updated (`DEPLOYMENT_TRACKER.md`)
- [ ] Test group creation
- [ ] Test contributions (verify 1% tax)
- [ ] Test fee distribution (verify 80/20 split)
- [ ] Test pot contributions
- [ ] Test withdrawals
- [ ] Test multiple groups simultaneously
- [ ] Test governance (Town Posse only)

### Mainnet Deployment

#### Bar Regulars First

- [ ] Deploy `BarRegularsManager` implementation
- [ ] Deploy `BarRegularsManager` proxy
- [ ] Verify proxy initialization
- [ ] Update `MONAD_ADDRESSES` in `addresses.ts`
- [ ] Update `DEPLOYMENT_TRACKER.md`
- [ ] Test on mainnet: create group, contribute, verify tax
- [ ] Monitor for 24 hours

#### Town Posse Second

- [ ] Deploy `TownPosseManager` implementation
- [ ] Deploy `TownPosseManager` proxy
- [ ] Verify proxy initialization
- [ ] Update `MONAD_ADDRESSES` in `addresses.ts`
- [ ] Update `DEPLOYMENT_TRACKER.md`
- [ ] Test on mainnet: create posse, test governance
- [ ] Monitor for 24 hours

## Testing Sequence

### Localhost Testing

1. **Group Creation**
   ```typescript
   // Bar Regulars
   await barRegularsManager.createBarRegularsGroup("Test Group");

   // Town Posse
   await townPosseManager.createTownPosse("Test Posse", 50, true, 1000);
   ```

2. **Contributions**
   ```typescript
   // Verify 1% tax goes to pot
   const potBefore = await cellarHook.potBalance();
   await barRegularsManager.contributeToBarRegularsGroup(groupId, amountMON, amountKEEP);
   const potAfter = await cellarHook.potBalance();
   assert(potAfter - potBefore == amountMON * 0.01);
   ```

3. **Fee Distribution**
   ```typescript
   // Simulate fees earned
   // Distribute fees
   await barRegularsManager.distributeGroupFees(groupId);

   // Verify 80% to members, 20% to pot
   const potIncrease = potAfter - potBefore;
   assert(potIncrease == totalFees * 0.20);
   ```

4. **Integration Tests**
   - Multiple groups contributing simultaneously
   - Withdrawals affecting shares correctly
   - Governance proposals and voting (Town Posse)
   - Tier updates (Town Posse)

### Mainnet Verification

1. **Contract Verification**
   - Verify implementation contracts on block explorer
   - Verify proxy contracts
   - Verify initialization parameters

2. **Functional Tests**
   - Create test groups
   - Make small contributions
   - Verify tax and fee flows
   - Test withdrawals

3. **Monitoring**
   - Monitor contract events
   - Track pot contributions
   - Monitor gas usage
   - Check for errors/reverts

## Rollback Plan

### If Issues Detected

1. **Pause Contracts** (if pause functionality added)
   ```solidity
   // Add pause functionality if needed
   function pause() external onlyOwner {
       _pause();
   }
   ```

2. **Disable New Groups**
   - Owner can set max groups to 0
   - Prevents new group creation
   - Existing groups continue to function

3. **Upgrade Contracts**
   - Deploy new implementation
   - Upgrade proxy to new implementation
   - Fix issues in new version

## Gas Estimates

### BarRegularsManager

- `createBarRegularsGroup()`: ~150,000 gas
- `joinBarRegularsGroup()`: ~100,000 gas
- `contributeToBarRegularsGroup()`: ~200,000 gas (includes LP add)
- `withdrawFromBarRegularsGroup()`: ~180,000 gas (includes LP remove)
- `distributeGroupFees()`: ~150,000 gas (per member)

### TownPosseManager

- `createTownPosse()`: ~200,000 gas
- `requestJoinTownPosse()`: ~100,000 gas
- `contributeToTownPosse()`: ~200,000 gas
- `createTownPosseProposal()`: ~120,000 gas
- `voteOnTownPosseProposal()`: ~80,000 gas
- `executeTownPosseProposal()`: ~150,000 gas (varies by proposal)
- `distributeTownPosseFees()`: ~150,000 gas (per member)

## Security Considerations

### Deployment Security

- Use multi-sig wallet for owner (mainnet)
- Verify all initialization parameters
- Test on testnet first (if available)
- Use timelock for upgrades (optional)

### Post-Deployment Security

- Monitor contract events
- Set up alerts for unusual activity
- Regular security audits
- Keep upgrade keys secure

## Deployment Scripts Location

```
packages/contracts/scripts/
├── deploy_localhost.ts          (updated)
├── deploy_bar_regulars_localhost.ts  (new, optional standalone)
├── deploy_town_posse_localhost.ts    (new, optional standalone)
├── deploy_bar_regulars_mainnet.ts    (new)
├── deploy_town_posse_mainnet.ts      (new)
├── updateFrontend.ts            (updated)
└── updateDeploymentTracker.ts   (updated)
```

## Documentation Updates

After deployment, update:

- `DEPLOYMENT_TRACKER.md` - Contract addresses
- `README.md` - New contract documentation
- Frontend documentation - New UI components
- User guides - How to use Bar Regulars/Town Posse

## Timeline Estimate

- **Localhost Deployment**: 1-2 hours
- **Localhost Testing**: 4-8 hours
- **Mainnet Deployment (Bar Regulars)**: 1 hour
- **Mainnet Testing (Bar Regulars)**: 2-4 hours
- **Mainnet Deployment (Town Posse)**: 1 hour
- **Mainnet Testing (Town Posse)**: 2-4 hours

**Total**: ~12-20 hours

---

**Last Updated**: 2025-12-02
**Status**: Ready for implementation
