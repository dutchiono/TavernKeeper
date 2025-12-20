# Farcaster Miniapp & Frames — Integration Guide

## Overview

This doc explains how to make InnKeeper work as a Farcaster Miniapp / Frame, including signed endpoints, dynamic image generation for frames, and recommended endpoints for Warpcast.

## Requirements

* Next.js Route Handlers for endpoints invoked by Frames
* Signed payload verification (Farcaster signature flow)
* Fast image generation for dynamic PNG frames (server route)

## Route Handler Examples

* `POST /api/frames/validate` — verify Farcaster signature
* `GET /api/frames/scene.png?agentId=...` — generate PNG snapshot of inn or agent status
* `POST /api/frames/action` — handle frame action events

## Dynamic image generation

* Use `@vercel/og` or server-side canvas to render 8-bit styled PNGs
* Alternatively, pre-render spritesheets and compose small scenes on-the-fly using `node-canvas` or headless Pixi on the server

## Miniapp UX considerations

* Frames should be minimal and fast. Provide a single-click flow that opens the InnKeeper miniapp.
* Use `iFrame` friendly pages and compress images.

## Security

* Validate JWTs and Farcaster signatures on every frame API call
* Rate-limit frame endpoints

## Example: server route generating scene (simplified)

```ts
import { NextResponse } from 'next/server'
export async function GET(request){
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  // fetch agent state, compose PNG using node-canvas or @vercel/og
  return NextResponse.json({ok:true})
}
```

---

All docs have now been split into the canvas. Tell me if you want the monorepo scaffold (I can emit a full `package.json`, `pnpm-workspace.yaml`, `next.config.js`, `prisma/schema.prisma`, and a minimal `app/` with an Inn page and a Pixi placeholder).
