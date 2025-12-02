# Localhost Deployment & Testing Guide

Complete guide for deploying and testing on localhost, with easy switching back to Monad testnet.

---

## 🎯 Quick Start

### 1. Start Hardhat Node

```powershell
cd packages/contracts
npx hardhat node
```

**Keep this terminal open!**

### 2. Fund Your Deployer Wallet

```powershell
# In a new terminal
cd packages/contracts
npx hardhat run scripts/fundDeployer.ts --network localhost
```

This sends 100 ETH from Hardhat Account #0 to your deployer wallet.

### 3. Deploy All Contracts

```powershell
npx hardhat run scripts/deploy_localhost.ts --network localhost
```

This will:
- Deploy all contracts to localhost
- Configure contract relationships
- **Automatically update LOCALHOST_ADDRESSES in addresses.ts**

### 4. Enable Localhost Mode

```env
# In apps/web/.env
USE_LOCALHOST=true
```

### 5. Start Frontend

```powershell
# From project root
pnpm dev
```

The frontend will automatically use localhost addresses when `USE_LOCALHOST=true`.

---

## 🔄 Switching Between Networks

### For Localhost:
```env
# In apps/web/.env
USE_LOCALHOST=true
```

### For Monad Testnet:
```env
# In apps/web/.env
USE_LOCALHOST=false
# Or just remove/comment out USE_LOCALHOST
```

**Restart Next.js** after changing environment variables.

---

## 📋 How It Works

The `addresses.ts` file has two sections:
- `MONAD_ADDRESSES` - Monad testnet addresses (original)
- `LOCALHOST_ADDRESSES` - Localhost addresses (populated by deployment)

`CONTRACT_ADDRESSES` switches between them based on `USE_LOCALHOST`:
- `USE_LOCALHOST=true` → Uses `LOCALHOST_ADDRESSES`
- `USE_LOCALHOST=false` → Uses `MONAD_ADDRESSES`

The deployment script automatically updates `LOCALHOST_ADDRESSES` when you deploy.

---

## 🧪 Testing Workflow

### Typical Testing Session:

1. **Start Hardhat Node**
   ```powershell
   cd packages/contracts
   npx hardhat node
   ```

2. **Deploy Contracts** (first time only, or after resetting node)
   ```powershell
   npx hardhat run scripts/fundDeployer.ts --network localhost
   npx hardhat run scripts/deploy_localhost.ts --network localhost
   ```

3. **Enable Localhost**
   ```env
   USE_LOCALHOST=true
   ```

4. **Start Frontend**
   ```powershell
   pnpm dev
   ```

5. **Test in Browser**
   - Open `http://localhost:3000`
   - Connect MetaMask (Hardhat Localhost network)
   - Test all features!

---

## 🔙 Switching Back to Monad Testnet

### Quick Switch:

1. **Update `.env`:**
   ```env
   USE_LOCALHOST=false
   ```

2. **Restart Next.js:**
   ```powershell
   # Stop current server (Ctrl+C)
   pnpm dev
   ```

3. **Switch MetaMask to Monad Testnet**

That's it! The frontend will now use Monad testnet addresses.

---

## 📝 Contract Addresses

After deployment, addresses are automatically saved to:
- `apps/web/lib/contracts/addresses.ts` → `LOCALHOST_ADDRESSES` section
- `packages/contracts/deployment-info-v4.json` (deployment tracker)

**Note:** The deployment script updates `LOCALHOST_ADDRESSES` automatically. You don't need to manually edit them.

---

## 🐛 Troubleshooting

### Issue: Frontend still using Monad addresses

**Solution:**
1. Check `USE_LOCALHOST=true` is set in `.env`
2. Restart Next.js dev server
3. Clear browser cache
4. Check `LOCALHOST_ADDRESSES` in `addresses.ts` was updated

### Issue: Contracts not found on localhost

**Solution:**
1. Verify Hardhat node is running
2. Check you ran `deploy_localhost.ts` successfully
3. Verify addresses in deployment output match `LOCALHOST_ADDRESSES`
4. Make sure MetaMask is on Hardhat Localhost network (Chain ID 31337)

### Issue: Transactions failing

**Common causes:**
1. **Wrong network:** MetaMask must be on Hardhat Localhost
2. **No funds:** Import a test account with ETH
3. **Contract not deployed:** Re-run `deploy_localhost.ts`
4. **USE_LOCALHOST not set:** Check `.env` file

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Test all features on localhost
- [ ] Test on Monad testnet
- [ ] Verify contract addresses are correct
- [ ] Set `USE_LOCALHOST=false` for production
- [ ] Verify environment variables are set correctly
- [ ] Test end-to-end user flows

---

## 🎉 You're Ready!

Your localhost deployment is complete. You can now:
- Test all contract interactions locally
- Debug transactions without spending real gas
- Develop features quickly
- Switch back to Monad testnet anytime

**Happy testing!** 🚀
