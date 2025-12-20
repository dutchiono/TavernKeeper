# Frontend Spec — InnKeeper (Next.js)

## Goals

* Pixel/8‑bit inn UI inside Next.js app
* PixiJS client component for sprite/tile rendering
* App Router (`/app`) with server/client components separation
* Fast refresh and optimized production builds

## Stack

* Next.js (App Router)
* React 18+ (Server & Client Components)
* Tailwind CSS
* PixiJS (client-only) for canvas and map rendering
* Zustand for client state
* Socket.io (or WebSocket) for realtime run updates

## Key Pages / Routes

* `/` Inn hub (server component with client Pixi overlay)
* `/party` Party manager (equip, presets, personality sliders)
* `/map` Map Room (tile map, replay controls)
* `/run/[id]` Run detail & replay
* `/miniapp/*` Farcaster frame-facing endpoints

## Pixi Integration (pattern)

* Use a dynamic client component: `use client` and lazy import `react-pixi`.
* Keep heavy logic in `packages/engine` and feed only renderable state to Pixi component.

### Example: Pixi client component (simplified)

```tsx
'use client'
import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'

export default function PixiInn({state}){
  const ref = useRef(null)
  useEffect(()=>{
    const app = new PIXI.Application({ width: 800, height: 600 })
    ref.current.appendChild(app.view)
    // load spritesheet, create stage
    return ()=> app.destroy(true)
  },[])
  return <div ref={ref} />
}
```

## Styling

* Tailwind for UI overlay and HUD
* Pixel-perfect fonts (Press Start 2P)
* CSS variables for palette

## Realtime

* When server runs simulation, it pushes events via WebSocket with structured events.
* Client consumes and animates the run. If run is complete, display textual recap and updates.

## Accessibility & Performance

* Use `next/image` for static images (not canvas scenes)
* Keep Pixi canvas off main SSR path (client component only)

---

If this looks good I will create `backend-spec.md` next (API routes, Prisma schema, worker patterns).
