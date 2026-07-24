# Nottingham — session handoff

Written 2026-07-23 for the next agent. The chat that produced this is gone; this file plus
the README and the FIX-N comments in the source are the whole record.

Repo `dutchiono/TavernKeeper`, branch `main`, all work pushed through `b290052`.

---

## 1. What this is

**Nottingham** is a new launch of TavernKeeper's "The Office" mechanic — King-of-the-Hill
via descending Dutch auction, sole-minter token — rethemed and retargeted at **Robinhood
Chain**.

Lineage: donut-miner (Base) → TavernKeeper's Office (Monad, `TavernKeeperV3.sol`) →
Nottingham (Robinhood Chain, this package).

**Why a new launch, in the user's words: the Monad contracts "are ancient and were abused,"
and "it just wasn't balanced right."** That second quote is the key one — see §4. The Monad
deployment is *not* being fixed, migrated, or upgraded. Don't propose that.

Theme: you buy the sheriffdom, tax the town, hold it until someone outbids you. Early-modern
offices were literally purchased and recouped through taxation, so the Dutch auction *is*
the historical mechanic, not decoration on top of it.

| TavernKeeper | Nottingham |
|---|---|
| The Office | The Sheriff's Office |
| King / `miner` | The Sheriff |
| The Message (`uri`) | The Proclamation |
| The Cellar | The Coffers |
| KEEP | NOTT |

---

## 2. State of the code

```
packages/contracts-nottingham/
  contracts/  SheriffsOffice.sol   NottToken.sol   Coffers.sol
  test/       6 files, 78 tests, all passing
  scripts/    deploy.ts (dry-run verified locally)
apps/web/lib/nottingham/    chain.ts  addresses.ts  wagmi.ts
apps/web/lib/feature-flags.ts        (now per-chain)
apps/web/__tests__/lib/nottingham-config.test.ts   (17 tests)
```

```bash
pnpm --filter @innkeeper/contracts-nottingham compile
pnpm --filter @innkeeper/contracts-nottingham test
```

**Nothing is deployed anywhere.** No mainnet, no testnet. Addresses are env-driven and
currently unset.

Chain: Robinhood Chain, Arbitrum L2, **ETH** for gas. Mainnet `4663`, testnet `46630`.
Every config defaults to **testnet**; mainnet must be opted into explicitly. (The Monad
setup defaulted the app to mainnet and hardhat to testnet off the *same* env var, which is
how you deploy to the wrong network.)

---

## 3. The 13 divergences from the Monad original

Each is marked `FIX-N` in the source with the full reasoning. Summary:

| N | Change | Kind |
|---|---|---|
| 1 | `MIN_INIT_PRICE` 1 ether (=1 MON) → 0.0001 ether — same literal meant thousands of dollars on an ETH chain | denomination |
| 2 | **Double-mint on mid-reign claim** — 50% over-mint, repeatable | bug |
| 3 | Checks-effects-interactions ordering | bug |
| 4 | Emission curve 4/sec·30d → 0.5/sec·365d | economic |
| 5 | Within-reign decay — emission becomes activity-gated | economic |
| 6 | **Payout griefing brick** — permanent DoS for ~$0.35 | bug, critical |
| 7 | No deployer premine — office starts vacant | fairness |
| 8 | 10% of emission → Coffers (required; see below) | economic |
| 9 | **`NEW_PRICE_MULTIPLIER` 2× → 1.3×** — *the* balance bug | economic |
| 10 | Burn sink with oracle-free equilibrium | economic |
| 11 | Sheriff-directed pool incentives | structural |
| 12 | Demand-retargeted floor | revenue |
| 13 | Ask ceiling at 4× floor | revenue |

---

## 4. FIX-9 — what "wasn't balanced right" actually was

**Read this before touching any economic parameter.**

The deposed sheriff receives `MULTIPLIER × (1 − t/EPOCH)` of the price paid. At the
original 2×, an instant flip returned `2 × 70% = 140%` of cost. **The taker got back more
ETH than they paid and kept the emission.** Cost per NOTT was negative for any hold under
~15 minutes:

| Held | Cost/NOTT @ 2.0× | @ 1.3× |
|---|---|---|
| 1 min | **−0.0140** | 0.0039 |
| 15 min | **−0.0001** | 0.0008 |
| 60 min | 0.0006 | 0.0006 |

Risk-free profit funded by the next buyer ⇒ everyone races to flip ⇒ turnover collapses
below the escalation threshold ⇒ price runs away (5-min turnover reached ~7,900 ETH in
2.5 hours) ⇒ nobody can afford it ⇒ crash to floor ⇒ repeat. **Bistable.** A *successful*
launch destroyed itself within hours.

Nobody had to attack it. They just had to play optimally. That is what "unbalanced" meant.

> ### INVARIANT: `NEW_PRICE_MULTIPLIER × deposedShare < 1`
>
> Holding the office must always cost something. deposedShare is 70%, so the multiplier
> ceiling is `1/0.7 ≈ 1.428`. Currently 1.3×, giving `0.91`.
>
> **This couples the fee split to the multiplier.** Change `COFFERS_BPS` or `DEV_BPS` and
> you change the ceiling. There is a test asserting it against the deployed constants —
> do not delete it.

---

## 5. Economics as they stand

| | |
|---|---|
| Epoch | 1 hour, linear price decay to floor |
| Floor | **demand-retargeted**, 0.0001 – 0.1 ETH |
| Ask ceiling | 4× floor |
| Price reset | 1.3× last paid |
| Sale split | 70% deposed / 25% Coffers / 5% dev |
| Emission split | 80% sheriff / 10% Coffers / 10% favored pool |
| Base emission | 0.5 NOTT/sec, halving every 365 days |
| Within-reign decay | 100/50/25/12.5% → 10% floor, per epoch held |
| Burn to take office | `dps × EPOCH` (1,800 NOTT), once supply > 250k |
| Supply cap | 100M (backstop; contested schedule tops ~31.5M) |

**FIX-5, activity-gated emission.** Accrual halves each epoch held *uncontested*. 30 days
of hourly turnover emits 1,296,000 NOTT; 30 days squatted by one address emits 132,255.
Ten times more supply flows to a contested office than a dead one, so a quiet market stops
diluting holders. Decay measures from **reign start, not last claim** — otherwise claiming
hourly resets you to full rate. Tested.

**FIX-10, burn sink.** Denominated in `dps × EPOCH`, so it tracks the halving schedule with
**no oracle** and yields an exact equilibrium: one takeover per epoch is supply-neutral
(1,800 emitted, 1,800 burned). Faster is deflationary, slower mildly inflationary. Phased
in above 250k supply (at genesis nobody holds NOTT — an immediate requirement deadlocks the
launch) and capped at 1% of supply (a supply collapse would otherwise price everyone out
and freeze the office — the FIX-6 brick reached through economics).

**FIX-12/13, revenue.** FIX-9 had an unmeasured side effect: with the multiplier at 1.3×
the ask only escalates below ~14-min turnover, so at any realistic pace the price sat *at
the floor* and the protocol earned ~$920/yr **regardless of volume**. The floor now
retargets like a difficulty adjustment (target = one takeover/epoch, `floor × TARGET /
elapsed`, clamped 1.25×/0.8× per step). FIX-13 then bands the ask to 4× floor because
capping the floor alone wasn't enough — the multiplier compounds independently and still
ran away. Bounded: max floor 0.1 ETH, max ask 0.4 ETH.

---

## 6. Stock tokens — the researched answer

The user wanted NOTT paired against Robinhood tokenized equities, with arbitrage between
pairs surfacing "hot" stocks. **I argued against it and was substantially wrong.** Four
objections, three overturned by actually checking:

**WRONG — "stock pairs mean worse IL."** Variance adds and stocks are *less* volatile than
ETH, so relative vol is lower. NOTT/AAPL LVR ≈ 28.9%/yr vs NOTT/ETH ≈ 32.6%. NOTT's own
vol dominates.

**WRONG — "fragmentation multiplies the arbitrage leak."** LVR scales with pool *value*;
N pools of T/N bleed the same total. Fragmentation multiplies **slippage**.

**WRONG, and this was the big one — "a stock split silently drains the pool."** Stock Tokens
**do not rebase**. Verified against the implementation behind the beacon proxy
(`0xb35490d6f9163DE4F80d88dc75c3516eb64C5aE2`, e.g. AAPL proxy
`0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9`):

```solidity
function balanceOf(address account) public view virtual returns (uint256) {
    return $._balances[account];      // no multiplier applied
}
```

`MULTIPLIER_UPDATER_ROLE` drives `ERC20ScaledUIUpgradeable`, which is **display-only**. I
had inferred a rebase from a role name. Pool reserves are never altered behind your back.

**RIGHT — depth.** Slippage on a $5k trade: $100k treasury → 5% (1 pool) vs **40%** (8
pools). Below ~$500k, multi-pair is strictly worse at any N. This is the real gate.

**What genuinely remains:** transfers carry `onlyNotPaused` (and `paused()` folds in oracle
status, so a closed market can freeze them) plus a blocklist Robinhood controls. Neither
destroys value — they make a position temporarily *illiquid*.

### Governing invariant: stock exposure must never be load-bearing

Delivered two capped ways:

1. **Treasury reserves** (`Coffers`) — approved Stock Tokens held as reserves,
   `MAX_RESERVE_BPS = 3000`, at most 30% of lifetime treasury ETH. The other 70% stays in
   ETH backing the canonical pool. The ceiling counts already-committed capital in its base,
   so it caps *total allocation* rather than drifting as the balance falls.
2. **Sheriff-directed incentives** (FIX-11) — the sheriff points 10% of emission at one
   owner-approved pool per reign. Owner-curated (otherwise the sheriff names their own
   wallet and mints to themselves for the floor price), re-checked at mint time, cleared on
   takeover.

The protocol LPs **one canonical NOTT/ETH pool** and nothing else. Stock pairs are
third-party satellites; ordinary arbitrage against the canonical pool keeps them coherent
at no cost to the protocol, because the protocol is never the stale LP. Worst case: every
held stock pauses at once → 30% of treasury illiquid, NOTT keeps trading.

---

## 7. Deliberate design choices — don't "fix" these

- **`Coffers` is not upgradeable.** Office and token are; the vault that holds money is not.
  An upgrade hook on a treasury lets the owner rewrite withdrawal logic after users commit
  capital.
- **No autonomous zap.** A contract that buys and LPs on a schedule is sandwichable every
  fire — public trade, derivable size, predictable timing. `approveSpender()` +
  `fundReservePurchase()` let a multisig execute with real slippage bounds.
- **`Coffers.receive()` is empty.** The office pays with a 30k gas stipend; bookkeeping on
  receipt risks the levy escrowing to `credits[]` while the treasury reads empty. Tested.
- **`NottToken.mint()` clamps to `MAX_SUPPLY`** rather than reverting. `KeepTokenV2` reverts,
  which would brick `takeOffice()` at the cap forever.
- **No Uniswap addresses hardcoded.** A name search on Robinhood Chain returns **thirteen**
  verified contracts called `UniswapV3Factory`. Name is not identification.
  - Factory `0x1F98431c8aD98523631AE4a59f267346ea31F984` — verified present, name matches.
  - Position manager `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` — **unconfirmed**,
    verifies as `PositionNFT`. Call `factory()` on it and compare before approving.

---

## 8. Open work

1. **Nothing renders `WagmiProvider`.** `UnifiedWeb3Provider` is the only mount point and
   is never rendered — `app/layout.tsx` has no provider above components calling
   `useAccount`. **Pre-existing**, not introduced this session, but it means the Monad web3
   UI is already dead and no Nottingham UI can work until something mounts a provider. This
   is why the frontend config was added *alongside* rather than retrofitting ~50 files.
2. **No Nottingham UI at all** — only config exists.
3. **Fork test for the LP path** before automating anything. Also: LVR on NOTT/ETH is
   ~32%/yr, so protocol-owned liquidity is only net-positive if fees exceed that. Unproven.
4. **No audit.** Thirteen fixes found by targeted reading is not an audit, and these
   contracts hold ETH.
5. **Deploy + verify** on testnet 46630 first.
6. **Regulatory shape is the user's call** — Stock Tokens are tokenized debt securities from
   a Jersey entity, documented as not offered to U.S. Persons.

---

## 9. Working notes

- **Windows/cp1252 trap.** Python scripts writing UTF-8 default to cp1252 here and silently
  replace em-dashes with `U+FFFD`. Bit me twice. Always
  `io.open(p,'w',encoding='utf-8',newline='\n')`, and verify by *counting*
  `b'\xef\xbf\xbd'`, not by checking an exit code.
- **`wagmi` shows 24 pre-existing TS2307 errors** under `moduleResolution: bundler`. Not
  caused by this work; don't chase it.
- `pnpm --filter`, hardhat + vitest. Pre-commit hook runs a syntax check.
- Two things caught by tests that are worth preserving: Next only inlines **literal**
  `process.env.NEXT_PUBLIC_X` (a computed lookup silently yields zero addresses in the
  browser bundle), and viem's `isAddress` validates EIP-55 (it rejected a real mis-cased
  address copied from Blockscout).

## 10. Session commits

```
b290052 feat(nottingham): demand-retargeted floor + ask ceiling — make it earn
ead8e2a feat(nottingham): capped stock reserves — make equities an option
a6fd9b8 feat(nottingham): sheriff-directed pool incentives (the stock-pair answer)
a2dbe4e docs(nottingham): record frontend layer and honest remaining work
12cc644 feat(nottingham): burn sink with oracle-free equilibrium
b519038 feat(web): Nottingham chain config + per-chain feature flags
8411355 fix(nottingham): price multiplier 2x -> 1.3x, the actual balance bug
7ff9794 feat(nottingham): Coffers treasury + emission split
b346e78 fix(nottingham): unbrickable payouts, vacant genesis
80e4a8b feat(nottingham): activity-gated emission, longer curve, 70/25/5 levy
c17166f feat(nottingham): Sheriff's Office + $NOTT on Robinhood Chain
18cea31 feat(server): expand sqlite schema, normalize db import
```

Commit messages carry the full reasoning for each change — `git log` is the deeper record
if this file is not enough.

### One housekeeping note

`18cea31` is unrelated to Nottingham. At session start the repo had a **nested duplicate
tree** at `TavernKeeper/TavernKeeper/` that was **38 commits AHEAD** of the outer one — it
held the entire wager system, `plugin-milady`, and uncommitted server work. The user asked
to delete "garbage"; deleting it would have destroyed all of that. Resolution: committed the
server work (`18cea31`), pushed, fast-forwarded the outer tree 249 → 288, verified zero
nested-only files, then removed the duplicate. Nothing lost. `m00n-cabal/` is a *separate*
gitignored repo (`mugrebot/m00n-cabal`) still parked in the root — untouched, probably worth
relocating.
