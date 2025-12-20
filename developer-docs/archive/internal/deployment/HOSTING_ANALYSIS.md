# InnKeeper Hosting Analysis & Deployment Guide

## 📋 Project Overview

InnKeeper is a Next.js-based dungeon crawler game with:
- **Next.js 16** (App Router) frontend
- **Next.js API routes** (backend)
- **BullMQ workers** (long-running processes)
- **ElizaOS agent integration** (external service)
- **PostgreSQL database** (Supabase)
- **Redis queue** (BullMQ)
- **Monorepo structure** (pnpm workspaces)

---

## 🏗️ Backend Components Breakdown

### 1. Next.js API Routes ✅ (Serverless/Edge Compatible)
- **Location**: `apps/web/app/api/`
- **20+ API endpoints** including:
  - `/api/runs` - Game run management
  - `/api/agents/[id]/converse` - Agent conversations
  - `/api/parties/*` - Party management
  - `/api/marketplace/*` - Marketplace operations
  - `/api/frames/*` - Farcaster frame endpoints
- **Status**: ✅ **Vercel-compatible** (serverless functions)

### 2. BullMQ Workers ❌ (Long-Running Processes)
- **Location**: `apps/web/workers/`
- **Two worker types**:
  - `runWorker.ts` - Processes game simulations (concurrency: 5)
  - `replayWorker.ts` - Generates replay videos/GIFs (concurrency: 2)
- **Requirements**:
  - Long-running Node.js process
  - Persistent connection to Redis
  - Can process jobs for hours
- **Status**: ❌ **NOT compatible with Vercel serverless**

### 3. External Services
- **Supabase (PostgreSQL)** - ✅ Cloud-hosted
- **Redis (Upstash/Redis Labs)** - ✅ Cloud-hosted
- **ElizaOS** - External service (needs hosting)
- **Optional**: S3/R2 for storage

---

## ❓ Can You Use Vercel?

### **Partial Answer: Yes, but with limitations**

#### ✅ What Works on Vercel:
- Next.js frontend
- Next.js API routes (serverless functions)
- Edge functions
- Automatic deployments
- Built-in CDN

#### ❌ What Doesn't Work on Vercel:
- BullMQ workers (require long-running processes)
- Background job processing
- Persistent connections

---

## 🚀 Recommended Hosting Strategy

### **Option 1: Hybrid Approach (RECOMMENDED)**

**Vercel for Next.js + Separate Worker Hosting**

1. **Vercel**:
   - Deploy Next.js app (`apps/web`)
   - Hosts all API routes
   - Handles frontend

2. **Worker Hosting** (choose one):
   - **Railway** (Recommended)
     - Deploy workers as separate service
     - Supports long-running processes
     - Easy Redis connection
     - ~$5-20/month
   - **Render**
     - Background workers
     - Free tier available
     - ~$7-25/month
   - **Fly.io**
     - Good for workers
     - Global deployment
     - ~$5-15/month
   - **DigitalOcean App Platform**
     - Worker services
     - ~$5-12/month

**Architecture:**
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │─────▶│   Railway    │─────▶│   Redis     │
│  (Next.js)  │      │  (Workers)   │      │  (Upstash)  │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │
      └──────────────────────┘
              │
      ┌───────▼────────┐
      │   Supabase     │
      │  (PostgreSQL)  │
      └────────────────┘
```

**Setup Steps:**
1. Deploy Next.js to Vercel
2. Create worker service on Railway/Render
3. Set environment variables in both
4. Workers connect to same Redis instance

---

### **Option 2: Full Platform (Alternative)**

**Railway/Render for Everything**

Deploy both Next.js and workers on the same platform:

**Railway:**
- Deploy Next.js as web service
- Deploy workers as separate service
- Both in same project
- Shared environment variables
- ~$10-30/month total

**Render:**
- Next.js as web service
- Workers as background workers
- ~$7-25/month total

**Pros:**
- Single platform
- Easier management
- Shared infrastructure

**Cons:**
- Less optimized than Vercel for Next.js
- May be slower for static assets

---

### **Option 3: Vercel + Vercel Cron (NOT RECOMMENDED)**

**Using Vercel Cron Jobs**

Vercel has cron jobs, but:
- ❌ 10-second execution limit (free tier)
- ❌ 5-minute execution limit (pro tier)
- ❌ Not suitable for long-running simulations
- ❌ No persistent connections

**Verdict:** Not viable for this use case.

---

## 📦 Detailed Component Requirements

### **Next.js App (Vercel)**
- **Build command**: `pnpm build` (from root)
- **Output directory**: `apps/web/.next`
- **Install command**: `pnpm install`
- **Node version**: 18+
- **Environment variables**: 20+ required (see `.env.example`)

### **Workers (Separate Hosting)**
- **Entry point**: `apps/web/workers/index.ts`
- **Command**: `tsx workers/index.ts` or `node dist/workers/index.js`
- **Runtime**: Node.js 18+
- **Requirements**:
  - Persistent process (no timeouts)
  - Redis connection
  - Database access
  - ElizaOS API access

---

## 🔐 Environment Variables Needed

### **For Vercel (Next.js):**
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_API_KEY=...

# Redis (for queue connection in API routes)
REDIS_URL=...

# ElizaOS
ELIZA_URL=...
ELIZA_API_KEY=...

# Blockchain/Web3
NEXT_PUBLIC_MONAD_CHAIN_ID=...
NEXT_PUBLIC_MONAD_RPC_URL=...
# ... (many more - see .env.example)
```

### **For Workers (Railway/Render):**
```env
# Same as above, plus:
REDIS_URL=...  # Must match Vercel's Redis
SUPABASE_API_KEY=...
ELIZA_URL=...
ELIZA_API_KEY=...
```

---

## 💰 Cost Estimates

### **Option 1 (Hybrid - Recommended):**
- **Vercel**: Free (hobby) or $20/month (pro)
- **Railway (workers)**: $5-20/month
- **Upstash Redis**: Free tier or $10/month
- **Supabase**: Free tier or $25/month
- **Total**: $0-55/month

### **Option 2 (Full Platform):**
- **Railway**: $10-30/month (everything)
- **Upstash Redis**: Free tier or $10/month
- **Supabase**: Free tier or $25/month
- **Total**: $10-65/month

---

## 🚢 Deployment Checklist

### **Vercel Setup:**
1. ✅ Connect GitHub repo
2. ✅ Set root directory to `apps/web` (or configure build)
3. ✅ Add all environment variables
4. ✅ Configure build settings:
   - Build Command: `cd ../.. && pnpm build --filter @innkeeper/web`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

### **Worker Setup (Railway example):**
1. ✅ Create new service
2. ✅ Connect same GitHub repo
3. ✅ Set root directory to `apps/web`
4. ✅ Set start command: `pnpm start-worker`
5. ✅ Add environment variables
6. ✅ Ensure Redis connection works

---

## 🔧 Railway GitHub Integration

### **Yes! Railway supports GitHub integration with automatic deployments**

**Automatic Deployments:**
- Connect your GitHub repository
- Railway watches your branch (usually `main` or `master`)
- On every push, it automatically:
  - Pulls the latest code
  - Builds your application
  - Deploys the new version
- **Same workflow as Vercel!**

### **How to Set It Up:**

1. **Create a new project on Railway**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub

2. **Select your repository**
   - Choose `InnKeeper`
   - Railway will detect it's a monorepo

3. **Configure the service**
   - For Next.js: Railway may auto-detect, or you can configure manually
   - For Workers: Create a separate service from the same repo

4. **Set environment variables**
   - Add all your `.env` variables in Railway dashboard
   - Same variables as Vercel

5. **Deploy**
   - Railway builds and deploys automatically
   - Future pushes trigger automatic redeployments

### **Railway vs Vercel GitHub Integration:**

| Feature | Vercel | Railway |
|---------|--------|---------|
| GitHub Integration | ✅ Yes | ✅ Yes |
| Auto Deploy on Push | ✅ Yes | ✅ Yes |
| Branch Previews | ✅ Yes | ✅ Yes (with config) |
| Pull Request Deploys | ✅ Yes | ✅ Yes |
| Monorepo Support | ✅ Yes | ✅ Yes |
| Environment Variables | ✅ Yes | ✅ Yes |

### **Railway-Specific Features:**
- **Multiple services from one repo**: Deploy Next.js and workers as separate services
- **Shared environment variables** across services
- **Service dependencies**: Workers can wait for Next.js to be ready
- **Health checks** and auto-restart

### **Recommended Railway Setup:**

**Service 1: Next.js Web App**
- Source: GitHub repo
- Root Directory: `apps/web` (or configure build)
- Build Command: `pnpm build --filter @innkeeper/web`
- Start Command: `pnpm start` (or `next start`)

**Service 2: Workers**
- Source: Same GitHub repo
- Root Directory: `apps/web`
- Start Command: `pnpm start-worker`
- No build needed (runs TypeScript directly with `tsx`)

**Both services:**
- Auto-deploy on every push to `main`
- Share the same environment variables
- Connect to the same Redis/Supabase

### **Quick Railway Setup Steps:**

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `InnKeeper` repository
5. Railway will prompt you to create services
6. Create two services:
   - Web service (Next.js)
   - Worker service (background jobs)
7. Add environment variables to both
8. Deploy!

### **Pro Tip: Railway Templates**

Railway can detect:
- Next.js projects
- Node.js projects
- Monorepos

It will suggest configurations, which you can adjust.

---

## ⚠️ Potential Issues & Solutions

### **Issue 1: Monorepo Build**
**Problem:** Vercel needs to build workspace packages
**Solution:** Configure build command to build all packages:
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
```

### **Issue 2: Worker-Redis Connection**
**Problem:** Workers need persistent Redis connection
**Solution:** Use Upstash Redis (serverless-friendly) or ensure worker host allows persistent connections

### **Issue 3: ElizaOS Service**
**Problem:** ElizaOS needs to be hosted separately
**Solution:** Deploy ElizaOS to Railway/Render or use hosted service

---

## ✅ Final Recommendation

### **Use Option 1 (Hybrid):**
1. Deploy Next.js to **Vercel**
2. Deploy workers to **Railway**
3. Use **Upstash** for Redis
4. Use **Supabase** for PostgreSQL

### **Why:**
- ✅ Best performance for Next.js (Vercel)
- ✅ Proper worker hosting (Railway)
- ✅ Cost-effective
- ✅ Scalable
- ✅ Industry standard approach

---

## 📝 Next Steps

1. **Set up Vercel deployment**
   - Connect GitHub repo
   - Configure build settings
   - Add environment variables

2. **Set up Railway worker service**
   - Connect same GitHub repo
   - Create worker service
   - Add environment variables

3. **Configure environment variables**
   - Copy from `.env.example`
   - Set in both Vercel and Railway

4. **Test end-to-end flow**
   - Create a test run
   - Verify workers process jobs
   - Check Redis connection

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Upstash Redis](https://upstash.com)
- [Supabase Documentation](https://supabase.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io)

---

## 🔄 Deployment Workflow

### **Development:**
```bash
# Local development
pnpm dev                    # Starts Next.js
cd apps/web && pnpm start-worker  # Starts workers
```

### **Production:**
1. **Push to GitHub** → Triggers automatic deployment
2. **Vercel** builds and deploys Next.js
3. **Railway** deploys workers (if changed)
4. Both services connect to same Redis/Supabase

---

## 🎯 Summary

**Can you use Vercel?** Yes, but you need a separate service for workers.

**Best approach:** Vercel (Next.js) + Railway (Workers)

**GitHub integration:** Both Vercel and Railway support automatic deployments from GitHub.

**Cost:** ~$0-55/month depending on usage and tier.

**Complexity:** Medium - requires managing two services but both have excellent GitHub integration.
