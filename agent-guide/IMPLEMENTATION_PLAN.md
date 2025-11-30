# Multi-Player Party System Implementation Plan

## Overview

Transform InnKeeper from single-player with mock heroes to multi-player NFT-based game where:
- Heroes are owned as NFTs (Adventurer contract already deployed)
- Players can form parties with other Farcaster users
- Parties can be solo, own-party, or mixed (with other players)
- Shareable party invites work via deep links and URL params
- Hero color customization via NFT metadata
- All notifications come through Farcaster miniapp

## Current State

- ✅ Adventurer NFT contract deployed on Monad testnet: `0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2`
- ❌ Heroes are NOT linked to NFTs (just mock data in `INITIAL_PARTY`)
- ❌ No multi-player party system
- ❌ No shareable invites
- ❌ No notification system
- ❌ Contract only has owner-only `safeMint`, no public minting

## Implementation Checklist

### Phase 1: Database & Contracts Foundation

#### Database Schema
- [x] Create migration: `supabase/migrations/20240103000000_party_system.sql`
  - [x] `parties` table (owner_id, dungeon_id, status, max_members, invite_code)
  - [x] `party_members` table (party_id, hero_token_id, hero_contract_address, user_id, user_wallet_address)
  - [x] `party_invites` table (party_id, code, created_by, expires_at, max_uses, current_uses)
  - [x] `hero_ownership` table (character_id, token_id, contract_address, owner_address, chain_id)
  - [x] `notifications` table (user_id, farcaster_fid, type, title, message, data, read, delivered)
  - [x] Modify `users` table (add farcaster_fid, wallet_address, wallet_chain_id)
  - [x] Modify `characters` table (add nft_token_id, nft_contract_address, metadata_cached, metadata_cached_at)
  - [x] Modify `runs` table (add party_id foreign key)
  - [x] Create all indexes
  - [x] Enable RLS and create policies

#### Contract Updates
- [ ] Update `Adventurer.sol`:
  - [ ] Add `publicMintingEnabled` bool
  - [ ] Add `mintHero(address to, string memory metadataUri)` public function
  - [ ] Add `updateTokenURI(uint256 tokenId, string memory newUri)` function
  - [ ] Add `setPublicMintingEnabled(bool enabled)` owner function
  - [ ] Add events: `HeroMinted`, `MetadataUpdated`, `PublicMintingToggled`
- [ ] Write contract tests:
  - [ ] `packages/contracts/test/AdventurerMetadata.test.ts` - metadata and public minting tests
  - [ ] `packages/contracts/test/PublicMinting.test.ts` - public minting workflow tests
- [ ] Compile contracts
- [ ] Run contract tests locally
- [ ] Deploy updated contract to testnet (or prepare upgrade)

### Phase 2: Backend Services

#### Hero Services
- [x] Create `apps/web/lib/services/heroOwnership.ts`:
  - [x] `verifyOwnership(tokenId, contractAddress, ownerAddress)` - verify on-chain
  - [x] `syncUserHeroes(walletAddress)` - scan wallet for Adventurer NFTs
  - [x] `getHeroMetadata(tokenId)` - fetch and parse tokenURI JSON
- [ ] Create `apps/web/lib/services/heroMinting.ts`:
  - [ ] `generateMetadata(heroData)` - build JSON metadata with color palette
  - [ ] `uploadMetadata(metadata)` - upload to IPFS or server, return URI
  - [ ] `mintHero(walletAddress, metadataUri)` - call contract mintHero
- [x] Create `apps/web/lib/services/heroMetadata.ts`:
  - [x] `fetchTokenURI(tokenId)` - get URI from contract
  - [x] `parseMetadata(uri)` - fetch JSON and parse hero.colorPalette
  - [x] `cacheMetadata(characterId, metadata)` - store in database
- [ ] Create `apps/web/lib/services/spriteRenderer.ts`:
  - [ ] `applyColorPalette(spriteUrl, colorPalette)` - apply CSS filters
  - [ ] `getSpriteUrl(class, animation)` - get base sprite path

#### Party Services
- [x] Create `apps/web/lib/services/partyService.ts`:
  - [x] `createParty(ownerId, dungeonId?)` - create party, generate invite code
  - [x] `getParty(partyId)` - get party with members
  - [x] `updateParty(partyId, updates)` - update party (owner only)
  - [x] `deleteParty(partyId)` - cancel party (owner only)
  - [x] `generateInviteCode(partyId)` - create unique 8-char code
  - [x] `validateInviteCode(code)` - check expiration, max uses
  - [x] `joinParty(partyId, heroTokenId, heroContract, userWallet)` - add hero to party
  - [x] `leaveParty(partyId, heroTokenId)` - remove hero from party
  - [x] `startRun(partyId, dungeonId)` - create run from party
  - [x] `getUserParties(userId)` - list user's parties
  - [x] `getPartyMembers(partyId)` - get all members with hero info

#### Notification Services
- [x] Create `apps/web/lib/services/notifications.ts`:
  - [x] `sendNotification(userId, type, title, message, data)` - create notification record
  - [x] `deliverViaMiniapp(farcasterFid, notification)` - use Farcaster SDK
  - [x] `markAsRead(notificationId)` - update read status
  - [x] `getUserNotifications(userId, unreadOnly?)` - fetch notifications
- [ ] Create `apps/web/lib/services/metadataStorage.ts`:
  - [ ] `uploadToIPFS(metadata)` - upload JSON to IPFS (if using IPFS)
  - [ ] `uploadToServer(metadata)` - upload to centralized server (if using server)
  - [ ] `getMetadataUri(metadataId)` - get URI for uploaded metadata

### Phase 3: API Routes

#### Party API
- [x] Create `apps/web/app/api/parties/route.ts`:
  - [x] `POST` - Create new party
  - [x] `GET` - List user's parties
- [x] Create `apps/web/app/api/parties/[id]/route.ts`:
  - [x] `GET` - Get party details
  - [x] `PATCH` - Update party (owner only)
  - [x] `DELETE` - Cancel party (owner only)
- [x] Create `apps/web/app/api/parties/[id]/invite/route.ts`:
  - [x] `POST` - Generate new invite code
- [x] Create `apps/web/app/api/parties/invite/[code]/route.ts`:
  - [x] `GET` - Validate invite code, return party info
- [x] Create `apps/web/app/api/parties/[id]/join/route.ts`:
  - [x] `POST` - Join party with hero (verify ownership)
- [ ] Create `apps/web/app/api/parties/[id]/leave/route.ts`:
  - [ ] `POST` - Leave party
- [x] Create `apps/web/app/api/parties/[id]/start/route.ts`:
  - [x] `POST` - Start dungeon run from party

#### Hero API
- [x] Create `apps/web/app/api/heroes/route.ts`:
  - [x] `GET` - List user's owned heroes (query contract + database)
- [ ] Create `apps/web/app/api/heroes/[tokenId]/route.ts`:
  - [ ] `GET` - Get hero by token ID (contract + cached metadata)
- [ ] Create `apps/web/app/api/heroes/[tokenId]/metadata/route.ts`:
  - [ ] `GET` - Get parsed metadata from tokenURI
- [ ] Create `apps/web/app/api/heroes/mint/route.ts`:
  - [ ] `POST` - Mint new hero NFT (generate metadata, upload, mint)
- [x] Create `apps/web/app/api/heroes/sync/route.ts`:
  - [x] `POST` - Sync NFT ownership from chain
- [ ] Create `apps/web/app/api/heroes/[tokenId]/color/route.ts`:
  - [ ] `PATCH` - Update hero color (update metadata URI)
- [ ] Create `apps/web/app/api/heroes/builder/preview/route.ts`:
  - [ ] `POST` - Generate preview metadata (before minting)

#### Notification API
- [ ] Create `apps/web/app/api/notifications/route.ts`:
  - [ ] `GET` - Get user notifications
- [x] Create `apps/web/app/hero-builder/page.tsx`:
  - [x] Color picker for sprite parts (skin, hair, clothing, accent)
  - [x] Live preview of hero with selected colors
  - [x] Class selection (Warrior, Mage, Rogue, Cleric)
  - [x] Name input
  - [x] Generate metadata button
  - [x] Mint button (calls API, shows transaction)
- [x] Create `apps/web/components/heroes/HeroBuilder.tsx`:
  - [x] Color palette picker component
  - [x] Sprite preview with CSS filters
  - [x] Metadata generation logic

#### Party Management (Merged into Main Route)
- [x] Refactor `apps/web/app/party/page.tsx`:
  - [x] List of user's parties
  - [x] Create new party button
  - [x] Party cards showing status, members, invite code
  - [x] Party details view
  - [x] Member list with hero sprites
  - [x] Start run button
  - [x] Display invite code
  - [x] Share button logic
  - [x] Join/leave logic

#### Miniapp Integration (Merged into Main Route)
- [x] Update `apps/web/app/miniapp/page.tsx`:
  - [x] Handle invite code from URL params (`?party=ABC123`)
  - [x] Handle deep links (`miniapp://party/ABC123`)
  - [x] Party invite acceptance flow
  - [x] Notification center placeholder
  - [x] Hero selection for joining party
  - [x] Multiplayer tab
- [x] Create `apps/web/app/party-invite/[code]/page.tsx`:
  - [x] Validate invite code
  - [x] Show party details
  - [x] Join party button
  - [x] Redirect to miniapp if needed

#### Hero Components
- [x] Create `apps/web/components/heroes/HeroSprite.tsx`:
  - [x] Render sprite with colors from NFT metadata
  - [x] Apply CSS filters based on colorPalette
  - [x] Loading state while fetching metadata
- [x] Create `apps/web/components/heroes/HeroMintButton.tsx`:
  - [x] Button to mint new hero
  - [x] Opens hero builder or direct mint flow
- [x] Create `apps/web/components/heroes/HeroOwnershipBadge.tsx`:
  - [x] Show NFT ownership status
  - [x] Link to block explorer
  - [x] Token ID display

#### Dev Navigation (Removed)
- [x] Removed `DevNav` component (Single route architecture adopted)

### Phase 6: Sprite Color System

- [x] Create `apps/web/lib/services/spriteRenderer.ts`:
  - [x] `getColorFilter(colorPalette)` - calculate CSS filter from palette
  - [x] `applyFilters(spriteElement, filters)` - apply to DOM element
  - [x] `getSpritePath(class, animation)` - get base sprite URL
- [x] Update sprite loading in components:
  - [x] `HeroSprite.tsx` - use color palette from metadata
  - [x] `PartyMemberList.tsx` - show colored hero sprites
  - [x] `InnScene.tsx` - apply colors to inn sprites
  - [x] `BattleScene.tsx` - apply colors in combat

### Phase 7: Testing

#### Unit Tests
- [ ] `apps/web/__tests__/services/partyService.test.ts`
- [ ] `apps/web/__tests__/services/heroOwnership.test.ts`
- [ ] `apps/web/__tests__/services/heroMetadata.test.ts`
- [ ] `apps/web/__tests__/services/notifications.test.ts`
- [x] `apps/web/__tests__/services/spriteRenderer.test.ts`

#### Integration Tests
- [ ] `apps/web/__tests__/api/parties.test.ts`
- [ ] `apps/web/__tests__/api/heroes.test.ts`
- [ ] `apps/web/__tests__/api/notifications.test.ts`
- [ ] Test party creation → invite → join → start run flow
- [ ] Test hero minting → metadata → color update flow

#### E2E Tests (Playwright)
- [ ] `apps/web/e2e/party-system.spec.ts`:
  - [ ] Create party
  - [ ] Generate invite
  - [ ] Join party
  - [ ] Start run
- [ ] `apps/web/e2e/party-invites.spec.ts`:
  - [ ] Share invite link
  - [ ] Accept invite via URL param
  - [ ] Accept invite via deep link
- [ ] `apps/web/e2e/hero-builder.spec.ts`:
  - [ ] Open builder
  - [ ] Select colors
  - [ ] Preview hero
  - [ ] Mint hero
- [ ] `apps/web/e2e/hero-metadata.spec.ts`:
  - [ ] Load hero with metadata
  - [ ] Verify sprite colors applied
  - [ ] Update color
  - [ ] Verify update reflected

#### Contract Tests
- [ ] Run `AdventurerMetadata.test.ts`
- [ ] Run `PublicMinting.test.ts`
- [ ] Verify events emitted correctly
- [ ] Test on testnet

### Phase 8: Documentation

- [ ] Create `agent-guide/multiplayer-party-system.md` - Full system design
- [ ] Create `agent-guide/sprite-color-system.md` - Color customization approach
- [ ] Create `agent-guide/notification-system.md` - Miniapp notification design
- [ ] Create `agent-guide/ab-testing-guide.md` - A/B testing methodology
- [ ] Create `agent-guide/hero-builder-guide.md` - Hero builder implementation
- [ ] Update `README.md` with new features

### Phase 9: Migration & Cleanup

- [ ] Run database migration on testnet/staging
- [ ] Verify all tables created correctly
- [ ] Test party creation and joining
- [ ] Test hero minting and metadata
- [ ] Switch dev nav to v2 by default
- [ ] Get user feedback
- [ ] Once stable, replace v1 routes with v2
- [ ] Remove dev navigation
- [ ] Clean up old code
- [ ] Update all documentation

## Key Technical Details

### NFT Metadata Structure (tokenURI JSON)
```json
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
```

### Invite Code Format
- 8-character alphanumeric (case-insensitive)
- Example: `ABC123XY`
- Expiration: 24 hours default
- Max uses: 10 default

### Party Status Flow
1. `waiting` - Party created, waiting for members
2. `ready` - Party has enough members (can start)
3. `in_progress` - Run started
4. `completed` - Run finished
5. `cancelled` - Party cancelled

### Notification Types
1. `party_invite` - Someone invited you
2. `party_joined` - Someone joined your party
3. `party_left` - Someone left your party
4. `party_started` - Party started a run
5. `run_completed` - Run finished
6. `run_failed` - Run failed/abandoned

## A/B Testing Strategy

1. Keep existing routes (`/party`, `/miniapp`) unchanged
2. Create new routes (`/party-v2`, `/miniapp-v2`, `/hero-builder`)
3. Add dev navigation component to switch between versions
4. Test v2 thoroughly
5. Switch dev nav to v2 by default
6. Get feedback
7. Once stable, replace v1 with v2
8. Remove dev nav and cleanup

## Security Checklist

- [ ] Verify NFT ownership on-chain before allowing in party
- [ ] Only party owner can start runs, cancel party
- [ ] Only token owner can update metadata
- [ ] Invite code validation (expiration, max uses)
- [ ] Rate limiting on minting, party creation
- [ ] Verify user identity before sending notifications
- [ ] Validate all API inputs
- [ ] Sanitize user-generated content

## Performance Checklist

- [ ] Cache NFT ownership checks (refresh every 5-10 min)
- [ ] Cache parsed metadata in database
- [ ] Batch contract calls (multicall if available)
- [ ] Lazy load sprites
- [ ] Use CDN for sprite assets
- [ ] Index all database queries
- [ ] Use Redis for real-time party updates
- [ ] Batch notifications delivery

## Deployment Checklist

- [ ] Backup database
- [ ] Deploy contract updates to testnet
- [ ] Test contract interactions
- [ ] Run database migrations
- [ ] Deploy backend API
- [ ] Deploy frontend v2 (parallel to v1)
- [ ] Enable dev navigation
- [ ] Test all flows
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Switch to production
- [ ] Remove v1 routes
- [ ] Cleanup

## Success Metrics

- Party creation success rate > 95%
- Invite join success rate > 90%
- Notification delivery rate > 98%
- Hero minting success rate > 95%
- Metadata fetch time < 2s
- Sprite color application < 100ms
