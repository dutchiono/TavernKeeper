# Production Deployment Guide

**Purpose:** Set up CI/CD and production deployment for Discord bot and web app using GitHub Actions and Vercel.

## Overview

This guide covers:
- GitHub Actions CI/CD pipeline
- Vercel deployment configuration
- Discord bot deployment (separate service)
- Environment variable management
- Deployment architecture

## Deployment Architecture

### Recommended Setup

```
┌─────────────────┐
│   GitHub Repo   │
└────────┬────────┘
         │
         ├─── GitHub Actions (CI/CD)
         │
    ┌────┴────┬──────────────┐
    │         │              │
    ▼         ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│ Vercel │ │ Railway/ │ │ Supabase │
│ (Web)  │ │ Render   │ │ (DB)     │
│        │ │ (Bot)    │ │          │
└────────┘ └──────────┘ └──────────┘
    │         │              │
    └─────────┴──────────────┘
              │
         ┌────┴────┐
         │ Upstash │
         │ (Redis) │
         └─────────┘
```

**Components:**
- **Web App**: Vercel (Next.js)
- **Discord Bot**: Separate service (Railway, Render, Fly.io, or VPS)
- **Database**: Supabase (shared)
- **Redis**: Upstash (shared)
- **ElizaOS**: Separate service (TBD)

## GitHub Actions CI/CD

### Workflow for Discord Bot

**File**: `.github/workflows/discord-bot.yml`

```yaml
name: Discord Bot CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'packages/discord-bot/**'
      - '.github/workflows/discord-bot.yml'
  pull_request:
    branches: [main]
    paths:
      - 'packages/discord-bot/**'

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Discord bot
        run: pnpm --filter @innkeeper/discord-bot build

      - name: Run tests
        run: pnpm --filter @innkeeper/discord-bot test
        continue-on-error: true

      - name: Lint
        run: pnpm --filter @innkeeper/discord-bot lint
        continue-on-error: true

      - name: Check build output
        run: |
          if [ ! -f "packages/discord-bot/dist/index.js" ]; then
            echo "Build failed - dist/index.js not found"
            exit 1
          fi
          echo "Build successful"

  # Optional: Deploy to staging
  deploy-staging:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://your-staging-bot.railway.app

    steps:
      - name: Deploy to staging
        run: |
          echo "Deploy to staging service"
          # Add deployment commands here
```

### Workflow for Web App

**File**: `.github/workflows/web-app.yml`

```yaml
name: Web App CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/**'
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build --filter './packages/*'

      - name: Build web app
        run: pnpm --filter @innkeeper/web build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_STAGING }}
          REDIS_URL: ${{ secrets.REDIS_URL_STAGING }}

      - name: Run tests
        run: pnpm --filter @innkeeper/web test
        continue-on-error: true
```

## Vercel Configuration

### Web App Deployment

Vercel automatically detects Next.js apps. Create `vercel.json` for custom configuration:

**File**: `vercel.json`

```json
{
  "buildCommand": "pnpm install && pnpm build --filter './packages/*' && pnpm --filter @innkeeper/web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD apps/web packages/",
  "env": {
    "DATABASE_URL": "@database-url",
    "REDIS_URL": "@redis-url",
    "ELIZA_URL": "@eliza-url",
    "ELIZA_API_KEY": "@eliza-api-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url"
  }
}
```

**Note**: Vercel environment variables should be set in Vercel dashboard, not in `vercel.json`. The `env` section above is for reference.

### Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

- `DATABASE_URL` - Supabase connection string
- `REDIS_URL` - Upstash Redis URL
- `ELIZA_URL` - ElizaOS service URL
- `ELIZA_API_KEY` - ElizaOS API key
- `OPENAI_API_KEY` - OpenAI API key (for embeddings/RAG)
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Production URL
- `FARCASTER_SIGNER_KEY` - Farcaster signer key (if using)

## Discord Bot Deployment

### Option 1: Railway (Recommended)

**Pros:**
- Easy setup
- GitHub integration
- Good for Node.js services
- Free tier available

**Setup:**

1. **Create `railway.json`** (optional):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd packages/discord-bot && node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Create `railway.toml`** (alternative):
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd packages/discord-bot && node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 100
```

3. **Deploy Steps:**
   - Connect GitHub repo to Railway
   - Create new service
   - Set root directory: `packages/discord-bot`
   - Set build command: `cd ../.. && pnpm install && pnpm --filter @innkeeper/discord-bot build`
   - Set start command: `node dist/index.js`
   - Add environment variables
   - Deploy

### Option 2: Render

**File**: `render.yaml`

```yaml
services:
  - type: web
    name: discord-bot
    env: node
    buildCommand: cd ../.. && pnpm install && pnpm --filter @innkeeper/discord-bot build
    startCommand: cd packages/discord-bot && node dist/index.js
    envVars:
      - key: DISCORD_BOT_TOKEN
        sync: false
      - key: DISCORD_CLIENT_ID
        sync: false
      - key: DISCORD_GUILD_ID
        sync: false
      - key: ELIZA_URL
        sync: false
      - key: ELIZA_API_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: innkeeper-db
          property: connectionString
```

### Option 3: Fly.io

**File**: `packages/discord-bot/fly.toml`

```toml
app = "innkeeper-discord-bot"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true
```

**File**: `packages/discord-bot/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/discord-bot/package.json ./packages/discord-bot/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/discord-bot ./packages/discord-bot
COPY packages/agents ./packages/agents
COPY packages/lib ./packages/lib

# Build
RUN pnpm --filter @innkeeper/discord-bot build

# Start
WORKDIR /app/packages/discord-bot
CMD ["node", "dist/index.js"]
```

### Option 4: VPS (DigitalOcean, Linode, etc.)

**Setup Script**: `packages/discord-bot/deploy.sh`

```bash
#!/bin/bash
set -e

echo "Deploying Discord bot..."

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm --filter @innkeeper/discord-bot build

# Restart service (using PM2)
pm2 restart discord-bot || pm2 start dist/index.js --name discord-bot

echo "Deployment complete"
```

**PM2 Configuration**: `packages/discord-bot/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: './dist/index.js',
    cwd: './packages/discord-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

## Environment Variables

### Discord Bot Required Variables

```
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-server-id
DISCORD_API_BASE_URL=https://your-app.vercel.app/api
ELIZA_URL=https://your-eliza-service.com
ELIZA_API_KEY=your-eliza-key
OPENAI_API_KEY=your-openai-key
DATABASE_URL=postgresql://...
DOCS_PATH=./docs/game
```

### Web App Required Variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ELIZA_URL=https://your-eliza-service.com
ELIZA_API_KEY=your-eliza-key
OPENAI_API_KEY=your-openai-key
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-app.vercel.app
FARCASTER_SIGNER_KEY=your-key
```

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set in deployment service
- [ ] Database migrations run
- [ ] Tests passing
- [ ] Build successful locally
- [ ] ElizaOS service deployed and accessible
- [ ] Discord bot token valid
- [ ] Message Content Intent enabled in Discord Developer Portal

### Discord Bot Deployment
- [ ] Code pushed to main branch
- [ ] GitHub Actions build passes
- [ ] Deployed to staging environment
- [ ] Bot connects and logs in
- [ ] Slash commands register
- [ ] Mentions work
- [ ] Verification flow works
- [ ] Deployed to production

### Web App Deployment
- [ ] Code pushed to main branch
- [ ] Vercel build successful
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] App accessible at production URL
- [ ] API routes working
- [ ] TavernKeeper agent working

## Monitoring

### Discord Bot Health Check

**File**: `packages/discord-bot/src/health.ts`

```typescript
import { Client } from 'discord.js';

export function setupHealthCheck(client: Client) {
  // Health check endpoint (if using HTTP server)
  // Or periodic health check logging

  setInterval(() => {
    const isReady = client.isReady();
    const guildCount = client.guilds.cache.size;

    console.log(`[Health] Ready: ${isReady}, Guilds: ${guildCount}`);

    if (!isReady) {
      console.error('[Health] Bot is not ready!');
    }
  }, 60000); // Every minute
}
```

### Logging

Use structured logging:
- Winston
- Pino
- Or simple console with timestamps

**Example**:
```typescript
console.log(`[${new Date().toISOString()}] [INFO] Bot started`);
console.error(`[${new Date().toISOString()}] [ERROR] Connection failed`);
```

## Troubleshooting

### Bot Not Starting
- Check environment variables are set
- Check bot token is valid
- Check ElizaOS service is accessible
- Check database connection

### Bot Disconnects
- Check network connectivity
- Check rate limits
- Check Discord API status
- Implement reconnection logic

### Build Fails
- Check Node.js version (18+)
- Check pnpm is installed
- Check all dependencies are in package.json
- Check TypeScript compilation errors

### Deployment Fails
- Check build logs
- Check environment variables
- Check service limits (Railway free tier, etc.)
- Check service is running

## Cost Estimates

### Railway (Discord Bot)
- Free tier: 500 hours/month
- Hobby: $5/month (unlimited hours)
- **Recommendation**: Start with free tier, upgrade if needed

### Render (Discord Bot)
- Free tier: Spins down after inactivity
- Starter: $7/month (always on)
- **Recommendation**: Use free tier for testing, Starter for production

### Vercel (Web App)
- Free tier: 100GB bandwidth, unlimited requests
- Pro: $20/month (if needed)
- **Recommendation**: Free tier should be sufficient initially

### Supabase (Database)
- Free tier: 500MB database, 2GB bandwidth
- Pro: $25/month
- **Recommendation**: Free tier for development, Pro for production

### Upstash (Redis)
- Free tier: 10k commands/day
- Pay-as-you-go: $0.20 per 100k commands
- **Recommendation**: Free tier should be sufficient initially

## Security Considerations

### Environment Variables
- Never commit secrets to git
- Use deployment service secrets management
- Rotate keys regularly
- Use different keys for staging/production

### Bot Permissions
- Use minimum required permissions
- Don't grant Administrator unless necessary
- Regularly audit bot permissions

### API Security
- Rate limit API endpoints
- Validate all inputs
- Use HTTPS only
- Implement CORS properly

## Files to Create

### GitHub Actions
- `.github/workflows/discord-bot.yml` - Discord bot CI/CD
- `.github/workflows/web-app.yml` - Web app CI/CD

### Deployment Configs
- `vercel.json` - Vercel configuration
- `railway.json` or `railway.toml` - Railway config (if using)
- `render.yaml` - Render config (if using)
- `packages/discord-bot/fly.toml` - Fly.io config (if using)
- `packages/discord-bot/Dockerfile` - Docker image (if using)
- `packages/discord-bot/ecosystem.config.js` - PM2 config (if using VPS)

## Next Steps

1. Set up GitHub Actions workflows
2. Configure Vercel for web app
3. Choose Discord bot hosting service
4. Set up environment variables
5. Deploy to staging
6. Test thoroughly
7. Deploy to production
8. Set up monitoring and alerts
