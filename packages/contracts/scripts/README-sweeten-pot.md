# Sweeten Pot Script

Interactive script to manually add MON to the Cellar pot.

## Usage

### Interactive Mode (prompts for amount)
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad
```

### With Amount Flag
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad -- --amount 10.5
```

### With Amount as First Argument
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad -- 10.5
```

### Non-Interactive (skip confirmation)
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad -- --amount 10.5 --yes
```

## Examples

Add 5 MON to pot:
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad -- --amount 5
```

Add 0.1 MON interactively:
```bash
npx hardhat run scripts/sweeten-pot.ts --network monad
# Then enter: 0.1
```

## Requirements

- `PRIVATE_KEY` must be set in root `.env` file
- Deployer wallet must have sufficient MON balance
- TheCellarV3 must be upgraded with `sweetenPot()` function

## What It Does

1. Checks current pot balance
2. Prompts for amount (or uses flag)
3. Validates balance
4. Confirms transaction (unless `--yes` flag)
5. Calls `sweetenPot()` on TheCellarV3
6. Wraps MON to WMON automatically
7. Adds to `potBalanceMON`

