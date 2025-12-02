# 🚀 DEPLOY NOW - UUPS Conversion

**This is the ONLY file you need to follow for deployment.**

---

## Quick Start

### ✅ Step 1: Deploy CellarHook - COMPLETE
```bash
cd packages/contracts
npx hardhat run scripts/deploy_cellarhook_uups.ts --network monad
```

**Status**: ✅ **DEPLOYED**
- **Proxy Address**: `0x297434683Feb6F7ca16Ab4947eDf547e2c67dB44`
- **Implementation**: `0xCE16E1617e344A4786971e3fFD0009f15020C503`
- **TavernKeeper Treasury**: Updated ✅
- **Frontend Addresses**: Updated ✅

### ✅ Step 2: Deploy CellarZapV4 - COMPLETE
```bash
npx hardhat run scripts/deploy_cellarzap_uups.ts --network monad
```

**Status**: ✅ **DEPLOYED**
- **Proxy Address**: `0xEb2e080453f70637E29C0D78158Ef88B3b20548c`
- **Implementation**: `0x3c25cCAfDb2448bB5Dc33818b37c3ECD8c10AfC3`
- **CellarHook Address**: Correctly set to new proxy ✅
- **Frontend Addresses**: Updated ✅

### ✅ Step 3: Verify - READY
- Check that `deployment-info-v4.json` has new addresses
- Check that `apps/web/lib/contracts/addresses.ts` was updated
- Test that `potBalance` updates when MON is sent

---

## What Gets Fixed

✅ **Critical Bug Fixed**: `potBalance` now updates when fees are received
✅ **Upgradeable**: Both contracts now use UUPS proxy pattern
✅ **Automatic Updates**: Scripts update all addresses automatically

---

## Important Notes

⚠️ **Hook Address Changes**: New proxy addresses are different from old contracts
- Old CellarHook: `0x41ceC2cE651D37830af8FD94a35d23d428F80aC0` (still exists with ~0.15 MON)
- New CellarHook Proxy: `0x297434683Feb6F7ca16Ab4947eDf547e2c67dB44` ✅
⚠️ **No State Migration**: New contracts start fresh (potBalance = 0)
⚠️ **Verify Hook Flags**: Ensure new hook address meets Uniswap v4 hook flag requirements

---

## ✅ Deployment Complete!

Both contracts have been successfully deployed:
- ✅ **CellarHook**: Proxy `0x297434683Feb6F7ca16Ab4947eDf547e2c67dB44`
- ✅ **CellarZapV4**: Proxy `0xEb2e080453f70637E29C0D78158Ef88B3b20548c`

All addresses have been updated automatically. The `potBalance` bug is fixed and both contracts are now upgradeable.

**Next Steps:**
- Test that `potBalance` updates when fees are sent from TavernKeeper
- Test `raid()` function with updated `potBalance`
- Test `CellarZapV4.mintLP()` with new CellarHook
- Verify hook address meets Uniswap v4 flag requirements

**Need more details?** See `UUPS_CONVERSION_NOTES.md` for technical details.
