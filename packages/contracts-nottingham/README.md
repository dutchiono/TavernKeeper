# Nottingham — `@innkeeper/contracts-nottingham`

The Sheriff's Office on **Robinhood Chain**. A rethemed, corrected descendant of
TavernKeeper's "The Office" (itself a donut-miner port).

Buy the office in a descending Dutch auction, tax the town, hold it until someone
outbids you. The sitting sheriff is the sole minter of **$NOTT**.

## Contracts

| Contract | Role |
|---|---|
| `SheriffsOffice.sol` | The mechanic: Dutch auction, fee split, emission |
| `NottToken.sol` | $NOTT — ERC20, minted only by the office |

Both are UUPS-upgradeable, matching the `@innkeeper/contracts` house style.

## Theme mapping

| TavernKeeper | Nottingham |
|---|---|
| The Office | The Sheriff's Office |
| King / `miner` | The Sheriff |
| The Message (`uri`) | The Proclamation |
| 20% fee | the levy |
| The Cellar | The Coffers |
| KEEP | NOTT |

Early-modern offices were literally purchased — you bought the sheriffdom and
recouped it by taxing the town until someone outbid you. The Dutch auction *is*
that, so the theme is the accurate name for what the contract already did.

## Economics

| | |
|---|---|
| Epoch | 1 hour, linear decay to floor |
| Floor price | `0.0001 ETH` |
| Price reset | 2× last paid |
| Sale split | 80% deposed sheriff / 15% Coffers / 5% dev |
| Emission | 4 NOTT/sec, halving every 30 days |
| Tail | 0.01 NOTT/sec, perpetual |
| Supply cap | 100M NOTT (backstop; schedule emits ~20.7M + tail) |

## Divergences from the Monad original

Three deliberate changes, marked `FIX-1/2/3` in the source:

**FIX-1 — price denomination.** The Monad contract's `MIN_INIT_PRICE = 1 ether`
meant 1 MON. Robinhood Chain's native currency is ETH, so that same literal would
have put the floor in the thousands of dollars and doubled from there. Re-denominated
to `0.0001 ether`.

**FIX-2 — double-mint on mid-reign claim.** The original computed `takeOffice()`'s
payout from `slot0.startTime` while `claimOfficeRewards()` computed from
`officeLastClaimTime`. A sheriff who claimed mid-reign was paid twice for the claimed
window — claim at t=1800, get deposed at t=3600, and the payout covered 0..3600 on
top of the 0..1800 already drawn. **50% over-mint, repeatable.** Both paths now share
`_accrualStart()`. Covered by a regression test that has been verified to fail
against the original logic (21,600 vs 14,400 NOTT for a one-hour reign).

> This bug is live on the Monad mainnet deployment
> (`0x56B81A60Ae343342685911bd97D1331fF4fa2d29`). Not addressed here.

**FIX-3 — checks-effects-interactions.** The original paid out the fee split and the
deposed sheriff *before* writing `slot0`, leaving pre-takeover state across four
external calls; safe only because of the reentrancy guard. State now advances first.

Also changed: `NottToken.mint()` **clamps** to `MAX_SUPPLY` rather than reverting.
`KeepTokenV2` reverts, which would have bricked `takeOffice()` permanently once the
cap was hit — freezing the office with no way to depose the sitting sheriff.

## Deploy

```bash
pnpm --filter @innkeeper/contracts-nottingham compile
pnpm --filter @innkeeper/contracts-nottingham test

# testnet (46630) is the default; mainnet requires ROBINHOOD_CHAIN_ID=4663
pnpm --filter @innkeeper/contracts-nottingham deploy
```

Env: `PRIVATE_KEY`, `ALCHEMY_API_KEY` (or `ROBINHOOD_RPC_URL`),
`NOTTINGHAM_TREASURY_ADDRESS` (required for mainnet), `ROBINHOOD_CHAIN_ID`.

Deployment wires `NottToken.setSheriffsOffice()` as the final step. Until that
lands nothing can mint.

## Chain

Robinhood Chain is an Arbitrum L2 on Ethereum using blobs for DA.

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 4663 | 46630 |
| Explorer | robinhoodchain.blockscout.com | explorer.testnet.chain.robinhood.com |
| Gas | ETH | ETH |

Unlike the Monad package — where `chains.ts` defaulted to mainnet and
`hardhat.config.ts` defaulted to testnet off the same env var — this package
defaults to **testnet** everywhere. Mainnet must be opted into explicitly.

## Not yet built

Frontend integration. The Monad app's `chains.ts` / `addresses.ts` / `feature-flags.ts`
are single-chain and would need to become per-chain before an app can talk to this.
