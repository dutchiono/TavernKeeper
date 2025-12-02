# Backend Spec — InnKeeper (Next.js Server)

## API Design Principles

* Single Next.js codebase exposes Route Handlers for all APIs
* Keep game-logic in `packages/engine` and call from route handlers
* Workers (separate process) consume job queue for heavy simulations
* Agents (Eliza) run as a microservice or integrated process

## Important Route Handlers (examples)

* `POST /api/runs` — create run, enqueue job
* `GET /api/runs/:id` — run status & logs
* `POST /api/agents/:id/converse` — update agent memory and persona
* `POST /api/agents/:id/action` — forward agent action to engine
* `GET /api/dungeons/:id/map` — map data
* `POST /api/images/scene` — dynamic PNG generation for frames

## Database Schema (Supabase)

Tables are defined in `supabase/migrations/20240101000000_initial_schema.sql`:

- `users` - User accounts with handles
- `agents` - AI agents with persona and memory (JSONB)
- `characters` - Character stats and inventory (JSONB)
- `dungeons` - Dungeon maps with seeds
- `runs` - Run instances with party and results
- `run_logs` - Text logs for runs
- `world_events` - Structured events for runs

## Worker Pattern (BullMQ)

* `runWorker`: pulls job -> calls `engine.simulateRun(seed, party)` -> persists run log -> updates run status
* `replayWorker`: generates GIF/PNG timeline from run events

## Security

* Validate all agent requests (agents cannot arbitrarily modify DB rows without the engine)
* Rate-limit agent/action invocation
* Use server-side signing when integrating with Farcaster frames

## Logging & Monitoring

* Structured logs (JSON) for run outcomes
* Prometheus + Grafana for metrics (jobs/sec, avg run duration)

---

Next: I'll create `dungeon-engine.md` with deterministic RNG, combat formulas, sample TypeScript functions, and action DSL enforcement rules.
