# API Keys Configuration Guide

## Overview

This guide explains where and how to add API keys for InnKeeper services.

## Environment Files

### Development

Create `apps/web/.env` (this file is gitignored):

```env
# Database - Get from Neon (https://neon.tech) or Supabase (https://supabase.com)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis - Get from Upstash (https://upstash.com)
REDIS_URL=redis://default:password@host:port

# Storage (Optional for development)
# Use Cloudflare R2 or AWS S3
MINIO_ENDPOINT=https://your-account.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=innkeeper

# NextAuth
NEXTAUTH_SECRET=generate-a-random-string-here
NEXTAUTH_URL=http://localhost:3000

# ElizaOS
ELIZA_URL=http://localhost:3001
ELIZA_API_KEY=your-eliza-api-key-here

# Farcaster
FARCASTER_SIGNER_KEY=your-farcaster-signer-key-here

# App
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Required API Keys

### 1. ElizaOS API Key

**Purpose**: Authenticate with ElizaOS service for AI agents

**Where to Get**:
- If using hosted ElizaOS: Get from your ElizaOS provider
- If self-hosting: Configure in your ElizaOS instance

**Where to Add**:
- `apps/web/.env`: `ELIZA_API_KEY=your-key-here`

**Usage**: Used in `packages/agents/src/agent-wrapper.ts` and plugins

### 2. Farcaster Signer Key

**Purpose**: Sign and verify Farcaster frame interactions

**Where to Get**:
- Farcaster developer portal
- Generate using Farcaster SDK

**Where to Add**:
- `apps/web/.env`: `FARCASTER_SIGNER_KEY=your-key-here`

**Usage**: Used in `apps/web/app/api/frames/validate/route.ts`

### 3. NextAuth Secret

**Purpose**: Signing and encryption for NextAuth sessions

**How to Generate**:
```bash
openssl rand -base64 32
```

**Where to Add**:
- `apps/web/.env`: `NEXTAUTH_SECRET=generated-secret-here`

**Usage**: Used by NextAuth for session management

### 4. Pricing Signer Private Key

**Purpose**: Sign price signatures for TavernKeeper and Adventurer mints

**How to Generate**:
1. Create a new Ethereum wallet (use MetaMask, Hardhat, or any wallet generator)
2. Export the private key
3. Derive the public address from the private key

**Where to Add**:
- `apps/web/.env`: `PRICING_SIGNER_PRIVATE_KEY=0x...` (backend only, server-side)
- `apps/web/.env`: `NEXT_PUBLIC_PRICING_SIGNER_ADDRESS=0x...` (public address, can be in frontend)

**Usage**: Used in `apps/web/app/api/pricing/sign/route.ts` to sign price signatures

**Security**:
- **NEVER** expose the private key in frontend code
- Store in server-side environment variables only
- Use a dedicated wallet (not the deployer wallet)
- The signer address must be set on contracts after deployment/upgrade

**Important**: After deploying or upgrading contracts, you MUST call `setSigner(signerAddress)` on both TavernKeeper and Adventurer contracts, or minting will fail.

### 5. Database URL

**Purpose**: PostgreSQL connection string

**Format**:
```
postgresql://username:password@host:port/database
```

**Where to Add**:
- `apps/web/.env`: `DATABASE_URL=postgresql://...`

**Cloud Services**: Get connection string from [Neon](https://neon.tech) or [Supabase](https://supabase.com)

### 6. Redis URL

**Purpose**: Redis connection for BullMQ job queue

**Where to Get**:

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

**Format**:
```
# Upstash
REDIS_URL=redis://default:YOUR_TOKEN@YOUR_HOST:PORT

# Redis Labs
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:PORT
```

**Where to Add**:
- `apps/web/.env`: `REDIS_URL=redis://default:PASSWORD@HOST:PORT`

**Important**: Use the Redis URL for direct connections (needed for ioredis/BullMQ), not REST API endpoints.

### 7. MinIO Credentials

**Purpose**: Object storage for sprites, replays, images

**Where to Add**:
- `apps/web/.env`:
  - `MINIO_ENDPOINT=https://your-account.r2.cloudflarestorage.com`
  - `MINIO_ACCESS_KEY=your-access-key`
  - `MINIO_SECRET_KEY=your-secret-key`

**Cloud Services**: Use Cloudflare R2 or AWS S3

## Production Configuration

For production, set these in your hosting platform's environment variables:

- **Vercel**: Project Settings → Environment Variables
- **Railway**: Variables tab
- **Other platforms**: Use their environment variable configuration

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different keys for dev/staging/prod**
3. **Rotate keys regularly**
4. **Use secrets management** (e.g., Vercel Secrets, AWS Secrets Manager)
5. **Limit API key permissions** when possible

## Verification

After adding keys, verify they're loaded:

```typescript
// In any server-side code
console.log('Eliza URL:', process.env.ELIZA_URL);
console.log('Eliza API Key set:', !!process.env.ELIZA_API_KEY);
```

## Troubleshooting

**Keys not loading?**
- Restart dev server after adding to `.env`
- Check file is in correct location (`apps/web/.env`)
- Verify no typos in variable names

**API calls failing?**
- Verify keys are correct
- Check service URLs are accessible
- Review API documentation for required format

**Production issues?**
- Verify environment variables are set in hosting platform
- Check logs for "undefined" values
- Ensure all required keys are present

## Quick Setup Checklist

- [ ] Create `apps/web/.env`
- [ ] Set up PostgreSQL database (Neon or Supabase) and add `DATABASE_URL`
- [ ] Set up Redis database (Upstash) and add `REDIS_URL`
- [ ] Add `ELIZA_URL` and `ELIZA_API_KEY`
- [ ] Generate and add `NEXTAUTH_SECRET`
- [ ] Add `FARCASTER_SIGNER_KEY` (if using Farcaster)
- [ ] Generate pricing signer wallet and add `PRICING_SIGNER_PRIVATE_KEY` and `NEXT_PUBLIC_PRICING_SIGNER_ADDRESS`
- [ ] Add storage credentials (Cloudflare R2 or AWS S3) if needed
- [ ] Restart dev server
- [ ] Verify keys are loaded (check logs)

## Next Steps

1. Add all required API keys
2. Test ElizaOS connection
3. Test database connection
4. Test Redis connection
5. Verify all services are accessible

