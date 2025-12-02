# Concept Mapping - m00n-cabal to InnKeeper

## Overview

This document maps m00n-cabal concepts and patterns to InnKeeper's "Bar Regulars" and "Town Posse" features.

**Status**: ⚠️ Preliminary mapping - will be refined after code analysis

## Concept Definitions

### Bar Regulars

**InnKeeper Concept**: A small, trusted group of users who pool liquidity together for shared LP positions. Like regulars at a bar who always sit at the same table.

**m00n-cabal Equivalent**: Small group LP positions with shared ownership

**Key Characteristics**:
- Small group size (3-10 members)
- Trust-based membership
- Invite-only or permissioned
- Equal or proportional contributions
- Shared LP tokens
- Collective fee sharing
- Simple decision-making

**Use Cases**:
- Friends pooling capital
- Small investment groups
- Trusted community members
- Lower gas costs through shared transactions

### Town Posse

**InnKeeper Concept**: A larger community group with tiered membership levels. Members contribute to shared LP positions with governance mechanisms. Like a town posse that works together for common goals.

**m00n-cabal Equivalent**: Large group LP positions with governance

**Key Characteristics**:
- Larger group size (10-100+ members)
- Open or permissioned membership
- Tiered contribution levels
- Governance mechanisms
- Proposal and voting system
- Tiered fee distribution
- Democratic decision-making

**Use Cases**:
- Community investment pools
- DAO-like structures
- Tiered membership programs
- Governance participation
- Larger capital pools

## Pattern Mapping

### 1. LP Position Management

#### m00n-cabal Pattern
- Individual position tracking
- Group position tracking
- Shared ownership mechanisms
- Proportional fee distribution

#### InnKeeper Implementation
- Extend CellarHook position tracking
- Add group position structures
- Implement shared LP token handling
- Add group fee distribution

### 2. Group Creation

#### m00n-cabal Pattern
- Group creation function
- Member invitation system
- Contribution tracking
- Ownership calculation

#### InnKeeper Implementation
- `createBarRegularsGroup()` - Create small group
- `createTownPosse()` - Create large group
- Member management functions
- Contribution tracking

### 3. Fee Distribution

#### m00n-cabal Pattern
- Fee accrual tracking
- Proportional distribution
- Group fee sharing
- Claim mechanisms

#### InnKeeper Implementation
- Extend CellarHook fee tracking
- Add group fee distribution
- Implement proportional sharing
- Add claim functions

### 4. Governance (Town Posse)

#### m00n-cabal Pattern
- Proposal system
- Voting mechanism
- Execution functions
- Quorum requirements

#### InnKeeper Implementation
- Proposal creation
- Voting system
- Execution mechanism
- Governance parameters

## Data Structure Mapping

### Bar Regulars Structure

```solidity
struct BarRegularsGroup {
    uint256 groupId;
    address creator;
    address[] members;
    uint256 maxMembers; // e.g., 10
    uint256 totalContribution;
    mapping(address => uint256) contributions;
    uint256 lpTokenBalance; // Shared LP tokens
    mapping(address => uint256) memberShares; // Proportional ownership
    uint256 createdAt;
    bool active;
    string groupName;
}
```

### Town Posse Structure

```solidity
struct TownPosseGroup {
    uint256 posseId;
    address creator;
    address[] members;
    uint256 maxMembers; // e.g., 100
    uint256 minContribution;
    mapping(address => uint256) tier; // 1=Bronze, 2=Silver, 3=Gold
    uint256 totalContribution;
    mapping(address => uint256) contributions;
    uint256 lpTokenBalance; // Shared LP tokens
    mapping(address => uint256) memberShares; // Proportional ownership
    Proposal[] proposals;
    uint256 createdAt;
    bool active;
    string posseName;
    bool openMembership; // Open or permissioned
}

struct Proposal {
    uint256 proposalId;
    address proposer;
    string description;
    bytes data; // Function call data
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 deadline;
    bool executed;
    mapping(address => bool) voted;
}
```

## Function Mapping

### Bar Regulars Functions

| m00n-cabal Concept | InnKeeper Function | Description |
|-------------------|-------------------|-------------|
| Create group | `createBarRegularsGroup(string name, uint256 maxMembers)` | Create new Bar Regulars group |
| Join group | `joinBarRegularsGroup(uint256 groupId)` | Join existing group (if open) |
| Invite member | `inviteToBarRegularsGroup(uint256 groupId, address member)` | Invite member (if permissioned) |
| Contribute | `contributeToBarRegularsGroup(uint256 groupId, uint256 amountMON, uint256 amountKEEP)` | Add liquidity to group |
| Withdraw | `withdrawFromBarRegularsGroup(uint256 groupId, uint256 amount)` | Remove liquidity from group |
| Claim fees | `claimBarRegularsFees(uint256 groupId)` | Claim proportional fees |
| Get group info | `getBarRegularsGroup(uint256 groupId)` | Get group details |

### Town Posse Functions

| m00n-cabal Concept | InnKeeper Function | Description |
|-------------------|-------------------|-------------|
| Create posse | `createTownPosse(string name, uint256 maxMembers, bool openMembership)` | Create new Town Posse |
| Request join | `requestJoinTownPosse(uint256 posseId)` | Request membership |
| Approve member | `approveTownPosseMember(uint256 posseId, address member)` | Approve join request |
| Contribute | `contributeToTownPosse(uint256 posseId, uint256 amountMON, uint256 amountKEEP)` | Add liquidity to posse |
| Withdraw | `withdrawFromTownPosse(uint256 posseId, uint256 amount)` | Remove liquidity from posse |
| Create proposal | `createTownPosseProposal(uint256 posseId, string description, bytes data)` | Create governance proposal |
| Vote | `voteOnTownPosseProposal(uint256 posseId, uint256 proposalId, bool support)` | Vote on proposal |
| Execute proposal | `executeTownPosseProposal(uint256 posseId, uint256 proposalId)` | Execute passed proposal |
| Claim fees | `claimTownPosseFees(uint256 posseId)` | Claim tiered fees |
| Get posse info | `getTownPosse(uint256 posseId)` | Get posse details |

## Integration Points

### With CellarHook

**Current CellarHook Functions**:
- `addLiquidity()` - Add liquidity, mint LP tokens
- `raid()` - Burn LP tokens, claim pot
- `potBalance` - Accumulated fees

**New Group Functions**:
- `addLiquidityForGroup()` - Add liquidity on behalf of group
- `getGroupLPTokens()` - Get group LP token balance
- `distributeGroupFees()` - Distribute fees to group members

### With CellarZapV4

**Current CellarZapV4 Functions**:
- `mintLP()` - Entry point for adding liquidity

**New Group Functions**:
- `mintLPForGroup()` - Add liquidity for group
- `withdrawLPFromGroup()` - Remove liquidity from group

## Safety Pattern Mapping

### m00n-cabal Safety Patterns
- Reentrancy protection
- Slippage protection
- Access control
- Emergency pause
- Withdrawal limits

### InnKeeper Implementation
- Use same patterns from CellarHook
- Add group-specific access control
- Add member verification
- Add contribution limits
- Add withdrawal authorization

## Fee Distribution Mapping

### m00n-cabal Pattern
- Proportional to contribution
- Time-weighted (if applicable)
- Group-based sharing

### InnKeeper Implementation

**Bar Regulars**:
- Simple proportional sharing
- Based on contribution percentage
- Equal distribution option

**Town Posse**:
- Tiered distribution
- Proportional within tier
- Governance-controlled parameters

## Governance Mapping (Town Posse)

### m00n-cabal Pattern
- Proposal creation
- Voting mechanism
- Quorum requirements
- Execution functions

### InnKeeper Implementation
- Simple majority voting
- Tiered voting weights (optional)
- Quorum based on participation
- Time-limited proposals
- Execution after deadline

## Implementation Priority

### Phase 1: Bar Regulars (Simpler)
1. Group creation
2. Member management
3. Shared LP positions
4. Fee distribution
5. Basic UI

### Phase 2: Town Posse (More Complex)
1. Posse creation
2. Tier system
3. Governance mechanism
4. Proposal system
5. Voting system
6. Advanced UI

---

**Note**: This mapping will be refined based on actual m00n-cabal code analysis once the repository is cloned.
