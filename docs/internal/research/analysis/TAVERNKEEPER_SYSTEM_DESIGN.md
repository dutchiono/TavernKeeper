# TavernKeeper NFT System Design

## Overview

The TavernKeeper NFT system is the foundation of the InnKeeper token economy. Each TavernKeeper NFT:
- Mints KEEP tokens over time (similar to donut-miner)
- Can be personalized by the owner
- Displays on the homepage when user logs in
- Includes one free hero on mint
- Enables additional hero purchases

## Token Specifications

### KEEP Token (ERC-20)

- **Name**: "Tavern Keeper"
- **Symbol**: "KEEP"
- **Decimals**: 18
- **Type**: ERC-20 Upgradeable (UUPS)
- **Total Supply**: Uncapped (minted by TavernKeeper NFTs)
- **Initial Distribution**: Dutch auction + free mints

### TavernKeeper NFT (ERC-721)

- **Name**: "InnKeeper TavernKeeper"
- **Symbol**: "KEEPER" (already in use)
- **Type**: ERC-721 Upgradeable (UUPS)
- **Total Supply**: TBD (based on auction + free mints)
- **Metadata**: IPFS or on-chain JSON

---

## Contract Architecture

### 1. KeepToken.sol (ERC-20)

#### Core Functionality

```solidity
contract KeepToken is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Reference to TavernKeeper NFT contract
    address public tavernKeeperContract;

    // Redemption rate: KEEP -> GOLD
    uint256 public redemptionRate; // e.g., 1 KEEP = 100 GOLD

    // Reference to GOLD token for redemption
    address public goldTokenContract;

    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 indexed tavernKeeperId);
    event TokensRedeemed(address indexed from, uint256 keepAmount, uint256 goldAmount);
    event RedemptionRateUpdated(uint256 newRate);
}
```

#### Key Functions

1. **mintTokens(address to, uint256 amount, uint256 tavernKeeperId)**
   - Only callable by TavernKeeper contract
   - Mints KEEP tokens to specified address
   - Emits Mint event for subgraph

2. **redeemForGold(uint256 amount)**
   - User redeems KEEP for in-game GOLD
   - Burns KEEP tokens
   - Mints GOLD tokens at redemption rate
   - Requires approval from user

3. **setRedemptionRate(uint256 newRate)**
   - Owner-only function
   - Updates KEEP -> GOLD conversion rate
   - Emits event for transparency

#### Security Considerations

- **Access Control**: Only TavernKeeper contract can mint
- **Redemption Limits**: Optional daily limits to prevent abuse
- **Rate Updates**: Timelock for rate changes (recommended)

### 2. Enhanced TavernKeeper.sol (ERC-721)

#### Core Functionality

```solidity
contract TavernKeeper is ERC721Upgradeable, ERC721URIStorageUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Reference to KEEP token contract
    address public keepTokenContract;

    // Reference to Adventurer contract (for free hero)
    address public adventurerContract;

    // Minting configuration
    uint256 public baseMintingRate; // KEEP per second
    uint256 public claimCooldown;   // Seconds between claims

    // Per-NFT data
    struct TavernKeeperData {
        uint256 lastClaimTime;
        uint256 mintingRate;        // Can be modified by actions
        uint256 totalClaimed;
        string metadataUri;
        bool hasClaimedFreeHero;
    }

    mapping(uint256 => TavernKeeperData) public keeperData;

    // Dutch auction configuration
    DutchAuction public auction;

    // Events
    event TavernKeeperMinted(address indexed to, uint256 indexed tokenId, bool fromAuction);
    event TokensClaimed(uint256 indexed tokenId, address indexed claimer, uint256 amount);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);
    event MintingRateUpdated(uint256 indexed tokenId, uint256 newRate);
}
```

#### Key Functions

1. **mintFromAuction(address to) payable**
   - Called during Dutch auction
   - Mints NFT to buyer
   - Sets initial minting rate
   - Records auction purchase

2. **mintFree(address to)**
   - Owner-only function for free mints
   - Includes one free hero mint
   - Sets base minting rate

3. **claimTokens(uint256 tokenId)**
   - Calculates pending KEEP tokens
   - Mints tokens to NFT owner
   - Updates lastClaimTime
   - Applies cooldown check

4. **updateMetadata(uint256 tokenId, string newUri)**
   - Owner-only metadata update
   - For personalization features
   - Emits MetadataUpdated event

5. **updateMintingRate(uint256 tokenId, uint256 newRate)**
   - Owner-only function
   - Adjusts minting rate based on game actions
   - Can increase rate for active players

6. **mintFreeHero(uint256 tavernKeeperId)**
   - Mints one free hero to TavernKeeper owner
   - Can only be called once per TavernKeeper
   - Calls Adventurer contract

#### Minting Rate Calculation

```solidity
function calculatePendingTokens(uint256 tokenId) public view returns (uint256) {
    TavernKeeperData memory data = keeperData[tokenId];
    uint256 timeElapsed = block.timestamp - data.lastClaimTime;
    uint256 pending = (timeElapsed * data.mintingRate) / 1 seconds;
    return pending;
}

function claimTokens(uint256 tokenId) external {
    require(ownerOf(tokenId) == msg.sender, "Not owner");
    require(block.timestamp >= keeperData[tokenId].lastClaimTime + claimCooldown, "Cooldown active");

    uint256 pending = calculatePendingTokens(tokenId);
    require(pending > 0, "No tokens to claim");

    keeperData[tokenId].lastClaimTime = block.timestamp;
    keeperData[tokenId].totalClaimed += pending;

    KeepToken(keepTokenContract).mintTokens(msg.sender, pending, tokenId);
    emit TokensClaimed(tokenId, msg.sender, pending);
}
```

### 3. DutchAuction.sol

#### Core Functionality

```solidity
contract DutchAuction is OwnableUpgradeable, UUPSUpgradeable {
    TavernKeeper public tavernKeeperContract;

    struct AuctionConfig {
        uint256 startPrice;      // Starting price in wei
        uint256 endPrice;        // Ending price in wei
        uint256 startTime;       // Auction start timestamp
        uint256 duration;        // Auction duration in seconds
        uint256 totalSupply;     // Total NFTs to sell
        uint256 sold;            // NFTs sold so far
    }

    AuctionConfig public config;
    bool public isActive;

    // Track purchases
    mapping(address => uint256[]) public purchases; // buyer => tokenIds

    // Events
    event AuctionStarted(uint256 startPrice, uint256 endPrice, uint256 duration);
    event NFTPurchased(address indexed buyer, uint256 indexed tokenId, uint256 price);
    event AuctionEnded(uint256 totalSold, uint256 totalRevenue);
}
```

#### Key Functions

1. **startAuction(uint256 startPrice, uint256 endPrice, uint256 duration, uint256 totalSupply)**
   - Owner-only function
   - Initializes auction configuration
   - Sets startTime to block.timestamp

2. **getCurrentPrice() public view returns (uint256)**
   - Calculates current price based on time elapsed
   - Linear price decrease
   - Returns endPrice if duration exceeded

3. **purchase() payable**
   - User pays current price
   - Mints NFT via TavernKeeper contract
   - Refunds excess if price dropped
   - Tracks purchase

4. **endAuction()**
   - Owner-only function
   - Ends auction and transfers funds
   - Can be called early or after duration

#### Price Calculation

```solidity
function getCurrentPrice() public view returns (uint256) {
    if (!isActive || block.timestamp < config.startTime) {
        return config.startPrice;
    }

    uint256 elapsed = block.timestamp - config.startTime;
    if (elapsed >= config.duration) {
        return config.endPrice;
    }

    uint256 priceRange = config.startPrice - config.endPrice;
    uint256 priceDecrement = (priceRange * elapsed) / config.duration;
    uint256 currentPrice = config.startPrice - priceDecrement;

    return currentPrice > config.endPrice ? currentPrice : config.endPrice;
}
```

---

## Game Mechanics Integration

### Monster Token Drops

#### Monster Entity Extension

```typescript
interface Monster {
  id: string;
  name: string;
  stats: EntityStats;
  // Existing fields...

  // Token drop configuration
  tokenDrops?: {
    keepToken: {
      chance: number;        // 0-100 percentage
      amountRange: [number, number]; // min-max KEEP tokens
    };
    collaboratorTokens?: Array<{
      tokenAddress: string;
      chance: number;
      amountRange: [number, number];
    }>;
  };
}
```

#### Loot Calculation Logic

```typescript
function calculateMonsterLoot(
  monster: Monster,
  rng: RNG
): {
  gold: number;
  items: LootItem[];
  keepTokens?: number;
  collaboratorTokens?: Array<{address: string; amount: number}>;
} {
  const loot = {
    gold: calculateGoldDrop(monster, rng),
    items: calculateItemDrops(monster, rng),
  };

  // KEEP token drop
  if (monster.tokenDrops?.keepToken) {
    const dropChance = d(100, rng);
    if (dropChance <= monster.tokenDrops.keepToken.chance) {
      const [min, max] = monster.tokenDrops.keepToken.amountRange;
      loot.keepTokens = Math.floor(rng() * (max - min + 1)) + min;
    }
  }

  // Collaborator token drops
  if (monster.tokenDrops?.collaboratorTokens) {
    loot.collaboratorTokens = [];
    for (const tokenConfig of monster.tokenDrops.collaboratorTokens) {
      const dropChance = d(100, rng);
      if (dropChance <= tokenConfig.chance) {
        const [min, max] = tokenConfig.amountRange;
        const amount = Math.floor(rng() * (max - min + 1)) + min;
        loot.collaboratorTokens.push({
          address: tokenConfig.tokenAddress,
          amount: amount
        });
      }
    }
  }

  return loot;
}
```

#### Database Schema Updates

```sql
-- Extend loot_claims table
ALTER TABLE loot_claims ADD COLUMN IF NOT EXISTS keep_tokens NUMERIC(78, 0) DEFAULT 0;
ALTER TABLE loot_claims ADD COLUMN IF NOT EXISTS collaborator_tokens JSONB DEFAULT '{}';

-- Index for token queries
CREATE INDEX IF NOT EXISTS idx_loot_claims_keep_tokens ON loot_claims(keep_tokens) WHERE keep_tokens > 0;
```

#### Loot Claim Service Updates

```typescript
export interface LootClaim {
  // Existing fields...
  keepTokens?: string; // Amount in wei
  collaboratorTokens?: Record<string, string>; // tokenAddress => amount
}

export async function claimLoot(
  claimId: string,
  // ... existing params
): Promise<{ txHash: `0x${string}` }> {
  const claim = await getLootClaim(claimId);

  // Claim items (existing logic)
  // ...

  // Claim KEEP tokens if any
  if (claim.keepTokens && BigInt(claim.keepTokens) > 0n) {
    await claimKeepTokens(claim.adventurerContract, claim.adventurerTokenId, claim.keepTokens);
  }

  // Claim collaborator tokens if any
  if (claim.collaboratorTokens) {
    await claimCollaboratorTokens(claim.collaboratorTokens);
  }

  return { txHash };
}
```

### Dungeon Run Integration

#### Run Completion Flow

```typescript
async function completeRun(runId: string, results: RunResults) {
  // Calculate loot for each adventurer
  const adventurerLoot = results.party.map(adventurer => {
    const monsterDefeated = results.defeatedMonsters;
    const loot = {
      gold: 0,
      items: [],
      keepTokens: 0,
      collaboratorTokens: {}
    };

    // Calculate loot from each defeated monster
    for (const monster of monsterDefeated) {
      const monsterLoot = calculateMonsterLoot(monster, results.rng);
      loot.gold += monsterLoot.gold;
      loot.items.push(...monsterLoot.items);
      if (monsterLoot.keepTokens) {
        loot.keepTokens += monsterLoot.keepTokens;
      }
      if (monsterLoot.collaboratorTokens) {
        for (const token of monsterLoot.collaboratorTokens) {
          loot.collaboratorTokens[token.address] =
            (loot.collaboratorTokens[token.address] || 0) + token.amount;
        }
      }
    }

    return {
      adventurerId: adventurer.id,
      adventurerContract: adventurer.contractAddress,
      adventurerTokenId: adventurer.tokenId,
      ...loot
    };
  });

  // Create loot claims
  await createLootClaims(runId, adventurerLoot);
}
```

### Homepage TavernKeeper Display

#### Database Schema

```sql
-- TavernKeeper personalization metadata
CREATE TABLE IF NOT EXISTS tavernkeeper_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR NOT NULL UNIQUE,
  owner_address VARCHAR NOT NULL,
  name VARCHAR,
  visual_traits JSONB, -- {background, furniture, decorations, etc.}
  metadata_uri VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tavernkeeper_metadata_owner ON tavernkeeper_metadata(owner_address);
CREATE INDEX IF NOT EXISTS idx_tavernkeeper_metadata_token_id ON tavernkeeper_metadata(token_id);
```

#### Homepage Integration

```typescript
// apps/web/app/page.tsx
export default function Home() {
  const { address } = useAccount();
  const [tavernKeeper, setTavernKeeper] = useState<TavernKeeperData | null>(null);

  useEffect(() => {
    if (address) {
      fetchUserTavernKeeper(address).then(setTavernKeeper);
    }
  }, [address]);

  return (
    <main>
      {tavernKeeper && (
        <TavernKeeperDisplay
          tokenId={tavernKeeper.tokenId}
          metadata={tavernKeeper.metadata}
          visualTraits={tavernKeeper.visualTraits}
        />
      )}
      {/* Rest of homepage */}
    </main>
  );
}
```

#### Personalization Service

```typescript
export async function updateTavernKeeperMetadata(
  tokenId: string,
  updates: {
    name?: string;
    visualTraits?: Record<string, any>;
  },
  walletClient: WalletClient
): Promise<void> {
  // Update off-chain metadata
  const { error } = await supabase
    .from('tavernkeeper_metadata')
    .upsert({
      token_id: tokenId,
      owner_address: await getOwnerAddress(),
      ...updates,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  // Update on-chain metadata URI if needed
  const metadataUri = await generateMetadataURI(tokenId, updates);
  await updateTokenURI(tokenId, metadataUri, walletClient);
}
```

---

## Token Economics

### KEEP Token Distribution

1. **Time-Based Minting**: Base rate per TavernKeeper NFT
2. **Action Multipliers**:
   - Dungeon runs: +10% minting rate for 24h
   - Achievements: Permanent +5% per achievement
   - Party size: +2% per party member (max +10%)
3. **Monster Drops**: Additional KEEP from dungeon runs
4. **Dutch Auction**: Initial distribution

### Redemption Mechanism

- **KEEP → GOLD**: Fixed or dynamic rate
- **Initial Rate**: 1 KEEP = 100 GOLD (configurable)
- **Redemption Fee**: Optional protocol fee (e.g., 2%)
- **Minimum Redemption**: Prevent dust transactions

### Trading

- **Marketplace**: Trade KEEP tokens on existing marketplace
- **Pseudoswap**: Use existing swap infrastructure
- **Liquidity**: Consider adding liquidity pools

---

## Security Considerations

### Contract Security

1. **Access Control**: Strict ownership checks
2. **Reentrancy**: Use ReentrancyGuard for all external calls
3. **Integer Overflow**: Solidity 0.8+ protection
4. **Front-Running**: Commit-reveal for auctions (optional)
5. **Upgrade Safety**: Comprehensive upgrade tests

### Economic Security

1. **Minting Rate Limits**: Prevent excessive minting
2. **Redemption Limits**: Daily limits to prevent abuse
3. **Rate Updates**: Timelock for critical parameter changes
4. **Oracle Integration**: For dynamic rates (if needed)

---

## Implementation Phases

### Phase 1: Core Contracts
1. KeepToken.sol
2. Enhanced TavernKeeper.sol
3. DutchAuction.sol
4. Tests for all contracts

### Phase 2: Backend Integration
1. Token drop calculation in engine
2. Loot claim service updates
3. Database migrations
4. API endpoints

### Phase 3: Frontend
1. TavernKeeper personalization UI
2. Homepage display
3. Token claim interface
4. Dutch auction UI

### Phase 4: Subgraph
1. Event indexing
2. Query optimization
3. Real-time updates

---

## Missing Logic Identification

### Current Gaps

1. **Token Drop Calculation**: Not implemented in engine
2. **Monster Configuration**: No token drop config in monster definitions
3. **Loot Claim Extension**: Need to add token claiming
4. **Redemption UI**: No KEEP → GOLD interface
5. **Personalization System**: No customization logic
6. **Homepage Integration**: TavernKeeper display not implemented
7. **Auction Frontend**: No Dutch auction interface
8. **Token Balance Tracking**: No real-time balance display

### Required Additions

1. Engine: Token drop calculation in combat system
2. Database: Token fields in loot_claims, tavernkeeper_metadata table
3. Services: Token claim, redemption, personalization services
4. API: Token endpoints, personalization endpoints
5. Frontend: All UI components listed above
6. Contracts: All three new contracts

---

## Next Steps

1. Review and approve this design
2. Begin Phase 1 implementation (contracts)
3. Set up testnet deployment
4. Implement backend integration
5. Build frontend components
6. Deploy subgraph
7. Comprehensive testing
8. Mainnet deployment
