# Dev Setup — InnKeeper

Cloud-hosted development setup for Windows-friendly development.

## Requirements

* Node.js 18+
* pnpm (recommended) or npm/yarn
* Git
* Cloud service accounts (free tiers):
  - [Neon](https://neon.tech) or [Supabase](https://supabase.com) for PostgreSQL
  - [Upstash](https://upstash.com) or [Redis Labs](https://redis.com/try-free/) for Redis
  - [Cloudflare R2](https://www.cloudflare.com/products/r2/) or AWS S3 for storage (optional)

## Monorepo layout

```
/innkeeper
  /apps
    /web (Next.js app)
  /packages
    /engine (TS game engine)
    /agents (eliza wrappers)
    /lib (shared types)
  package.json (workspace)
  pnpm-workspace.yaml
```

## Cloud Service Setup

### PostgreSQL (Neon or Supabase)

1. Sign up at [Neon](https://neon.tech) (recommended) or [Supabase](https://supabase.com)
2. Create a new project
3. Copy the connection string (includes SSL)
4. Use it as `DATABASE_URL` in `.env`

**Neon example:**
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/innkeeper?sslmode=require
```

### Redis (Upstash or Redis Labs)

**Option 1: Upstash**
1. Sign up at [Upstash](https://upstash.com)
2. Create a new Redis database (free tier)
3. In the Upstash dashboard, find the **Redis URL** (not REST URL)
4. Format: `redis://default:TOKEN@HOST:PORT`

**Option 2: Redis Labs**
1. Sign up at [Redis Labs](https://redis.com/try-free/)
2. Create a new database (free tier)
3. Get your endpoint (host:port) and password
4. Format: `redis://default:PASSWORD@HOST:PORT`
5. If SSL is required, use `rediss://` instead of `redis://`

**Example (Redis Labs):**
```
REDIS_URL=redis://default:YOUR_PASSWORD@redis-xxx.cloud.redislabs.com:PORT
```

**Note**: Use the Redis URL for direct connections (needed for BullMQ/ioredis), not REST API endpoints.

### Storage (Optional for Development)

For production, use Cloudflare R2 or AWS S3. For development, you can skip this and handle storage later.

## Env vars (.env)

Create `.env` in the project root:

```env
# Database - from Neon or Supabase
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis - from Upstash
REDIS_URL=redis://default:password@host:port

# Storage (optional)
MINIO_ENDPOINT=https://your-account.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=innkeeper

# App config
NEXTAUTH_SECRET=replace-me-with-random-string
NEXTAUTH_URL=http://localhost:3000
ELIZA_URL=http://localhost:3001
ELIZA_API_KEY=your-eliza-api-key-here
FARCASTER_SIGNER_KEY=your-farcaster-signer-key-here
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Quick start (one-shot IDE import)

1. Clone: `git clone <repo>`
2. Set up cloud services (PostgreSQL, Redis) and add credentials to root `.env`
3. Install dependencies: `pnpm install`
4. Run migrations: Copy `supabase/migrations/20240101000000_initial_schema.sql` to Supabase SQL Editor and run
5. Start Next dev: `pnpm dev`
6. Start workers (separate terminal): `cd apps/web && pnpm start-worker`

## CI suggestions

* GitHub Actions: run `pnpm -w test`, `pnpm -w build`
* Use Dependabot for npm security

---

I can now create `frontend-spec.md` with Next.js specifics, Pixi integration, and code snippets. Say go or ask for changes.
