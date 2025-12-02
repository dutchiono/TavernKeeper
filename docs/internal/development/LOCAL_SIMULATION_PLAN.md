# Local Simulation & Verification Plan

## The Problem
- **Out of Gas**: Testnet MON is exhausted.
- **Deployment Failures**: Previous scripts failed mid-execution.
- **Risk**: Mainnet deployment is too risky without 100% certainty.

## The Solution: Local Hardhat Network
We don't need a "Monad Local Testnet". We can use **Hardhat Network**, which simulates an Ethereum-compatible blockchain locally. It's fast, free, and we can fork the current state of Monad if needed.

## Phase 1: Local Environment Setup
1.  **Spin up Local Node**: Run `npx hardhat node` to start a local blockchain at `http://127.0.0.1:8545`.
2.  **Configure Frontend**: Point the frontend to use this local network (Chain ID 31337).

## Phase 2: Full Deployment Simulation
1.  **Run Master Script**: Execute `npx hardhat run scripts/deploy_v4_all.ts --network localhost`.
    - This will deploy ALL contracts (UUPS proxies) to your local machine.
    - It costs $0 real money.
    - It verifies the script works from start to finish.

## Phase 3: Automated Testing (The "Thorough Check")
We need to update our test suite to run against these new UUPS contracts.

### 1. Contract Tests (`packages/contracts/test/`)
- **Action**: Create `test/FullSystem.test.ts`.
- **Scope**:
    - Deploy everything.
    - Mint TavernKeeper (check signature pricing).
    - Mint Hero.
    - Take Office (check fee split & potBalance).
    - Raid (check LP burning).
    - Upgrade Contracts (verify UUPS works).

### 2. Frontend E2E Tests (`apps/web/e2e/`)
- **Action**: Update Playwright config to use `localhost:8545`.
- **Scope**:
    - Run `game-flow.spec.ts` against the locally deployed contracts.
    - Verify UI shows correct balances and assets.

## Phase 4: The "Go/No-Go" Decision
Only when **Phase 2 (Script runs)** and **Phase 3 (Tests pass)** are green, do we even *think* about Mainnet.

## Immediate Next Steps
1.  Create `packages/contracts/test/FullSystem.test.ts` to verify the "mess" is truly untangled.
2.  Run this test locally.
