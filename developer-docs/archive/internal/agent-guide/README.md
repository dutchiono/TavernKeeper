# Agent Guide

This directory contains instructions and documentation for agents working on the InnKeeper project.

## Overview

InnKeeper is a Next.js-based dungeon crawler game with:
- ElizaOS AI agents for character behavior
- Deterministic game engine
- Farcaster miniapp integration
- Real-time run simulations

## Available Guides

- **[Frontend Designer Guide](./frontend-designer.md)** - Instructions for building the UI/UX
- **[Engine Updates for Frontend](./engine-updates-frontend.md)** - **NEW: Game engine improvements and integration guide**
- **[UI Overhaul Check-In](./frontend-checkin-ui-update.md)** - **LATEST: UI updates and test status**
- **[ElizaOS Setup Guide](./eliza-setup.md)** - How to configure ElizaOS agents
- **[API Keys Guide](./api-keys.md)** - Where and how to add API keys
- **[Frontend Architect Check-In](./frontend-architect-checkin.md)** - Status updates and integration questions

## Project Structure

```
/innkeeper
  /apps
    /web          # Next.js application (main app)
  /packages
    /engine       # Game engine (deterministic, seeded RNG)
    /agents       # ElizaOS agent wrappers
    /lib          # Shared types and utilities
  /infra          # Infrastructure config (archived)
  /supabase       # Database migrations
  /agent-guide    # This directory
```

## Quick Start for New Agents

1. Read the relevant guide for your role
2. Check the main [README](../README.md) for setup instructions
3. Review the architecture docs in `/arc` for system understanding
4. Ask questions in the project communication channel

## Current Status

- ✅ Project scaffolding complete
- ✅ Database schema defined
- ✅ Game engine core implemented
- ✅ Agent integration structure ready
- ✅ API routes scaffolded
- ⏳ Frontend UI/UX (in progress)
- ⏳ ElizaOS configuration (pending API keys)
- ⏳ Farcaster frame implementation (pending)

