# Monad Network Configuration

This project is configured to use the Monad blockchain network.

## Required Environment Variables

Add these to your `.env` file:

```env
# Monad Network Configuration
NEXT_PUBLIC_MONAD_CHAIN_ID=10143  # Monad testnet chain ID (update when mainnet is available)
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz  # Monad RPC endpoint
NEXT_PUBLIC_MONAD_EXPLORER_URL=https://testnet-explorer.monad.xyz  # Monad block explorer

# ERC-6551 Configuration (Monad Testnet)
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C  # ERC-6551 registry deployed on Monad
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x9B5980110654dcA57a449e2D6BEc36fE54123B0F  # ERC-6551 implementation on Monad

# Contract Addresses (Monad Testnet - UUPS Proxies)
NEXT_PUBLIC_ERC20_TOKEN_ADDRESS=0x96982EC3625145f098DCe06aB34E99E7207b0520  # GoldToken proxy (USE THIS)
NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS=0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC  # Inventory proxy (USE THIS)
NEXT_PUBLIC_ADVENTURER_CONTRACT_ADDRESS=0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2  # Adventurer proxy (USE THIS)
NEXT_PUBLIC_TAVERNKEEPER_CONTRACT_ADDRESS=0x4Fff2Ce5144989246186462337F0eE2C086F913E  # TavernKeeper proxy (USE THIS)

# Pseudoswap Configuration (Monad)
NEXT_PUBLIC_PSEUDOSWAP_ROUTER_ADDRESS=0x...  # Pseudoswap router contract
NEXT_PUBLIC_PSEUDOSWAP_FACTORY_ADDRESS=0x...  # Pseudoswap factory contract

# Protocol Fees
CLAIM_FEE_MULTIPLIER=1.1  # 10% above gas (barely more than gas)
NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS=0xEC4bc7451B9058D42Ea159464C6dA14a322946fD  # Deployer wallet (fees go back to deployer)

# Testnet Wallet (for development/testing only)
# WARNING: Never use this in production. Only for testnet.
TESTNET_PRIVATE_KEY=0x...  # Your testnet wallet private key (without 0x prefix is also fine)
# Note: If NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS is not set, fees will go to the testnet wallet address

# Pricing Signer (for signature-based pricing)
# CRITICAL: This wallet signs prices for TavernKeeper and Adventurer mints
PRICING_SIGNER_PRIVATE_KEY=0x...  # Private key of wallet that signs prices (backend only, never expose)
NEXT_PUBLIC_PRICING_SIGNER_ADDRESS=0x...  # Public address derived from PRICING_SIGNER_PRIVATE_KEY
# Note: The signer address must be set on contracts via setSigner() after deployment/upgrade
```

## Notes

- ✅ All contracts deployed on Monad Testnet as UUPS upgradeable proxies
- ✅ ERC-6551 registry and implementation deployed
- ⚠️ **Always use PROXY addresses** (not implementation addresses) in frontend
- ⚠️ Update chain ID and RPC URLs when Monad mainnet launches
- 📝 See `packages/contracts/TESTNET_SETUP.md` for full deployment details

