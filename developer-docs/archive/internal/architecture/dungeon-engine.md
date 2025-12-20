# Dungeon Engine — Rules & Implementation

## Goals

* Deterministic, reproducible runs
* Enforceable Action DSL (agents propose, engine executes)
* Efficient full-run simulation for quick returns
* Clear separation between engine state and agent memory

## Deterministic RNG

* Use seedderived = HMAC_SHA256(dungeonSeed + runId + startTime)
* Use `seedrandom` (or `mulberry32`/`xoshiro` implementation) with the seed
* All dice rolls come from this PRNG

## Core Concepts

* **Entity**: characters, monsters, objects. Has stats and ID.
* **Turn**: initiative-based. Each entity may queue 0..N actions.
* **Action**: `move`, `attack`, `skill_check`, `use_item`, `interact`.
* **Event**: engine-produced structured event: `{type, actorId, payload, roll}`

## Combat math (example)

* Attack roll: `d20 + attack_bonus` vs `target.ac`
* Damage: roll weapon dice + STR/DEX modifier
* Critical: natural 20 => double damage dice
* Advantage: roll d20 twice take higher

## Initiative

* Each entity rolls `d20 + dex_mod` at encounter start
* Turn order is sorted, ties by highest dex then id

## Action Execution

* Agents submit a single `intent` per decision window
* DM resolves conflicting intents (e.g., two agents targeting same object)
* Engine validates intents, executes in initiative order

## Sample TypeScript snippets

```ts
// seeded RNG
import seedrandom from 'seedrandom'
function makeRng(seed: string){ return seedrandom(seed) }
function d(sides:number, rng:any){ return Math.floor(rng()*sides) + 1 }

// attack example
function attack(attacker, target, rng){
  const roll = d(20, rng) + attacker.attackBonus
  const hit = roll >= target.ac
  let dmg = 0
  if(hit){ dmg = d(attacker.weapon.die, rng) + attacker.strMod }
  return {hit, roll, dmg}
}
```

## Action DSL enforcement

* Action payloads are validated against JSON schemas
* Engine only accepts actions from authorized agent IDs
* Engine returns full event list after each turn for logging

## Performance

* Run simulation is single-threaded per job; parallelize jobs across worker instances
* Use compact binary or JSON events for run logs; compress large replays to S3

---

I'll now create `agent-system.md` documenting ElizaOS integration, memory patterns, and example manifests.
