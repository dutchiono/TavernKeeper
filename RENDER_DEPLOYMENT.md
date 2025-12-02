# Render Deployment Guide

## Quick Start

Your app is now configured for Render deployment with `render.yaml`.

## Services Configured

1. **innkeeper-web** (Web Service - Full Node.js Server)
   - Next.js frontend + API routes running as full web service (NOT serverless)
   - Long-running Node.js process with persistent connections
   - Cost: $7/month (Starter) or Free (sleeps after inactivity)
   - Build: Installs pnpm → builds packages → builds web app
   - Start: `pnpm start` from apps/web (runs `next start` - full server mode)

2. **innkeeper-workers** (Background Worker)
   - BullMQ workers for game simulations
   - Cost: $7/month (must stay awake)
   - Build: Installs pnpm → builds packages
   - Start: `pnpm start-worker`

3. **innkeeper-discord-bot** (Web Service)
   - Discord bot service
   - Cost: $7/month (must stay awake)
   - Build: Installs pnpm → builds discord-bot package
   - Start: `node dist/index.js`

**Total: $21/month** (or $14/month if web on free tier)

## Deployment Steps

### 1. Create Render Account & Connect Repo

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Blueprint"
4. Connect your `InnKeeper` repository
5. Render will detect `render.yaml` and show all 3 services
6. Review configuration and click "Apply"

### 2. Set Environment Variables

**For innkeeper-web service:**

Go to service → Environment tab → Add these variables:

**Required:**
```
DATABASE_URL=postgresql://... (from Supabase)
REDIS_URL=redis://... (from Upstash)
NEXTAUTH_SECRET=<generate-random-string>
NEXTAUTH_URL=https://innkeeper-web.onrender.com (update after first deploy)
ELIZA_URL=https://... (your ElizaOS service URL)
ELIZA_API_KEY=...
OPENAI_API_KEY=...
FARCASTER_SIGNER_KEY=...
NEXT_PUBLIC_API_URL=https://innkeeper-web.onrender.com/api
NEXT_PUBLIC_USE_LOCALHOST=false
```

**Blockchain/Contract:**
```
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://...
NEXT_PUBLIC_PRICING_SIGNER_ADDRESS=0x...
```

**Add ALL variables from `apps/web/.env.example`**

**For innkeeper-workers service:**

Copy ALL environment variables from web service, especially:
- `DATABASE_URL` (must match)
- `REDIS_URL` (must match)
- `ELIZA_URL`
- `ELIZA_API_KEY`
- All other vars

**For innkeeper-discord-bot service:**

```
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
DISCORD_API_BASE_URL=https://innkeeper-web.onrender.com/api
DATABASE_URL=... (same as web service)
ELIZA_URL=...
ELIZA_API_KEY=...
OPENAI_API_KEY=...
```

### 3. Deploy Services

1. **Deploy web service first:**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for build to complete
   - Note the URL (e.g., `https://innkeeper-web.onrender.com`)

2. **Update NEXTAUTH_URL:**
   - After web service is deployed, update `NEXTAUTH_URL` to your Render URL
   - Redeploy web service

3. **Deploy workers:**
   - Set all environment variables
   - Deploy
   - Check logs to ensure workers connect to Redis

4. **Deploy Discord bot:**
   - Set all environment variables
   - Set `DISCORD_API_BASE_URL` to your web service URL
   - Deploy
   - Check logs to ensure bot connects

### 4. Verify Deployment

**Web Service:**
- Visit your Render URL
- Test API routes: `/api/map`, `/api/heroes/owned`
- Check health endpoint

**Workers:**
- Check logs for "Worker started" message
- Create a test run via API
- Verify workers process the job

**Discord Bot:**
- Check logs for "Bot logged in" message
- Test slash commands in Discord
- Test bot mentions

## Build Process Details

Render executes:
1. `npm install -g pnpm` - Install pnpm globally
2. `pnpm install --frozen-lockfile` - Install all dependencies
3. `pnpm build --filter './packages/*'` - Build workspace packages
4. `pnpm --filter @innkeeper/web build` - Build Next.js app
5. `cd apps/web && pnpm start` - Start Next.js server

## Troubleshooting

### Build Fails: "Cannot find module @innkeeper/..."
**Fix:** Ensure build command includes package build step

### Build Timeout (Free Tier)
**Issue:** Free tier has 10-minute build limit
**Fix:** Upgrade to Starter plan ($7/month)

### Workers Not Processing Jobs
**Check:**
- `REDIS_URL` matches between web and workers
- Workers service is running (not sleeping)
- Check worker logs for connection errors

### Environment Variables Not Working
**Check:**
- All `NEXT_PUBLIC_*` vars are set in Render dashboard
- Variables are set for correct service
- No typos in variable names

## Cost Optimization

**Option 1: Free Tier (Testing)**
- Web service: Free (sleeps after 15min)
- Workers: Starter $7/month
- Discord bot: Starter $7/month
- **Total: $14/month**

**Option 2: Starter Plan (Production)**
- All services: Starter $7/month each
- No sleep, better performance
- **Total: $21/month**

## Notes

- **Full Web Service (Not Serverless):** Render runs Next.js as a full Node.js web service, not serverless functions
  - No function timeouts or cold starts
  - Persistent connections (Redis, PostgreSQL, etc.)
  - Long-running processes supported
  - API routes run in same process as frontend
- Render auto-detects Node.js projects
- Monorepo works with `rootDir: ./`
- Build commands run from repo root
- Environment variables can be shared (use "Sync" in dashboard)
- Services can reference each other via Render service URLs
