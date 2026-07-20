# Nottingham — `@innkeeper/contracts-nottingham`

The Sheriff's Office on **Robinhood Chain**. A rethemed, corrected, re-tuned descendant
of TavernKeeper's "The Office" (itself a donut-miner port).

Buy the office in a descending Dutch auction, tax the town, hold it until someone
outbids you. The sitting sheriff is the sole minter of **$NOTT**.

## Contracts

| Contract | Role |
|---|---|
| `SheriffsOffice.sol` | The mechanic: Dutch auction, fee split, emission |
| `NottToken.sol` | $NOTT — ERC20, minted only by the office |

Both UUPS-upgradeable, matching the `@innkeeper/contracts` house style.

## Theme mapping

| TavernKeeper | Nottingham |
|---|---|
| The Office | The Sheriff's Office |
| King / `miner` | The Sheriff |
| The Message (`uri`) | The Proclamation |
| 20% fee | the levy |
| The Cellar | The Coffers |
| KEEP | NOTT |

Early-modern offices were literally purchased — you bought the sheriffdom and recouped
it by taxing the town until someone outbid you. The Dutch auction *is* that, so the
theme is the accurate name for what the contract already did.

## Economics

| | |
|---|---|
| Epoch | 1 hour, linear price decay to floor |
| Floor price | `0.0001 ETH` |
| Price reset | 2× last paid |
| Sale split | **70% deposed sheriff / 25% Coffers / 5% dev** |
| Base emission | **0.5 NOTT/sec, halving every 365 days** |
| Within-reign decay | **100% → 50% → 25% → 12.5% → 10% floor, per epoch held** |
| Tail | 0.01 NOTT/sec |
| Supply cap | 100M NOTT (backstop; fully-contested schedule tops out ~31.5M) |

### Emission is activity-gated, not time-gated

The single most important property. Accrual halves for each epoch a sheriff holds
**uncontested**, resting at 10% of base rate. A contested office emits on schedule;
a dead one barely emits at all.

| Held uncontested | Emitted | Flat (old model) | Ratio |
|---|---|---|---|
| 1 day | 6,975 | 43,200 | 6.2× |
| 7 days | 32,895 | 302,400 | 9.2× |
| 30 days | 132,255 | 1,296,000 | 9.8× |

> 30 days of **hourly turnover**: 1,296,000 NOTT
> 30 days **squatted by one address**: 132,255 NOTT

Ten times more supply flows to an actively contested office than to a squatted one.
Quiet markets stop diluting holders, and the incentive points at turnover — which is
what actually generates the fees that fund liquidity.

Decay is measured from **reign start**, not last claim, so claiming every epoch cannot
reset the curve back to full rate. There is a test for exactly that.

### Supply schedule (base rate, fully contested)

| Year | Rate | Emits | Cumulative |
|---|---|---|---|
| 1 | 0.50/s | 15,768,000 | 50% |
| 2 | 0.25/s | 7,884,000 | 75% |
| 3 | 0.125/s | 3,942,000 | 87% |
| 4 | 0.0625/s | 1,971,000 | 93% |

Month one is **5.9%** of the four-year total. Under the schedule this replaces it was
**47.8%** — half of all supply inside thirty days, held by whoever happened to win the
launch window, with nothing to do but sell into the pool.

## Divergences from the Monad original

Five deliberate changes, marked `FIX-1..5` in the source. Two are bug fixes.

**FIX-1 — price denomination.** `MIN_INIT_PRICE = 1 ether` meant 1 MON. Robinhood Chain's
native currency is ETH, so the same literal would put the floor in the thousands of
dollars and double from there. Now `0.0001 ether`.

**FIX-2 — double-mint on mid-reign claim (bug).** `takeOffice()` computed its payout from
`slot0.startTime` while `claimOfficeRewards()` computed from `officeLastClaimTime`, so a
sheriff who claimed mid-reign was paid twice for the claimed window — **50% over-mint,
repeatable**. Both paths now share one cumulative accrual function. The regression test
was verified to fail against the original logic before being accepted.

> Live on Monad mainnet (`0x56B81A60Ae343342685911bd97D1331fF4fa2d29`). Not addressed here.

**FIX-3 — checks-effects-interactions (bug).** The original paid the fee split and the
deposed sheriff *before* writing `slot0`, leaving pre-takeover state across four external
calls; safe only via the reentrancy guard. State now advances first.

**FIX-4 — emission curve.** 4/sec on a 30-day halving → 0.5/sec on a 365-day halving.

**FIX-5 — within-reign decay.** Emission was pure wall-clock, so an uncontested sheriff
minted at full rate indefinitely.

Also: `NottToken.mint()` **clamps** to `MAX_SUPPLY` rather than reverting. `KeepTokenV2`
reverts, which would brick `takeOffice()` permanently at the cap — freezing the office
with no way to depose the sitting sheriff.

## Robinhood Stock Tokens — findings

Investigated for pairing $NOTT against tokenized equities. **Verified on-chain**, reading
the implementation behind the beacon proxy at
`0xb35490d6f9163DE4F80d88dc75c3516eb64C5aE2` (e.g. AAPL proxy
`0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9`).

**Composability is better than secondary reporting suggests.** The gate is a
**blocklist, not an allowlist** — arbitrary wallets and contracts can hold and transfer
by default:

```solidity
function transfer(address to, uint256 value)
    public override
    onlyNotPaused
    onlyNotBlocked(to)
    onlyNotBlocked(_msgSender())
```

So LPing them is *mechanically* possible. Three hazards make it a bad idea for a
protocol-owned pool anyway:

1. **`MULTIPLIER_UPDATER_ROLE`** — a scaling multiplier, almost certainly for stock
   splits and corporate actions. A constant-product pool has no idea a split happened;
   arbitrageurs drain it at the stale ratio the moment it lands. This is the one that
   would actually cost money.
2. **Pausable, including on oracle status.** `paused()` combines token and oracle pause.
   Equities have market hours — if the oracle pauses outside them, half the pool freezes
   nights and weekends.
3. **Discretionary blocklist.** Robinhood can block any address, including a pool or
   treasury, unilaterally.

Also note Stock Tokens are tokenized **debt securities** issued by Robinhood Assets
(Jersey) Ltd and are documented as not offered to **U.S. Persons**.

**Recommendation:** one deep canonical NOTT/ETH pool as the price anchor and protocol
liquidity. If sheriff-directed equity exposure is wanted, hold stock tokens as *treasury
reserves* rather than LP pairs — that sidesteps all three hazards (a rebase or pause
affects a reserve balance, not a pool ratio) while keeping the "hot stocks get picked"
signal. Whitelist, per-reign cap, and minimum hold time to bound governance capture.

## Deploy

```bash
pnpm --filter @innkeeper/contracts-nottingham compile
pnpm --filter @innkeeper/contracts-nottingham test

# testnet (46630) is the default; mainnet requires ROBINHOOD_CHAIN_ID=4663
pnpm --filter @innkeeper/contracts-nottingham deploy
```

Env: `PRIVATE_KEY`, `ALCHEMY_API_KEY` (or `ROBINHOOD_RPC_URL`),
`NOTTINGHAM_TREASURY_ADDRESS` (required for mainnet), `ROBINHOOD_CHAIN_ID`.

Deployment wires `NottToken.setSheriffsOffice()` last. Until that lands nothing can mint.

## Chain

Robinhood Chain is an Arbitrum L2 on Ethereum using blobs for DA.

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 4663 | 46630 |
| Explorer | robinhoodchain.blockscout.com | explorer.testnet.chain.robinhood.com |
| Gas | ETH | ETH |

Unlike the Monad package — where `chains.ts` defaulted to mainnet and `hardhat.config.ts`
defaulted to testnet off the same env var — this package defaults to **testnet**
everywhere. Mainnet must be opted into explicitly.

## Not yet built

- **Protocol-owned liquidity zap.** The Coffers accumulate ETH but nothing converts it
  into LP yet. `CellarZapV4` in `@innkeeper/contracts` is the working pattern.
- **NOTT burn sink.** Would need a phase-in so genesis isn't blocked by nobody holding
  NOTT yet.
- **Sheriff-directed treasury reserves.** See findings above.
- **Frontend.** The Monad app's `chains.ts` / `addresses.ts` / `feature-flags.ts` are
  single-chain and hardcoded to Monad; they need to become per-chain first.
