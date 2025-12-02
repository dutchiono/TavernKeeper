# Frontend Designer Guide - What You Need To Do

## Your Mission

Build the complete UI/UX for InnKeeper. The backend API is ready, the database is set up, and the game engine works. **You need to create the user-facing interface.**

## 🚨 IMPORTANT: Read Engine Updates First!

**Before you start building, read: [`engine-updates-frontend.md`](./engine-updates-frontend.md)**

The game engine has been significantly updated with:
- ✅ Two hand-crafted maps (`abandoned-cellar`, `goblin-warren`)
- ✅ Full agent integration (ElizaOS)
- ✅ Spatial system (rooms, transitions, movement validation)
- ✅ Objective tracking (win/loss conditions)
- ✅ Async `simulateRun` function

**Key changes you need to know:**
- `simulateRun` is now **async** - must use `await`
- New parameters: `mapId`, `agentIds`
- Entities have `roomId` and `inventory` properties
- New event types: `enter_room`, `exit_room`, `narrative`
- Maps can be loaded with `loadMap(mapId)` from `@innkeeper/engine`

## Critical: What You MUST Build

### 1. Home Page (`/`) - **PRIORITY 1**

**File**: `apps/web/app/page.tsx`

**What Exists**: Basic layout with empty PixiJS canvas placeholder

**What You Must Build**:
- **Inn Hub Interface**: The main landing page where players interact
- **Character Display**: Show available characters/agents in the inn
- **Start Run Button**: Button to create a new dungeon run
- **Recent Runs List**: Display last 5-10 completed runs with status
- **Agent Status Indicators**: Visual indicators showing agent readiness/status
- **PixiJS Inn Scene**: Replace placeholder with actual 8-bit inn rendering

**API to Use**:
- `POST /api/runs` - Create a new run (requires `dungeonId`, `party` array, optional `seed`)
- `GET /api/runs/[id]` - Get run details
- Fetch agents from Supabase: `supabase.from('agents').select('*')`
- Fetch characters from Supabase: `supabase.from('characters').select('*')`

**PixiJS Component**: `apps/web/components/PixiInn.tsx`
- Currently shows placeholder brown rectangle
- You need to:
  1. Load spritesheets (create or use placeholder sprites)
  2. Render inn interior (tables, bar, characters)
  3. Animate character idle states
  4. Handle clicks on characters/agents
  5. Show visual feedback for interactions

**Data Flow**:
```typescript
// Fetch data on page load
const agents = await fetch('/api/agents').then(r => r.json());
const recentRuns = await fetch('/api/runs?limit=10').then(r => r.json());

// Create run
const response = await fetch('/api/runs', {
  method: 'POST',
  body: JSON.stringify({ dungeonId, party: [char1, char2], seed: 'optional' })
});
```

---

### 2. Party Manager (`/party`) - **PRIORITY 2**

**File**: `apps/web/app/party/page.tsx`

**What Exists**: Empty placeholder page

**What You Must Build**:
- **Character Grid/List**: Display all available characters
- **Character Cards**: Show character stats, inventory, agent info
- **Equipment Management**: UI to equip/unequip items
- **Personality Sliders**:
  - Aggression (0-1)
  - Caution (0-1)
  - Other persona traits
- **Party Presets**: Save/load party configurations
- **Create Character Button**: Form to create new characters
- **Character Stats Display**: Visual representation of stats (HP, AC, STR, DEX, etc.)

**API to Use**:
- `GET /api/agents/[id]` - Get agent details
- `POST /api/agents/[id]/converse` - Update agent persona/memory
- Direct Supabase queries for characters:
  ```typescript
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('agent_id', agentId);
  ```

**Key Features**:
- Drag-and-drop character selection
- Real-time persona updates as sliders change
- Visual stat bars/charts
- Equipment slots (weapon, armor, items)

---

### 3. Map Room (`/map`) - **PRIORITY 3**

**File**: `apps/web/app/map/page.tsx`

**What Exists**: Empty placeholder page

**What You Must Build**:
- **Dungeon Map Visualization**: Tile-based map rendering
- **Room Display**: Show rooms, connections, explored areas
- **Replay Controls**:
  - Play/Pause button
  - Step forward/backward
  - Speed control (1x, 2x, 4x)
  - Jump to event
- **Entity Positions**: Show where characters/monsters are
- **Movement Trails**: Visual path of entity movement
- **Room Details Panel**: Info about current room
- **Legend/Controls**: Explain map symbols and controls

**API to Use**:
- `GET /api/dungeons/[id]/map` - Get dungeon map data
- `GET /api/runs/[id]` - Get run with events for replay

**Data Structure**:
```typescript
// Dungeon map
{
  id: string;
  seed: string;
  map: {
    rooms: Array<{ id, x, y, type, connections }>;
    tiles: Array<Array<number>>;
  }
}

// Run events for replay
{
  events: Array<{
    type: string;
    timestamp: string;
    payload: { position, action, result };
  }>
}
```

**Visualization**:
- Use PixiJS or Canvas API for tile rendering
- Each room = colored rectangle
- Connections = lines between rooms
- Entities = sprites that move
- Timeline scrubber for replay

---

### 4. Run Detail Page (`/run/[id]`) - **PRIORITY 4**

**File**: `apps/web/app/run/[id]/page.tsx`

**What Exists**: Basic page showing run ID

**What You Must Build**:
- **Run Status Header**: Show run status (queued, running, completed, error)
- **Result Display**: Victory/defeat/abandoned with summary stats
- **Event Log Timeline**:
  - Scrollable list of all events
  - Filterable by event type
  - Searchable
  - Expandable event details
- **Replay Visualization**: Animated replay of the run
- **Agent Memory Updates**: Show how agent memory changed during run
- **Statistics Panel**:
  - Total turns
  - Damage dealt/taken
  - Items found
  - Monsters defeated
- **Export/Share**: Button to share run results

**API to Use**:
- `GET /api/runs/[id]` - Returns full run with logs and events

**Data Structure**:
```typescript
{
  id: string;
  dungeon_id: string;
  party: string[];
  start_time: string;
  end_time: string | null;
  result: 'victory' | 'defeat' | 'abandoned' | 'error' | null;
  runLogs: Array<{ text: string; timestamp: string }>;
  events: Array<{ type: string; payload: object; timestamp: string }>;
  dungeon: { id, seed, map };
}
```

**UI Components Needed**:
- Event log component (virtualized for performance)
- Replay player component
- Stats cards/charts
- Timeline scrubber

---

### 5. Farcaster Miniapp (`/miniapp`) - **PRIORITY 5**

**File**: `apps/web/app/miniapp/page.tsx`

**What Exists**: Empty placeholder page

**What You Must Build**:
- **Compact Layout**: Optimized for iFrame (max width ~600px)
- **Quick Actions**: Large, touch-friendly buttons
- **Agent Status**: Compact agent cards showing status
- **Frame Navigation**: Buttons to navigate between frames
- **Mobile-First**: Must work on small screens
- **Minimal UI**: Frames have limited space, keep it simple

**API to Use**:
- `GET /api/frames/scene.png` - Get frame image
- `POST /api/frames/action` - Handle frame button clicks
- `POST /api/frames/validate` - Validate Farcaster signatures

**Design Constraints**:
- Max width: 600px
- Touch targets: minimum 44x44px
- Fast loading (< 2s)
- Works in iFrame
- No horizontal scroll

---

## Technical Requirements

### State Management
- Use Zustand for client state
- Create stores in `apps/web/lib/stores/`
- Example: `useGameStore`, `usePartyStore`, `useRunStore`

### API Integration
- All API calls use `fetch()`
- Handle loading states
- Handle error states
- Show user-friendly error messages

### Styling
- Use Tailwind CSS (already configured)
- Use pixel font: `font-pixel` class
- Colors: `inn-brown`, `inn-gold`, `inn-dark`
- Responsive: mobile-first approach

### PixiJS
- Client-only components (`'use client'`)
- Dynamic imports to avoid SSR issues
- Pixel-perfect rendering (antialias: false)
- Load sprites from `/public/sprites/` or MinIO

### Performance
- Virtualize long lists (react-window or similar)
- Lazy load images
- Debounce API calls
- Cache API responses where appropriate

---

## Testing Requirements

**You MUST test**:
1. All pages load without errors
2. All API calls work correctly
3. Forms validate input
4. Error states display properly
5. Loading states show during API calls
6. Responsive design works on mobile/tablet/desktop
7. PixiJS renders correctly in different browsers
8. No console errors

---

## Getting Started

1. **Start dev server**: `pnpm dev`
2. **Open**: http://localhost:3000
3. **Check API**: Test endpoints in browser or Postman
4. **Read API routes**: Check `apps/web/app/api/` to understand available endpoints
5. **Start with Home Page**: Build the inn hub first
6. **Iterate**: Build one page at a time, test thoroughly

---

## Available API Endpoints

### Runs
- `POST /api/runs` - Create new run
  - Body: `{ dungeonId: string, party: string[], seed?: string }`
  - Returns: `{ id: string, status: 'queued' }`

- `GET /api/runs/[id]` - Get run details
  - Returns: Full run object with logs, events, dungeon

### Agents
- `POST /api/agents/[id]/converse` - Update agent persona/memory
  - Body: `{ message?: string, persona?: object, memory?: object }`
  - Returns: `{ agentId: string, response: string }`

- `POST /api/agents/[id]/action` - Execute agent action
  - Body: `{ action: { type: string, ... } }`
  - Returns: `{ success: boolean, events: array }`

### Dungeons
- `GET /api/dungeons/[id]/map` - Get dungeon map
  - Returns: `{ id: string, seed: string, map: object }`

### Frames
- `GET /api/frames/scene.png` - Get frame image
- `POST /api/frames/action` - Handle frame action
- `POST /api/frames/validate` - Validate Farcaster signature

---

## Direct Database Access (If Needed)

You can also query Supabase directly from client components:

```typescript
import { supabase } from '@/lib/supabase';

// Get all agents
const { data: agents } = await supabase
  .from('agents')
  .select('*');

// Get characters for an agent
const { data: characters } = await supabase
  .from('characters')
  .select('*')
  .eq('agent_id', agentId);
```

**Note**: Make sure RLS policies allow these queries, or use API routes instead.

---

## Design Assets

- **Sprites**: Place in `apps/web/public/sprites/`
- **Fonts**: "Press Start 2P" already configured
- **Colors**: Defined in Tailwind config
- **Icons**: Use pixel-style icons or create your own

---

## Testing & Ensuring Playability

### Critical: Keep Tests Running

**ALWAYS run tests in watch mode while developing:**

```bash
# In one terminal - unit tests
pnpm test:watch

# In another terminal - E2E tests (ensures game is playable)
pnpm test:e2e:watch

# Or both together
pnpm test:watch:all
```

**Why?** Tests ensure:
- Your code doesn't break existing features
- The game is actually playable
- API integrations work
- Mobile experience works
- No console errors

### Playwright E2E Tests

Playwright tests run in a real browser and verify the game is playable:

- ✅ Pages load without errors
- ✅ Navigation works
- ✅ Mobile experience is functional
- ✅ PixiJS canvas renders
- ✅ API calls work
- ✅ User can complete flows

**Run E2E tests:**
```bash
# Watch mode (recommended)
pnpm test:e2e:watch

# See browser (debugging)
pnpm test:e2e:headed

# Interactive UI
pnpm test:e2e:ui
```

**View results:** Terminal shows pass/fail in real-time. HTML report available at `playwright-report/index.html`.

### Testing Workflow

1. **Start watch mode** before coding
2. **Write code** - tests rerun automatically
3. **Fix red tests** - don't commit with failures
4. **All green?** Safe to commit!

### What to Test

**Every feature you add should:**
- Have unit tests (if it's logic/API)
- Have E2E tests (if it's UI/user-facing)
- Pass in watch mode
- Work on mobile
- Not break existing tests

**See `apps/web/TESTING.md` for detailed testing guide.**

## Questions?

- Check API route handlers in `apps/web/app/api/`
- Review Supabase schema in `supabase/migrations/`
- Check main README for project overview
- Review architecture docs in `/arc`
- See `apps/web/TESTING.md` for testing details

---

## Success Criteria

Your work is complete when:
- ✅ All 5 pages are fully functional
- ✅ All API endpoints are integrated
- ✅ UI is responsive and works on all devices
- ✅ No console errors
- ✅ Loading and error states handled
- ✅ PixiJS rendering works smoothly
- ✅ User can create runs, view results, manage party
- ✅ **All tests pass** (unit + E2E)
- ✅ **Game is playable** (verified by E2E tests)
- ✅ **Watch mode shows all green** ✅

**Start with the Home Page and work your way through. Keep tests running!** 🎮
