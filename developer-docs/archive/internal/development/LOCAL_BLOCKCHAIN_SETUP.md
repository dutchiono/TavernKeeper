# Local Blockchain Setup Guide

## 🚀 Quick Start: Connect MetaMask to Local Hardhat Node

### Prerequisites
1. **Hardhat node running** on `http://127.0.0.1:8545`
2. **MetaMask extension** installed in your browser
3. **Next.js app** running on `http://localhost:3000`

---

## 📝 Step-by-Step Setup

### 1. Start Hardhat Local Node

From the `packages/contracts` directory:

```powershell
# Start Hardhat node (forks Monad testnet)
npx hardhat node
```

This will:
- Start a local blockchain on `http://127.0.0.1:8545`
- **Fork Monad testnet** (so you have real contract data from Monad)
- Provide 20 test accounts with pre-funded ETH
- Display account addresses and private keys

**🔍 How Monad Forking Works:**
- Your Hardhat node **forks** (copies state from) Monad testnet
- This means you get all Monad contracts, balances, and state locally
- The network appears as "Hardhat Localhost" in MetaMask (Chain ID 31337)
- But all the contract data comes from Monad testnet
- You can interact with Monad contracts locally without hitting rate limits!

**Keep this terminal open!**

---

### 2. Add Localhost Network to MetaMask

#### Option A: Automatic (Recommended)
1. Open MetaMask extension
2. Click the network dropdown (top center)
3. Scroll down and click **"Add Network"**
4. Click **"Add a network manually"**
5. Fill in these details:

```
Network Name: Hardhat Localhost
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
Block Explorer URL: (leave empty)
```

6. Click **"Save"**

**⚠️ About MetaMask Warnings:**
- MetaMask may show warnings about "GoChain Testnet" and "GO" token
- This is because Chain ID `31337` is also used by GoChain Testnet in some registries
- **These warnings are safe to ignore** - you're connecting to your local Hardhat node, not GoChain
- The network name "Hardhat Localhost" and symbol "ETH" are correct for local development
- Click "Approve" or "Save" despite the warnings

#### Option B: Quick Add via Chainlist
1. Visit [Chainlist.org](https://chainlist.org)
2. Enable "Testnets" toggle
3. Search for "Localhost"
4. Click "Add to MetaMask"

---

### 3. Import Test Account to MetaMask

When Hardhat node starts, it shows accounts like:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**To import:**
1. Click MetaMask icon → **Account menu** (top right)
2. Click **"Import Account"**
3. Select **"Private Key"**
4. Paste the private key (e.g., `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
5. Click **"Import"**

**⚠️ Security Warning:** These are test accounts with fake ETH. Never use these private keys for real accounts or commit them to git!

---

### 4. Switch to Localhost Network

1. Open MetaMask
2. Click network dropdown
3. Select **"Hardhat Localhost"** (or whatever you named it)
4. You should see your imported account with 10,000 ETH

---

### 5. Start Your Next.js App

From the project root:

```powershell
pnpm dev
```

This will:
- Start Next.js on `http://localhost:3000`
- Start workers in watch mode
- Enable localhost chain support in wagmi

---

### 6. Connect Wallet in Browser

1. Open `http://localhost:3000` in your browser
2. Click **"Connect Wallet"** button
3. Select **MetaMask**
4. Approve the connection in MetaMask popup
5. You should now be connected to localhost!

---

## 🔧 Troubleshooting

### Issue: "pnpm is not recognized" when starting workers

**Fixed!** The dev script now uses `tsx` directly instead of `pnpm exec tsx`.

If you still see this error:
1. Make sure you're running `pnpm dev` from the project root
2. Or manually start workers: `cd apps/web && tsx workers/index.ts`

---

### Issue: MetaMask can't connect to localhost

**Solutions:**
1. **Check Hardhat node is running:**
   ```powershell
   # Should show "Started HTTP and WebSocket JSON-RPC server"
   ```

2. **Verify RPC URL in MetaMask:**
   - Network settings → RPC URL should be `http://127.0.0.1:8545`
   - NOT `http://localhost:8545` (use 127.0.0.1)

3. **Check firewall:** Windows Firewall might block localhost connections

4. **Try different browser:** Some browsers have stricter security

---

### Issue: "Unsupported chain" error

**Solution:** The app now automatically includes localhost chain in development mode. If you still see this:

1. Check `apps/web/components/providers/Web3Provider.tsx`
2. Make sure `localhost` is imported from `viem/chains`
3. Restart Next.js dev server

---

### Issue: Transactions fail or revert

**Common causes:**
1. **Not enough gas:** Hardhat accounts have unlimited ETH, but check gas limit
2. **Contract not deployed:** Deploy contracts to localhost first
3. **Wrong network:** Make sure MetaMask is on "Hardhat Localhost" (Chain ID 31337)

---

### Issue: MetaMask shows "GoChain Testnet" or "GO" warnings

**What's happening:**
- Chain ID `31337` is Hardhat's default localhost ID
- It's also used by GoChain Testnet in some blockchain registries
- MetaMask sees this Chain ID and suggests "GoChain Testnet" / "GO" token
- **This is just a warning - you're NOT connecting to GoChain**

**Solution:**
- ✅ Ignore the warnings - they're informational only
- ✅ Use "Hardhat Localhost" as network name
- ✅ Use "ETH" as currency symbol (standard for EVM chains)
- ✅ Click "Save" or "Approve" despite warnings
- Your local node is correct and will work fine

**About "GO":**
- "GO" is GoChain's native token symbol
- It's unrelated to your setup - just MetaMask's registry matching
- You're using ETH (or MON if you prefer) for your local chain

---

## 🎯 Development Workflow

### Typical Development Session:

1. **Terminal 1:** Start Hardhat node
   ```powershell
   cd packages/contracts
   npx hardhat node
   ```

2. **Terminal 2:** Deploy contracts (if needed)
   ```powershell
   cd packages/contracts
   npx hardhat run scripts/deploy.ts --network localhost
   ```

3. **Terminal 3:** Start Next.js app
   ```powershell
   pnpm dev
   ```

4. **Browser:**
   - Open `http://localhost:3000`
   - Connect MetaMask
   - Switch to Hardhat Localhost network
   - Start testing!

---

## 📋 Environment Variables

Make sure your `.env` file has:

```env
# For local development
NODE_ENV=development

# Hardhat localhost (default)
# No need to set - wagmi uses http://127.0.0.1:8545 automatically

# For Monad testnet (when not using localhost)
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

---

## 🔗 Useful Links

- [Hardhat Network Documentation](https://hardhat.org/hardhat-network/docs)
- [MetaMask Custom Networks Guide](https://support.metamask.io/hc/en-us/articles/360043227612)
- [Viem Localhost Chain](https://viem.sh/docs/chains/localhost)

---

## ✅ Verification Checklist

- [ ] Hardhat node running on port 8545
- [ ] MetaMask has "Hardhat Localhost" network added
- [ ] Test account imported to MetaMask
- [ ] MetaMask switched to localhost network
- [ ] Next.js app running on port 3000
- [ ] Wallet connected in browser
- [ ] Can see account balance in app
- [ ] Can send test transactions

---

## 🎉 You're Ready!

Your local development environment is now set up. You can:
- Test smart contract interactions
- Debug transactions locally
- Use test ETH without spending real money
- Develop without hitting rate limits

**Happy coding!** 🚀
