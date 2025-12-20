ot you — here is a complete, extremely clear, implementation-ready description of the 8-bit InnKeeper frontend, written so your AI studio / IDE can generate a working version on first attempt.

I’m going to describe it from the top down:

visual style

pages

components

animation system

asset strategy

event loop

how it talks to agents and dungeon engine

recommended libraries

folder structure

This is everything the frontend team/AI needs.

🎨 VISUAL + UX STYLE (8-bit Inn Aesthetic)
Overall Theme

NES/SNES-era pixel art

Limited color palette (e.g., Dawnbringer 16 or 32-color palette)

Tile-based environments (16×16 or 32×32 tiles)

Characters are sprites with 2–4 frame idle animations

Everything is slightly “cozy tavern fantasy” — wood, candles, banners, scrolls

UI is chunky pixel UI: beveled panels, pixel fonts, simple 1px borders

Example Inspiration

Shovel Knight UI (clean pixel UI)

Stardew Valley interior scenes

Final Fantasy 1 inn interior

Octopath Traveler low-res taverns (but less lighting complexity)

Loop Hero UI boxes

Your frontend should emulate that simplicity.

🖼 CORE PAGES (ALL IN NEXT.JS)
1. /inn — Main Scene

Your default view when launching InnKeeper.

Layout:

Background: interior tavern (room with tables, fireplace, innkeeper desk).

3–6 characters (“party”) standing or sitting around room.

Each character is an AI agent with:

idle animation

speech bubble with current thought

clicking opens the “Agent Detail Panel"

UI Regions:

Top-left: Pixel logo “InnKeeper”

Bottom-left: Party Roster Panel

Bottom-right: Actions Panel (enter dungeon, rest, manage loadout)

Top-right: Gold / Inventory

Animations:

soft looping idle animations (2–4 frames)

ambient room effects (fireplace flicker, candle glow)

walking path for the innkeeper if needed

2. /map — World / Dungeon Map Room

This is on a separate page, “in the same inn,” like walking upstairs.

Layout:

Background: map room with a giant scroll on a table

The “scroll” is the interactive map viewer

Pixel icons for:

discovered rooms

monsters

hazards

treasure

Additional UI:

Turn log (pixel box)

Current party stats

Button: “Send Party In” → triggers agent loop

3. /agent/[id] — Agent Detail Panel

Click on an agent in the inn to open.

Shows:

large sprite frame

name, class, level, HP, stats

inventory / gear slots

personality traits

their last 5 decisions

“Talk to Agent” text box

“Give Order” buttons

Uses the Eliza-style loop internally.

4. /battle — Encounter Screen

Retro JRPG battle layout:

Left side: party sprites

Right side: enemy sprites

Bottom box: battle log (pixel font)

Animations are:

hit flashes

small motion jitters

item use effects

Party actions are chosen by Agents, not the user.

User may only:

nudge strategy (“Be cautious”, “Go all-out”)

retreat

use items maybe

🎮 FRONTEND ENGINE (Next.js + PIXI.JS)
WHY PIXI.JS?

Pixi is perfect for:

tilemaps

sprite animation

scene compositing

2D 8-bit rendering

high performance on web

Use a client component for the scene:

/components/pixi/InnScene.tsx
/components/pixi/MapScene.tsx
/components/pixi/BattleScene.tsx


Each scene manages:

tilemap background

interactive sprites

animation tick

click hitboxes

🧩 COMPONENT LIST
UI Components (Pixel UI)

<PixelButton>

<PixelPanel>

<InventoryGrid>

<SpeechBubble>

<AgentPortrait>

<MiniMap>

<PartyRoster>

<BattleLog>

Designed using:

CSS pixelated image-rendering

Pixel fonts (Press Start 2P, PixelOperator)

1–2px outlines

Pixi Components

TilemapRenderer

AnimatedSprite

SpriteButton

SceneTransition (fade, wipe)

🔄 FRONTEND GAME LOOP

Agents decide everything, but the frontend displays it.

Ticks:

60fps animation tick

API polling or websocket for state updates

Render new dialogue bubbles

Render movement or actions

Example loop:

Next.js frontend asks API: /api/party/state

API returns:

agent states

their positions

their intentions (speak, emote, idle, walk)

Pixi scene updates sprites

If any state has dialogue, render speech bubble

If action dispatched (enter dungeon), switch scenes

🧱 ASSET STRATEGY
Sprite sizes

Characters: 32×32 or 48×48

Tiles: 32×32

GUI icons: 16×16

File format

PNG spritesheets

JSON spritesheet atlas (from Aseprite export)

Directions

Character needs:

idle (2–4 frames)

walk (4 frames)

emote (single frame)

talk (2 frames)

Tools

Aseprite (BEST)

SpritePile for volume

Lospec palettes