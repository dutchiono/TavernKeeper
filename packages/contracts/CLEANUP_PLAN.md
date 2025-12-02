# Contract Cleanup & Untangling Plan

## 1. The "Mess" Identified
The `packages/contracts` directory contains a mix of:
- **Legacy Contracts**: `TheCellar.sol` (standalone), `CellarZap.sol` (V2 router).
- **Modern Contracts**: `hooks/CellarHook.sol` (Uniswap v4 Hook + Game Logic), `CellarZapV4.sol` (V4 Router).
- **Conflicting Documentation**: Multiple checklists and trackers.
- **Duplicate Scripts**: Multiple deployment scripts (`deploy_v4_all.ts`, `deploy_v4_final.ts`, etc.).

## 2. The Cleanup Actions

### A. Archive Legacy Contracts
Move the following files to `packages/contracts/contracts/legacy/`:
- `contracts/TheCellar.sol` (Obsolete, replaced by `CellarHook.sol`)
- `contracts/CellarZap.sol` (Obsolete, replaced by `CellarZapV4.sol`)

### B. Standardize Deployment Scripts
Identify **ONE** master deployment script.
- **Candidate**: `scripts/deploy_v4_all.ts` (seems most comprehensive).
- **Action**: Review `deploy_v4_all.ts` to ensure it deploys the *new* UUPS proxies (`CellarHook`, `CellarZapV4`) and not the old ones. If it's outdated, update it to match `deploy_cellarhook_uups.ts`.
- **Archive**: Move other partial scripts to `scripts/archive/`.

### C. Verify Deployed State
The `DEPLOYMENT_TRACKER.md` lists:
- **CellarHook Proxy**: `0x297434683Feb6F7ca16Ab4947eDf547e2c67dB44`
- **CellarZapV4 Proxy**: `0xEb2e080453f70637E29C0D78158Ef88B3b20548c`

We must verify these match the code in `CellarHook.sol` and `CellarZapV4.sol`.

## 3. Execution Steps

1.  **Create Directories**: `contracts/legacy`, `scripts/archive`.
2.  **Move Files**: Execute the moves.
3.  **Audit `deploy_v4_all.ts`**: Ensure it imports `CellarHook` and `CellarZapV4` and uses the UUPS pattern.
4.  **Update `DEPLOYMENT_TRACKER.md`**: Add a note that `TheCellar` refers to `CellarHook.sol`.

## 4. User Approval
Waiting for user confirmation to proceed with moving files.
