# InnKeeper — Architecture

## Purpose

High-level split of components for InnKeeper (Next.js + ElizaOS + deterministic dungeon engine). This doc maps the system and describes interactions between pieces so your IDE can scaffold the monorepo.

## System Boundaries

* **Client (Next.js)**: Renders Inn UI, Map Room, Miniapp frames. Uses PixiJS in client components for 8‑bit canvas rendering.
* **Server (Next.js Route Handlers / Server Functions)**: Hosts API endpoints for game engine, agents, images, and Farcaster frames.
* **Eliza Agent Layer**: Manages agent personas, memory, and dialog. Agents call Action DSL endpoints to affect the game world.
* **Game Engine Module**: Deterministic rule engine (TypeScript) that executes actions, resolves combat, does RNG with seeded PRNG.
* **Workers (BullMQ)**: Run simulation jobs, world ticks, replay renders.
* **DB (Postgres + Supabase)**: Persistent world state, runs, logs, items, agents.
* **Storage (S3 / MinIO)**: Sprites, replays, generated images.

## High-Level Data Flow

1. Player interacts in Next UI (client). Pre-run conversation updates PlayerAgent persona/memory via `/api/agent/:id/converse`.
2. Player requests a run: `/api/runs` -> route handler enqueues job with run seed.
3. Worker picks job, loads agents, seeds PRNG, requests DM description (either DM agent or engine template), executes turns via the Game Engine, persists `run_log` and `world_events`.
4. Worker returns final state; route handler updates DB. Client fetches run recap and agent memory updates.

## Key Integration Points

* **Agent → Action DSL**: Agents cannot write state directly. They propose actions which invoke the Action DSL that the Game Engine executes.
* **Game Engine → Agents**: Engine returns structured events which are fed back into Eliza memory so agents "remember" canonical outcomes.
* **DM**: Either an Eliza agent with restricted toolset or a deterministic event generator module; both call the action API.

## Deployment Model

* Monorepo deployable as a single Next.js app (Edge/Serverless for route handlers) + workers (containerized) + cloud-hosted Postgres/Redis.
* Development uses cloud services (Neon/Supabase for Postgres, Upstash for Redis) for Windows-friendly setup.
