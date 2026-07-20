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
| `Coffers.sol` | Treasury — holds both sides of the pair |

The office and token are UUPS-upgradeable, matching the `@innkeeper/contracts` house
style. `Coffers` deliberately is not — see [Liquidity](#liquidity).

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
| Price reset | **1.3× last paid** |
| Sale split | **70% deposed sheriff / 25% Coffers / 5% dev** |
| Emission split | **90% sheriff / 10% Coffers** |
| Base emission | **0.5 NOTT/sec, halving every 365 days** |
| Within-reign decay | **100% → 50% → 25% → 12.5% → 10% floor, per epoch held** |
| Burn to take office | **dps x EPOCH** (1,800 NOTT), once supply > 250k |
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

Ten deliberate changes, marked `FIX-1..10` in the source.

| | Fix |
|---|---|
| Correctness | FIX-2 double-mint · FIX-3 CEI · **FIX-6 payout griefing brick** |
| Economic | FIX-1 denomination · FIX-4 curve · FIX-5 activity-gated emission · FIX-8 emission split · **FIX-9 price multiplier** · FIX-10 burn sink |
| Fairness | FIX-7 no deployer premine |

**FIX-9 is the one that matters most.** The Monad deployment wasn't exploited by a clever
attacker — it was just unbalanced, and this is the parameter that unbalanced it. See
[Balance](#balance).

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

**FIX-6 — payout griefing brick (bug, critical).** Every payout was a `require`-checked
push. A sheriff that cannot receive ETH — a contract with no `receive()`, or one that
reverts deliberately — made `takeOffice()` revert forever at the deposed-sheriff
transfer. **The office would be permanently bricked**: nobody could ever depose the
griefer, who kept accruing at the floor rate indefinitely. Cost of the attack: one
floor-priced takeover, about 35 cents, irreversible.

Failed payouts are now escrowed to `credits[]` and claimed via `withdrawCredits()`,
and the send gas is capped at a 30k stipend so a hostile `receive()` cannot burn the
caller's gas either. `withdrawFunds()` subtracts `totalCredits` so the owner sweep can
never take escrowed funds. Proven by a `HostileReceiver` test contract that refuses ETH
and still gets deposed.

> The Monad original has the same shape (`require(successMiner, "Miner transfer failed")`).

**FIX-7 — no deployer premine.** The original seated the deployer as opening sheriff, who
then accrued from deployment until the first takeover — a stealth premine proportional to
how long launch took. The office now starts **vacant**: nothing accrues until someone
actually buys it, and the vacant office's 70% share routes to the Coffers.

**FIX-8 — emission split, to make liquidity possible at all.** Removing the premine
(FIX-7) created a bootstrapping deadlock nobody had noticed: with minting gated to the
office and no premine, **the protocol owned zero NOTT and could never seed a pool.** The
Coffers accumulated ETH with nothing to pair against, and buying NOTT requires a pool to
already exist. 10% of every mint now routes to the Coffers, so the treasury accrues both
sides of the pair organically — liquidity without a premine, and without asking anyone to
trust a genesis allocation.

**FIX-10 — burn sink.** The token was mint-only: nothing ever removed supply, and NOTT had
no job beyond being sold. Taking the office now burns NOTT too, which gives the token a
use and creates structural buy pressure on the pool.

The requirement is denominated in `dps × EPOCH_PERIOD` — one epoch of emission at the
current base rate — so it tracks the halving schedule automatically and needs **no price
oracle**. That denomination produces an exact equilibrium, because a sheriff deposed after
a full epoch earns precisely `dps × EPOCH`:

| Turnover | Emitted/hr | Burned/hr | Net |
|---|---|---|---|
| 5 min | 1,800 | 21,600 | −19,800 |
| 30 min | 1,800 | 3,600 | −1,800 |
| **60 min** | **1,800** | **1,800** | **0** |
| 120 min | 1,350 | 900 | +450 |

A hot market is net deflationary, a quiet one mildly inflationary, and one takeover per
epoch is exactly neutral. Combined with activity-gated emission (FIX-5), supply now
responds to demand in both directions.

Two guards:

- **Phase-in.** Zero requirement until circulating supply reaches 250k NOTT. At genesis
  nobody holds any, so requiring a burn immediately would make the office unclaimable and
  the token unmintable — a deadlocked launch.
- **Capped at 1% of supply.** Without this, a collapse in circulating supply would make
  the office unaffordable to everyone and freeze it — the same permanent-brick failure as
  FIX-6, reached through economics rather than a revert.

Also: `NottToken.mint()` **clamps** to `MAX_SUPPLY` rather than reverting. `KeepTokenV2`
reverts, which would brick `takeOffice()` permanently at the cap — freezing the office
with no way to depose the sitting sheriff.

## Balance

The original's problem was never an exploit. It was that `NEW_PRICE_MULTIPLIER = 2x`
made flipping free money.

The deposed sheriff receives `MULTIPLIER × (1 − t/EPOCH)` of the price paid. At 2×, an
instant flip returned `2 × 70% = 140%` of cost. **The taker got back more ETH than they
paid and kept the emission.** Cost per NOTT was negative for any hold under ~15 minutes:

| Held | Cost per NOTT @ 2.0× | @ 1.3× |
|---|---|---|
| 1 min | **−0.0140** | 0.0039 |
| 5 min | **−0.0021** | 0.0012 |
| 15 min | **−0.0001** | 0.0008 |
| 60 min | 0.0006 | 0.0006 |

*(in units of the price paid; negative = the game pays you to play)*

That's risk-free profit funded by the next buyer, so rational players race to flip.
Turnover collapses below the escalation threshold and the price runs away — the spiral
isn't a side effect, it's the arbitrage working.

### The runaway

Price grows whenever `MULTIPLIER × (1 − t/EPOCH) > 1`, so at 2× **any turnover faster
than 30 minutes escalates without bound**:

| 5-min turnover for… | 1.3× | 2.0× |
|---|---|---|
| 50 min | $2 | $150 |
| 100 min | $12 | $64,000 |
| 150 min | $67 | **$27,625,560** |

The system was bistable: escalate until nobody can afford it, crash back to the floor,
repeat. A *successful* launch destroyed itself within hours, and the office was
unaffordable at exactly the moments people wanted it.

### The invariant

> **`MULTIPLIER × deposedShare < 1`** — holding the office must always cost something.

With a 70% deposed share the multiplier must stay below `1/0.7 ≈ 1.428`. **1.3×** leaves
margin: an instant flip returns 91%, so the taker pays 9% for whatever emission they
earned, and the cost per NOTT stays positive and roughly flat (3× spread from 5 minutes
to 2 hours) — no single hold-time dominates, so every strategy stays viable.

There is a test asserting the invariant directly against the deployed constants, so it
cannot silently break if the levy is ever retuned.

### Consequence worth knowing

At 1.3× the ask clamps to the floor about 14 minutes into an epoch rather than gliding
down for the full hour. That's correct — at the floor there is nothing left to
discover — and the decay window widens automatically when the price is elevated, which
is when the auction actually matters.

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

## Liquidity

The Coffers accrue **ETH** (25% of every sale) and **NOTT** (10% of every mint), so both
sides of the pair build up on their own. No premine, no genesis allocation.

Two deliberate constraints on that contract:

**Not upgradeable.** The office and token stay upgradeable because their logic may need
fixing. The vault holding the money does not — an upgrade hook on a treasury means the
owner can rewrite withdrawal logic after users have committed capital, which is the shape
of a rug.

**Not an autonomous zap.** A contract that buys NOTT and LPs on a schedule is
sandwichable on every single fire: the trade is public, the size is derivable from the
balance, and the timing is predictable. Instead `approveSpender()` lets an owner multisig
approve a position manager and execute the add directly, with slippage and tick bounds
chosen by whoever is actually watching the mempool.

`receive()` is deliberately empty. `SheriffsOffice` pays the levy with a 30k gas stipend,
so bookkeeping on receipt would risk the send failing and the levy escrowing to `credits[]`
instead — the treasury would read empty while everything looked fine. There is a test
asserting the levy arrives directly and `totalCredits` stays zero.

### Uniswap addresses — verify before approving

Uniswap V2/V3/V4 and UniswapX are live on Robinhood Chain, but addresses are **not
hardcoded here**, and checking why justified the caution:

**A name search returns 13 different verified contracts called `UniswapV3Factory`.**
Twelve of them are not the one you want. Name is not identification.

| Contract | Canonical address | Status |
|---|---|---|
| UniswapV3Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` | verified present, name matches |
| NonfungiblePositionManager | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` | **unconfirmed** — verifies as `PositionNFT` |

The position manager at the canonical cross-chain address carries an unexpected verified
name, so it is not confirmed. Before approving it from the Coffers, call `factory()` on it
and check the result equals the factory address above — a name match alone is not enough
on a chain with a dozen impostors.

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

- **Verified Uniswap addresses + a fork test** for the LP path. The manual multisig route
  works today; an integration test against a forked Robinhood Chain would be the gate for
  automating any of it.
- **NOTT burn sink.** Would need a phase-in so genesis isn't blocked by nobody holding
  NOTT yet.
- **Sheriff-directed treasury reserves.** See findings above.
- **Frontend.** The Monad app's `chains.ts` / `addresses.ts` / `feature-flags.ts` are
  single-chain and hardcoded to Monad; they need to become per-chain first.
