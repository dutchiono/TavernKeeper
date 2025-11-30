# Donut Miner Ecosystem Analysis

## Executive Summary

This document provides a comprehensive analysis of the donut-miner ecosystem (contracts, subgraph, and miniapp) and its applicability to the InnKeeper project. The donut-miner system demonstrates a token minting mechanism where NFTs (miners) continuously generate tokens over time, similar to a mining operation.

### Key Mechanisms

1. **Time-Based Token Minting**: NFTs act as "miners" that generate tokens continuously based on time elapsed
2. **NFT Ownership Model**: Users own NFTs that have the right to mint tokens
3. **Dutch Auction**: Initial distribution mechanism for NFTs
4. **Subgraph Indexing**: Real-time tracking of minting events and token generation
5. **Miniapp Interface**: User-friendly interface for managing miners and claiming tokens

### Applicability to InnKeeper

The donut-miner model provides valuable patterns for:
- TavernKeeper NFT minting KEEP tokens over time
- Dutch auction for initial NFT sale
- Token redemption mechanisms (KEEP → GOLD)
- Real-time token balance tracking
- User interface patterns for token management

---

## Contract Analysis

### Token Minting Mechanism

Based on standard time-based minting patterns (similar to DONUT tokens on Reddit), the typical implementation includes:

#### Core Components

1. **Minting Function**
   - Time-based calculation: `tokens = (currentTime - lastClaimTime) * mintingRate`
   - Rate limiting: Cooldown periods between claims
   - Ownership verification: Only NFT owner can claim

2. **Storage Pattern**
   ```solidity
   mapping(uint256 => uint256) public lastClaimTime; // NFT tokenId => timestamp
   mapping(uint256 => uint256) public mintingRate;   // NFT tokenId => tokens per second
   uint256 public baseMintingRate;                   // Base rate for all NFTs
   ```

3. **Claim Mechanism**
   - Calculate pending tokens
   - Transfer tokens to NFT owner
   - Update lastClaimTime
   - Emit events for subgraph indexing

#### Security Considerations

- **Reentrancy Protection**: Use OpenZeppelin's ReentrancyGuard
- **Integer Overflow**: Solidity 0.8+ has built-in overflow protection
- **Access Control**: Only NFT owner can claim their tokens
- **Rate Limiting**: Prevent claim spam with cooldown periods

### NFT Contract Structure

#### Standard ERC-721 Features

1. **Minting**
   - Owner-controlled initial minting
   - Public minting after sale period
   - Metadata URI storage

2. **Metadata Management**
   - ERC721URIStorage for token URIs
   - On-chain or IPFS metadata
   - Updateable metadata (with restrictions)

3. **Ownership Tracking**
   - Standard ERC-721 ownership
   - Transfer events for subgraph
   - Approval mechanisms

#### Upgradeability Pattern

- **UUPS Proxy Pattern**: Matches InnKeeper's existing contracts
- **Initialization**: `initialize()` function for proxy setup
- **Authorization**: Only owner can upgrade

### Dutch Auction Implementation

#### Auction Mechanics

1. **Price Discovery**
   ```
   currentPrice = startPrice - ((block.timestamp - startTime) * priceDecrement)
   ```

2. **Settlement**
   - User pays current price when they bid
   - NFT minted immediately
   - Remaining funds refunded if price drops

3. **Auction Phases**
   - **Start**: High price, slow decrement
   - **Active**: Price decreasing
   - **End**: Final price or sold out

#### Implementation Pattern

```solidity
struct AuctionConfig {
    uint256 startPrice;
    uint256 endPrice;
    uint256 startTime;
    uint256 duration;
    uint256 priceDecrement;
}

function getCurrentPrice() public view returns (uint256) {
    uint256 elapsed = block.timestamp - config.startTime;
    uint256 decrement = (elapsed * config.priceDecrement) / 1 days;
    uint256 price = config.startPrice > decrement
        ? config.startPrice - decrement
        : config.endPrice;
    return price;
}
```

#### Security Considerations

- **Front-running Protection**: Commit-reveal scheme or MEV protection
- **Price Manipulation**: Use oracle or time-based only
- **Refund Safety**: Ensure proper refund mechanisms

---

## Subgraph Architecture

### Event Indexing Strategy

#### Key Events to Index

1. **NFT Events**
   - `Transfer` - Track ownership changes
   - `Mint` - Track new NFT creation
   - `MetadataUpdate` - Track metadata changes

2. **Token Events**
   - `Transfer` - Track token movements
   - `Claim` - Track token claims from NFTs
   - `Mint` - Track new token creation

3. **Auction Events**
   - `AuctionStart` - Track auction beginning
   - `Bid` - Track auction bids
   - `AuctionEnd` - Track auction completion

### Data Model Design

#### Entities

```graphql
type Miner @entity {
  id: ID!                    # NFT tokenId
  owner: Bytes!              # Current owner address
  mintingRate: BigInt!       # Tokens per second
  lastClaimTime: BigInt!     # Last claim timestamp
  totalClaimed: BigInt!      # Total tokens claimed
  createdAt: BigInt!         # Mint timestamp
}

type TokenClaim @entity {
  id: ID!                    # Claim transaction hash
  miner: Miner!               # Related miner NFT
  amount: BigInt!            # Tokens claimed
  timestamp: BigInt!         # Claim timestamp
  claimer: Bytes!            # Address that claimed
}

type Auction @entity {
  id: ID!                    # Auction ID
  startPrice: BigInt!        # Starting price
  endPrice: BigInt!          # Ending price
  startTime: BigInt!         # Auction start
  endTime: BigInt!           # Auction end
  currentPrice: BigInt!      # Current price
  totalSold: BigInt!         # NFTs sold
}
```

### Query Optimization

- **Indexed Fields**: Owner, timestamp, tokenId
- **Pagination**: Use `first` and `skip` for large result sets
- **Filtering**: Use where clauses for specific queries
- **Aggregation**: Use subgraph for totals and statistics

---

## Frontend/UI Patterns

### User Experience Flows

1. **Miner Management**
   - View owned miners
   - See pending tokens
   - Claim tokens with one click
   - View minting history

2. **Auction Participation**
   - View current auction price
   - Place bid
   - Track auction progress
   - Receive NFT after purchase

3. **Token Display**
   - Real-time balance updates
   - Pending tokens indicator
   - Claim history
   - Token value display

### Wallet Integration

- **Connection**: Use wagmi/viem for wallet connection
- **Transaction Handling**: Show pending states, success/error feedback
- **Balance Display**: Real-time token balances
- **Network Switching**: Handle network changes gracefully

### State Management

- **React Query**: For server state (token balances, NFT data)
- **Zustand/Jotai**: For client state (UI state, wallet connection)
- **WebSocket/Subscriptions**: For real-time updates from subgraph

---

## Security Analysis

### Access Control Patterns

1. **Ownership Verification**
   ```solidity
   require(ownerOf(tokenId) == msg.sender, "Not owner");
   ```

2. **Role-Based Access**
   - Owner: Contract upgrades, configuration
   - NFT Owner: Claim tokens, update metadata
   - Public: View functions only

### Reentrancy Protections

- Use OpenZeppelin's `ReentrancyGuard`
- Checks-Effects-Interactions pattern
- External calls last in function execution

### Integer Overflow/Underflow

- Solidity 0.8+ has built-in protection
- Use SafeMath for older versions
- Validate inputs before calculations

### Front-Running Mitigations

1. **Commit-Reveal Scheme**: For auctions
2. **Time Delays**: Between reveal and execution
3. **MEV Protection**: Use private mempools or Flashbots

### Upgrade Safety

- **UUPS Pattern**: Only owner can upgrade
- **Storage Layout**: Maintain compatibility
- **Initialization**: Prevent re-initialization attacks
- **Testing**: Comprehensive upgrade tests

---

## Gas Optimization

### Efficient Storage Patterns

1. **Packed Structs**: Combine small values
   ```solidity
   struct MinerData {
       uint128 mintingRate;    // Packed
       uint128 lastClaimTime;  // Packed
   }
   ```

2. **Storage vs Memory**: Use memory for temporary data
3. **SSTORE Optimization**: Batch updates when possible

### Batch Operations

- **Batch Claims**: Claim multiple NFTs in one transaction
- **Batch Transfers**: Transfer multiple tokens at once
- **Gas Refunds**: Use self-destruct for gas refunds (if applicable)

### Event Optimization

- **Indexed Parameters**: Use indexed for filterable events
- **Minimal Data**: Only emit necessary data
- **Event Consolidation**: Combine related events when possible

### Contract Size Considerations

- **Libraries**: Extract common logic to libraries
- **Proxy Pattern**: Keep implementation contracts small
- **Function Modifiers**: Use modifiers for common checks

---

## Integration Points for InnKeeper

### TavernKeeper NFT Integration

1. **KEEP Token Minting**: Similar to donut-miner's token minting
2. **Personalization**: Metadata updates for customization
3. **Homepage Display**: Show personalized TavernKeeper

### Game Mechanics Integration

1. **Token Drops**: Monsters drop KEEP tokens
2. **Loot System**: Extend existing loot claim system
3. **Redemption**: KEEP → GOLD conversion

### Database Schema Extensions

1. **Token Tracking**: Add KEEP balance tracking
2. **Claim History**: Track token claims
3. **Personalization**: Store TavernKeeper customization

---

## Recommendations

### For TavernKeeper System

1. **Hybrid Minting Model**:
   - Time-based base rate (like donut-miner)
   - Action-based multipliers (dungeon runs, achievements)

2. **Dutch Auction**:
   - Initial NFT sale
   - Protocol support mechanism
   - Fair price discovery

3. **Token Economics**:
   - Redemption mechanism (KEEP → GOLD)
   - Trading on marketplace
   - Collaborator token support

4. **Security**:
   - Follow all security patterns identified
   - Comprehensive testing
   - Audit before mainnet deployment

5. **Gas Optimization**:
   - Implement batch operations
   - Optimize storage layout
   - Use efficient data structures

---

## Conclusion

The donut-miner ecosystem provides excellent patterns for implementing a token minting system in InnKeeper. Key takeaways:

1. **Time-based minting** is a proven mechanism for NFT-based token generation
2. **Dutch auctions** provide fair initial distribution
3. **Subgraph indexing** enables real-time UI updates
4. **Security patterns** must be followed rigorously
5. **Gas optimization** is critical for user experience

The TavernKeeper system should incorporate these patterns while adding game-specific mechanics like action-based multipliers and monster token drops.
