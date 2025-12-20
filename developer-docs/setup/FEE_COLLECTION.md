# Fee Collection System

## Overview

The protocol collects fees from loot claiming operations. Fees are integrated directly into the Inventory contract - no separate contracts or complex flows needed.

## Configuration

### Fee Recipient Address

Set the treasury wallet address when deploying the Inventory contract:

```env
FEE_RECIPIENT_ADDRESS=0x...  # Treasury wallet that collects protocol fees
```

The fee recipient is set in the Inventory contract constructor and can be updated by the owner via `setFeeRecipient()`.

**For Production:**
- **MUST** set `FEE_RECIPIENT_ADDRESS` to your treasury wallet when deploying
- This should be a multisig wallet or secure treasury address
- Never use a single private key wallet for production fee collection

## Fee Structure

### Protocol Fee

- **Multiplier**: `CLAIM_FEE_MULTIPLIER` (default: 1.1 = 10% above gas)
- **Calculation**: `protocolFee = baseGasCost * (feeMultiplier - 1)`
- **Purpose**: Small fee above gas costs to support protocol operations

### Fee Collection Mechanism

**Integrated in Inventory Contract:**
1. User calls `Inventory.safeBatchTransferFrom()` with protocol fee as `value`
2. Inventory contract automatically forwards fee to treasury wallet
3. Inventory contract then executes the item transfer
4. **Single transaction** - clean and simple!

The Inventory contract's `safeBatchTransferFrom()` function is `payable` and automatically collects any ETH sent with the transaction, forwarding it to the fee recipient.

## Current Configuration

- **Network**: Monad Testnet (Chain ID: 10143)
- **Fee Recipient**: Configured via `NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS` or testnet wallet fallback
- **Fee Multiplier**: 1.1 (10% above gas)

## Security Considerations

1. **Treasury Wallet**: Use a multisig or secure wallet for fee collection
2. **Fee Recipient**: Must be set before production deployment
3. **Monitoring**: Monitor fee collection to ensure fees are being received
4. **Upgradeability**: Fee recipient can be updated by changing the env var (requires redeployment)

## Future Enhancements

- On-chain fee recipient configuration (via contract)
- Fee splitting (multiple recipients)
- Fee collection analytics
- Automatic fee distribution

