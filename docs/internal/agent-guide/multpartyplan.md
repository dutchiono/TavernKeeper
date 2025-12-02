Multi-Player Party System Overhaul
Overview
This plan covers a major system overhaul to transform InnKeeper from a single-player game with mock heroes into a multi-player NFT-based game where:

Heroes are owned as NFTs (Adventurer contract)
Players can form parties with other Farcaster users
Parties can be solo, own-party, or mixed (with other players)
Shareable party invites work via deep links and URL params
Hero color customization is supported
All notifications come through the Farcaster miniapp
Architecture Changes
Current State
Adventurer NFT contract EXISTS - Deployed on Monad testnet at 0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2
Heroes stored in Zustand store (useGameStore from apps/web/lib/stores/gameStore.ts) with mock data (INITIAL_PARTY)
Heroes are NOT linked to NFTs - They're just mock data (Gromsh, Elara, Pip)
Party is just an array of character IDs in runs table
No NFT ownership verification or syncing
No multi-player party system
No shareable invites
No notification system
Contract only has safeMint (owner-only), no public minting or color support
Target State
Heroes linked to Adventurer NFT tokens (verify ownership, sync from chain)
Public minting function for users to create new hero NFTs
Parties stored in database with owner, members, status
Shareable party invites (deep links + URL params)
Real-time party updates via notifications
Hero color customization (add to contract metadata)
A/B testing infrastructure for gradual rollout
Key Design Decisions
Party Invite Mechanism: Both deep links (miniapp://party/abc123) and URL params (/miniapp?party=abc123)

Party Size: 5 heroes maximum (1 starter + 4 joiners) - can be adjusted

Sprite Colors: CSS filters initially (hue-rotate, saturation), with architecture for future palette swap upgrade

NFT Minting: Both - starter hero minted on first join, additional heroes on-demand

Notifications: All via Farcaster miniapp SDK (party invites, run completion, party updates)

Implementation Phases
Phase 1: Foundation (Database & Contracts)
Database schema migrations for parties, hero ownership, invites
Contract updates for hero metadata (color, traits)
NFT ownership verification system
Phase 2: Core Systems (Backend)
Party management API
Invite system (generation, validation, joining)
Hero ownership verification
Notification system integration
Phase 3: Frontend A/B Testing
Create parallel routes/pages for new system
Dev navigation for switching between versions
Gradual migration of features
Phase 4: Integration & Testing
End-to-end testing
Contract integration tests
Playwright tests for party flows
Notification delivery tests
Files to Create/Modify
Documentation Files
agent-guide/multiplayer-party-system.md - Full system design
agent-guide/sprite-color-system.md - Color customization approach
agent-guide/notification-system.md - Miniapp notification design
agent-guide/ab-testing-guide.md - A/B testing methodology
supabase/migrations/20240103000000_party_system.sql - Party tables
supabase/migrations/20240104000000_hero_ownership.sql - NFT linking
Contract Files
packages/contracts/contracts/Adventurer.sol - Add public minting function, color/trait metadata, updateColorPalette function
packages/contracts/test/AdventurerMetadata.test.ts - Tests for metadata structure, color updates, tokenURI
packages/contracts/test/PublicMinting.test.ts - Tests for public minting with metadata
Backend Files
apps/web/app/api/parties/route.ts - Party CRUD
`apps/web/app/api/parties/[id]/route.ts` - Party details
`apps/web/app/api/parties/[id]/invite/route.ts` - Invite generation
`apps/web/app/api/parties/[id]/join/route.ts` - Join party
`apps/web/app/api/parties/[id]/start/route.ts` - Start dungeon run
apps/web/app/api/heroes/route.ts - Hero ownership queries
apps/web/app/api/heroes/mint/route.ts - Mint new hero NFT
apps/web/app/api/heroes/sync/route.ts - Sync NFT ownership from chain
apps/web/app/api/notifications/route.ts - Notification management
apps/web/lib/services/partyService.ts - Party business logic
apps/web/lib/services/heroOwnership.ts - NFT verification and syncing from Adventurer contract
apps/web/lib/services/heroMinting.ts - Hero NFT minting service (generates metadata JSON, uploads to IPFS/server, mints NFT)
apps/web/lib/services/heroMetadata.ts - Fetch and parse tokenURI JSON, cache in database
apps/web/lib/services/spriteRenderer.ts - Apply color palette from metadata to sprites (CSS filters or palette swap)
apps/web/lib/services/notifications.ts - Notification delivery
apps/web/lib/services/metadataStorage.ts - Upload metadata JSON to IPFS or centralized storage, return URI
Frontend Files (A/B Testing)
apps/web/app/party-v2/page.tsx - New party page
apps/web/app/miniapp-v2/page.tsx - New miniapp with party invites
`apps/web/app/party-invite/[code]/page.tsx` - Invite landing page
apps/web/app/hero-builder/page.tsx - Hero builder UI (pre-mint customization)
apps/web/components/party/PartyManagerV2.tsx - New party manager
apps/web/components/party/PartyInviteCard.tsx - Invite sharing UI
apps/web/components/party/PartyMemberList.tsx - Member management
apps/web/components/heroes/HeroBuilder.tsx - Hero builder component (color picker, preview)
apps/web/components/heroes/HeroMintButton.tsx - Mint new hero NFT (with metadata)
apps/web/components/heroes/HeroOwnershipBadge.tsx - Show NFT ownership
apps/web/components/heroes/HeroSprite.tsx - Render hero sprite from NFT metadata
apps/web/lib/stores/partyStore.ts - Party state management (using Zustand, like gameStore)
apps/web/lib/stores/heroStore.ts - Hero ownership state (using Zustand, like gameStore)
apps/web/lib/services/heroMetadata.ts - Parse and cache NFT metadata from tokenURI
apps/web/lib/services/spriteRenderer.ts - Apply colors from metadata to sprites
apps/web/components/dev/DevNav.tsx - Dev navigation switcher
Test Files
apps/web/__tests__/api/parties.test.ts
apps/web/__tests__/api/heroes.test.ts
apps/web/e2e/party-system.spec.ts
apps/web/e2e/party-invites.spec.ts
apps/web/e2e/hero-builder.spec.ts - Test hero builder UI and minting flow
apps/web/e2e/hero-metadata.spec.ts - Test metadata reading and sprite rendering
packages/contracts/test/AdventurerMetadata.test.ts
Database Schema Changes
New Tables
parties - Party instances with owner, status, dungeon_id
party_members - Many-to-many relationship (party_id, hero_id, user_id, joined_at)
party_invites - Invite codes with expiration, max_uses
hero_ownership - Links heroes to NFT tokens (hero_id, token_id, owner_address, chain_id)
notifications - Notification queue for miniapp delivery
Modified Tables
runs - Add party_id foreign key, change party from TEXT[] to reference party
characters - Add nft_token_id, nft_contract_address, metadata_cached (JSONB for parsed tokenURI), metadata_cached_at (timestamp)
users - Add farcaster_fid, wallet_address
Contract Updates
Adventurer.sol Changes
Add public minting function - mintHero(address to, string memory metadataUri) - allows users to mint their own heroes (with payment if needed)
metadataUri points to JSON file with hero metadata (name, class, colorPalette, etc.)
Add metadata update function - updateTokenURI(uint256 tokenId, string memory newUri) - allows owner to update metadata (for color changes)
Emit events for minting and metadata updates
Metadata Structure: tokenURI returns JSON with:
Standard ERC-721 metadata (name, description, image)
Custom hero object with:
class: Warrior/Mage/Rogue/Cleric
colorPalette: Object with color values (skin, hair, clothing, accent)
spriteSheet: Base spritesheet identifier
animationFrames: Frame indices for animations
Store metadata on IPFS or centralized server (JSON file)
Game reads tokenURI(tokenId) → fetches JSON → parses hero.colorPalette → applies to sprite
API Endpoints
Party Management
POST /api/parties - Create new party
GET /api/parties - List user's parties
`GET /api/parties/[id]` - Get party details
`PATCH /api/parties/[id]` - Update party (owner only)
`DELETE /api/parties/[id]` - Cancel party (owner only)
`POST /api/parties/[id]/invite` - Generate invite
`GET /api/parties/invite/[code]` - Validate invite code
`POST /api/parties/[id]/join` - Join party with hero
`POST /api/parties/[id]/leave` - Leave party
`POST /api/parties/[id]/start` - Start dungeon run
Hero Ownership
GET /api/heroes - List user's owned heroes (queries Adventurer contract for user's wallet, includes metadata)
`GET /api/heroes/[tokenId]` - Get hero by NFT token ID (reads from contract tokenURI + database cache)
`GET /api/heroes/[tokenId]/metadata` - Get parsed hero metadata (from tokenURI JSON)
POST /api/heroes/mint - Mint new hero NFT (calls Adventurer contract with metadata JSON)
POST /api/heroes/sync - Sync NFT ownership from chain (scan user's wallet for Adventurer NFTs, fetch metadata)
`PATCH /api/heroes/[tokenId]/color` - Update hero color (calls contract updateColorPalette, updates metadata)
POST /api/heroes/builder/preview - Generate preview metadata for hero builder (before minting)
Notifications
GET /api/notifications - Get user notifications
`POST /api/notifications/[id]/read` - Mark as read
POST /api/notifications/send - Send notification (internal)
Notification Types
party_invite - Someone invited you to a party
party_joined - Someone joined your party
party_left - Someone left your party
party_started - Party started a dungeon run
run_completed - Dungeon run finished
run_failed - Dungeon run failed/abandoned
A/B Testing Strategy
Parallel Implementation
Keep existing routes (/party, /miniapp) unchanged
Create new routes (/party-v2, /miniapp-v2) with new system
Dev navigation component to switch between versions
Feature flags in environment variables
Migration Path
Build v2 in parallel
Test v2 thoroughly
Switch dev nav to v2 by default
Get user feedback
Once stable, replace v1 with v2
Remove dev nav and cleanup
Dev Navigation Component
Toggle between v1/v2 routes
Show current version badge
Quick links to both versions
Only visible in development mode
Sprite System & Hero Builder
Current Sprite Structure
Individual PNG files: warrior_sitting.png, mage_sitting.png, rogue_sitting.png
Potential spritesheets: characters_combat.png, characters_sitting.png (need verification)
Currently using CSS hue-rotate() filter for color variation
Game design specifies: 32×32 or 48×48 characters, PNG spritesheets with JSON atlas
Hero Builder UI
Pre-Mint Customization: Users pick colors/appearance before minting NFT
Color Picker: Select colors for different sprite parts (skin, clothing, hair, etc.)
Preview: Live preview of hero with selected colors
Metadata Generation: Build JSON metadata with color palette before minting
Save to NFT: Store color palette in tokenURI JSON metadata
NFT Metadata Structure (tokenURI JSON)
{
  "name": "Gromsh the Warrior",
  "description": "A brave adventurer",
  "image": "https://innkeeper.com/sprites/warrior_base.png",
  "attributes": [
    { "trait_type": "Class", "value": "Warrior" },
    { "trait_type": "Level", "value": 1 }
  ],
  "hero": {
    "class": "Warrior",
    "colorPalette": {
      "skin": "#fdbcb4",
      "hair": "#8b4513",
      "clothing": "#ef4444",
      "accent": "#ffffff"
    },
    "spriteSheet": "warrior",
    "animationFrames": {
      "idle": [0, 1, 2, 3],
      "walk": [4, 5, 6, 7],
      "emote": [8],
      "talk": [9, 10]
    }
  }
}
In-Game Appearance from Metadata
Read tokenURI: Fetch JSON metadata from Adventurer contract
Parse colorPalette: Extract color values from metadata
Apply Colors: Use CSS filters or palette swap based on metadata
Sprite Selection: Load appropriate spritesheet based on class and animation state
Cache Metadata: Store parsed metadata in database for performance
Sprite Sheet Implementation
Option A: CSS Filters (Current) - Apply hue-rotate/saturation based on metadata colors
Option B: Palette Swap - Pre-generate colored variants, load based on palette ID
Option C: Runtime Generation - Generate colored sprites server-side from base + palette
Recommendation: Start with CSS filters, plan for palette swap upgrade
Testing Requirements
Unit Tests
Party service logic
Invite code generation/validation
Hero ownership verification
Notification delivery
Integration Tests
Party creation → invite → join → start run flow
NFT ownership sync from chain
Notification delivery via miniapp SDK
E2E Tests (Playwright)
Create party as user A
Share invite link
Join party as user B
Start dungeon run
Verify notifications received
Complete run and verify results
Contract Tests
Hero color update function
Metadata storage
Event emission
Security Considerations
Invite Validation: Expiration, max uses, owner verification
Party Ownership: Only owner can start runs, cancel party
Hero Ownership: Verify NFT ownership on-chain before allowing hero in party (call ownerOf(tokenId) on Adventurer contract)
Minting Security: Rate limiting on minting, payment verification if required, prevent spam
Rate Limiting: Prevent invite spam, party creation abuse
Notification Auth: Verify user identity before sending notifications
Color Updates: Only token owner can update color (enforced in contract)
Performance Considerations
NFT Ownership Caching: Cache ownership checks from Adventurer contract, refresh periodically (every 5-10 minutes)
Contract Calls: Batch multiple ownerOf calls, use multicall if available on Monad
Metadata Caching: Cache parsed tokenURI JSON in database (metadata_cached field), refresh on update events
Metadata Fetching: Fetch tokenURI JSON asynchronously, show placeholder while loading
Party State: Use Redis for real-time party updates
Notification Queue: Batch notifications, use BullMQ for delivery
Sprite Loading: Lazy load colored sprites, use CDN caching
Color Application: Cache CSS filter calculations, pre-compute for common palettes
IPFS/Storage: Use IPFS for metadata JSON (decentralized) or centralized server (faster, requires maintenance)
Migration Checklist
Pre-Migration
[ ] Backup database
[ ] Deploy contract updates to testnet
[ ] Test contract interactions
[ ] Set up notification infrastructure
Migration Steps
[ ] Run database migrations
[ ] Deploy backend API updates
[ ] Deploy frontend v2 (parallel to v1)
[ ] Enable dev navigation
[ ] Test all flows in v2
[ ] Monitor for issues
[ ] Gather user feedback
Post-Migration
[ ] Switch v2 to production
[ ] Remove v1 routes
[ ] Clean up dev navigation
[ ] Update documentation
[ ] Archive old code
Success Metrics
Party creation success rate > 95%
Invite join success rate > 90%
Notification delivery rate > 98%
Run completion with multi-player parties
Hero color customization usage
User satisfaction with party system
Risk Mitigation
NFT Sync Issues: Fallback to manual verification
Invite Abuse: Rate limiting, invite expiration
Party State Conflicts: Optimistic locking, conflict resolution
Notification Failures: Retry queue, fallback to in-app notifications
Performance Degradation: Caching, database indexing, query optimization
