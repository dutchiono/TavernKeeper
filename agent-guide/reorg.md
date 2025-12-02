Production Preparation and Codebase Organization Plan
Overview
This comprehensive plan addresses six major areas for production readiness:

Documentation Organization - Consolidate and organize 101+ markdown files into structured system
Code Organization - Clean up scattered files, improve structure, remove duplicates
Production Deployment - Prepare for Vercel/serverless deployment with proper CI/CD
Hybrid Backend Architecture - Local backend fallback system for development
Service Integration - Unify Discord bot, web app, workers, and ElizaOS
Route Reorganization - Landing page, /web, /miniapp, /docs structure
Context from Existing Documentation
Current State Analysis
Discord Bot: Fully implemented with concierge, verification, moderation (needs RAG + ElizaOS)
Production Deployment Guide: Exists in agent-guide/production-deployment.md
Unified Agent Architecture: Plan exists for ElizaOS unification
RAG Integration: Detailed guide exists for documentation-based knowledge
World History System: Needs implementation for DM event recording
Route Structure: Currently (web) and (miniapp) route groups
Workers: BullMQ workers need separate hosting (Railway/Render)
101+ Markdown Files: Scattered across repo in multiple directories
Phase 1: Documentation Organization
Current State
101+ markdown files scattered across the repo
Documentation in: agent-guide/, arc/, contributions/, packages/contracts/docs/, research/, root, apps/web/, inspiration/
Mix of public-facing, internal, and development docs
Target Structure
docs/
├── public/                    # Public-facing documentation
│   ├── getting-started.md
│   ├── game-mechanics.md
│   ├── contracts/
│   ├── api/
│   └── architecture/
├── internal/                  # Internal development docs
│   ├── agent-guide/           # Moved from agent-guide/
│   ├── contracts/             # Contract development docs
│   ├── deployment/             # Deployment guides
│   └── development/           # Dev setup, troubleshooting
├── archive/                   # Historical/obsolete docs
│   └── [dated folders]
└── README.md                  # Documentation index
Documentation Categories
Public Docs (for /docs website):

Getting started guides
Game mechanics
Contract documentation
Public API docs
Architecture overview
Internal Docs (not public):

Agent guides
Deployment instructions
Development setup
Contract development
Testing guides
Troubleshooting
Archive (keep but don't actively maintain):

Old implementation plans
Historical analysis
Superseded designs
Phase 2: Code Organization
Areas to Clean Up
Root Directory
Move deployment docs to docs/internal/deployment/
Consolidate setup guides
Keep only essential README files
apps/web/
Organize markdown files into docs/ subdirectory
Clean up test output files
Organize scripts
packages/contracts/
Consolidate documentation
Organize deployment scripts
Clean up checklist files
Scattered Configuration
Consolidate environment variable documentation
Create single source of truth for config
Phase 3: Production Deployment Preparation
Vercel Deployment Requirements
Next.js Configuration
Ensure next.config.js is production-ready
Configure build settings
Set up environment variables
Configure output settings for serverless
API Routes
Verify all routes are serverless-compatible
Check for long-running operations
Ensure proper error handling
Add timeout configurations
Environment Variables
Document all required variables
Create .env.example files
Set up Vercel environment variable templates
Separate public/private variables
Build Process
Optimize build output
Ensure monorepo builds correctly
Test production builds locally
Configure build caching
Worker Deployment (Separate Service)
Worker Service Setup
Create Dockerfile for workers
Set up Railway/Render deployment configs
Configure worker health checks
Set up logging and monitoring
Queue Configuration
Ensure Redis connection works from workers
Configure queue names and priorities
Set up retry logic
Configure job timeouts
Phase 4: Hybrid Backend Architecture
Goal
Allow local backend to act as fallback when running, enabling development from home while production runs on Vercel.

Architecture Design
┌─────────────────┐
│   Vercel        │
│   (Production)  │──┐
└─────────────────┘  │
                     ├──▶ Redis Queue (Upstash)
┌─────────────────┐  │
│   Local Dev      │──┘
│   (Fallback)     │
└─────────────────┘
Implementation Strategy
Backend Detection Service
Create service to detect if local backend is running
Health check endpoint on local backend
Automatic fallback logic
Configuration System
Environment variable: USE_LOCAL_BACKEND=true/false
Auto-detection: Check if local backend is reachable
Fallback chain: Vercel → Local → Error
API Route Modifications
Update API routes to check backend availability
Route requests to appropriate backend
Handle failures gracefully
Worker Coordination
Local workers can process jobs when running
Production workers handle when local is offline
Prevent duplicate processing
Components Needed
Backend Health Check
Endpoint: http://localhost:3001/health (or configurable)
Returns backend status and capabilities
Used by API routes to determine routing
Backend Router Service
Service that routes requests to appropriate backend
Handles fallback logic
Manages connection pooling
Worker Coordination
Local workers check if they should run
Production workers always run
Queue locking to prevent conflicts
Implementation Checklist Structure
The plan will be broken into multiple markdown files:

01-documentation-organization.md - Documentation cleanup checklist
02-code-organization.md - Code structure cleanup checklist
03-production-deployment.md - Vercel/serverless deployment checklist
04-hybrid-backend.md - Hybrid backend architecture checklist
05-master-checklist.md - Overall progress tracker
Each file will contain:

Detailed task breakdown
File-by-file migration steps
Testing requirements
Dependencies and prerequisites
Completion criteriaI am actually having someone do some reorganizing with the documents and adding features to the website