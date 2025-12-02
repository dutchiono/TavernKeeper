# Monad Testnet Setup

## ✅ Deployment Complete

All contracts have been successfully deployed to Monad Testnet as UUPS upgradeable proxies.

## Contract Addresses

### Infrastructure Contracts
- **ERC6551Registry**: `0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C`
- **ERC6551Account Implementation**: `0x9B5980110654dcA57a449e2D6BEc36fE54123B0F`

### Game Contracts (UUPS Proxies)
- **KeepToken Proxy**: `0x96982EC3625145f098DCe06aB34E99E7207b0520` ⭐ **USE THIS**
- **KeepToken Implementation**: `0x8788E862023A49a77E8F27277a8b3F07B4E9A7d8`

- **Inventory Proxy**: `0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC` ⭐ **USE THIS**
- **Inventory Implementation**: `0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6`

- **Adventurer Proxy**: `0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2` ⭐ **USE THIS**
- **Adventurer Implementation**: `0xC1D9e381dF88841b16e9d01f35802B0583638e07`

- **TavernKeeper Proxy**: `0x4Fff2Ce5144989246186462337F0eE2C086F913E` ⭐ **USE THIS**
- **TavernKeeper Implementation**: `0xd8c9C56b1ef231207bAd219A488244aD34576F92`

## Deployer Wallet

- **Address**: `0xEC4bc7451B9058D42Ea159464C6dA14a322946fD`
- **Fee Recipient**: Same as deployer (fees go back to deployer)
- **Balance**: ~11 MON remaining (after deployment and wallet funding)

## Test Wallets

10 test wallets have been generated and funded with 1 MON each:

1. `0xfAb9905E2238f1eDADB1a7F94C417555C43dA460`
2. `0x56A0C1061812CDA3a3e22EE42b974d0D4ECAD55F`
3. `0x373BC31d3b27061F86C530908307f238f09e7023`
4. `0xb60fDCA53aba16CF148FDA5c2F20E6538944d024`
5. `0x5CEa37b7b5C1A4A1321c5fa1138D46A333EF648b`
6. `0x67b10d3b2BB6cc64cb674cF4acCdfFCAfE9C4541`
7. `0x1a19C1C7447d761B9B291c7d49f0965de9CA8204`
8. `0x3509a95e78eBa980C247F5A05B787dC2ba70Ba61`
9. `0x8f461F731dfc965e2214c7D6700e9B5E24dE35c8`
10. `0xC8D9cA8Bc169875760848c5268a0fE006077A3dD`

**Wallet Management**:
- Private keys stored in `packages/contracts/wallets/testnet-keys.json` (gitignored)
- Wallet addresses in `packages/contracts/wallets/testnet-wallets.json`
- All wallets funded with 1 MON each for testing

## Testing

### Run Testnet Tests

```bash
cd packages/contracts
npx hardhat test test/testnet.test.ts --network monad
```

**Test Results**: ✅ All 12 tests passing

### Test Coverage

- ✅ Contract verification (name, symbol, initialization)
- ✅ KeepToken operations (mint via TavernKeeper)
- ✅ Inventory operations (mint items, fee collection)
- ✅ NFT operations (mint Adventurer, mint TavernKeeper)
- ✅ ERC-6551 TBA operations (create TBA for NFTs)

### Run Workflow Test

```bash
cd packages/contracts
npx hardhat run scripts/testnetWorkflow.ts --network monad
```

This tests the complete game workflow:
1. Mint NFTs
2. Create TBAs
3. Mint items to TBAs
4. Transfer items with fee collection
5. Mint KeepToken

## Fee Collection

- **Fee Recipient**: Deployer wallet (`0xEC4bc7451B9058D42Ea159464C6dA14a322946fD`)
- **Fee Collection**: Built into `Inventory.claimLootWithFee()` function
- **Fee Flow**: Fees are sent directly to deployer wallet (no double transactions)
- **Gas Efficiency**: Fees are collected in the same transaction as the item transfer

## Important Notes

1. **Always use PROXY addresses** in your frontend/API, not implementation addresses
2. **Fees go back to deployer** - this ensures we don't lose testnet MON
3. **KeepToken operations are cheap** - designed to work with minimal MON balance
4. **Test wallets have 1 MON each** - enough for extensive testing
5. **All contracts are UUPS upgradeable** - can be upgraded in the future

## Next Steps

1. Update frontend `.env` files with proxy addresses
2. Update `MONAD_CONFIG.md` with deployed addresses
3. Test full game workflow on testnet
4. Monitor fee collection and gas usage


