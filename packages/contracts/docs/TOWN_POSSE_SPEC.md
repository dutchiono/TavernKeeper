# Town Posse Manager Contract Specification

## Overview

Town Posse Manager is a contract that manages larger groups (10-100+ members) with tiered membership levels and governance mechanisms. Like Bar Regulars, groups contribute fees back to the Cellar pot, but with additional features for larger communities.

## Contract Details

**Contract Name**: `TownPosseManager`
**Type**: UUPS Upgradeable Proxy
**Inheritance**: `OwnableUpgradeable`, `UUPSUpgradeable`, `Initializable`
**Purpose**: Manage large group LP positions with governance and tiered membership

## Core Concepts

### Town Posse Group

A larger community group (10-100+ members) that:
- Pools liquidity together
- Has tiered membership (Bronze/Silver/Gold)
- Includes governance mechanisms
- Distributes fees proportionally (80% to members, 20% to pot)
- Pays 1% contribution tax when adding liquidity

### Tier System

Members are assigned tiers based on contribution:
- **Bronze**: Base tier (minimum contribution)
- **Silver**: Medium contribution threshold
- **Gold**: High contribution threshold

Tiers affect:
- Fee distribution (proportional within tier)
- Voting weight (optional)
- Display/recognition

### Governance

Groups can create proposals and vote on:
- Fee split changes (if allowed)
- Group parameters
- Member management decisions
- Other group operations

## Data Structures

### TownPosseGroup

```solidity
struct TownPosseGroup {
    uint256 posseId;
    address creator;
    address[] members;
    uint256 maxMembers;                // Maximum members (e.g., 100)
    uint256 minContribution;           // Minimum contribution to join
    mapping(address => uint256) tier;  // 1=Bronze, 2=Silver, 3=Gold
    uint256 totalContribution;         // Total MON contributed
    mapping(address => uint256) contributions;  // Per-member contributions
    uint256 lpTokenBalance;           // Total LP tokens held
    mapping(address => uint256) memberShares;    // LP tokens per member
    bool openMembership;               // Open or permissioned
    uint256 createdAt;
    bool active;
    string posseName;
}
```

### Proposal

```solidity
struct Proposal {
    uint256 proposalId;
    address proposer;
    string description;
    bytes data;                        // Function call data
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 deadline;                  // Voting deadline
    bool executed;
    mapping(address => bool) voted;    // Track who voted
}
```

### State Variables

```solidity
mapping(uint256 => TownPosseGroup) public posses;
mapping(address => uint256[]) public userPosses;
mapping(uint256 => mapping(uint256 => Proposal)) public proposals;  // posseId => proposalId => Proposal
mapping(uint256 => uint256) public nextProposalId;  // posseId => next proposal ID

// Constants
uint256 public constant MIN_MEMBERS = 10;
uint256 public constant MAX_MEMBERS = 100;
uint256 public constant CONTRIBUTION_TAX_BPS = 100;  // 1% = 100 basis points
uint256 public constant FLYWHEEL_FEE_BPS = 2000;     // 20% = 2000 basis points
uint256 public constant MEMBER_SHARE_BPS = 8000;     // 80% = 8000 basis points

// Tier thresholds (configurable)
uint256 public bronzeThreshold;        // Minimum for Bronze
uint256 public silverThreshold;        // Minimum for Silver
uint256 public goldThreshold;          // Minimum for Gold

// Governance parameters
uint256 public constant VOTING_PERIOD = 7 days;
uint256 public constant QUORUM_BPS = 5000;  // 50% quorum

// Dependencies
address public cellarHook;
address public cellarZap;
IPoolManager public poolManager;
Currency public MON;
Currency public KEEP;
```

## Key Functions

### Group Management

#### `createTownPosse(string memory name, uint256 maxMembers, bool openMembership, uint256 minContribution)`

**Purpose**: Create a new Town Posse

**Parameters**:
- `name`: Posse name
- `maxMembers`: Maximum members (10-100)
- `openMembership`: Whether anyone can join (true) or approval needed (false)
- `minContribution`: Minimum contribution to join

**Requirements**:
- `maxMembers >= MIN_MEMBERS && maxMembers <= MAX_MEMBERS`
- Creator becomes first member

**Returns**: `uint256 posseId`

**Effects**:
- Creates new posse
- Sets creator as first member
- Initializes governance
- Emits `PosseCreated(posseId, creator, name)`

#### `requestJoinTownPosse(uint256 posseId)`

**Purpose**: Request to join a posse

**Parameters**:
- `posseId`: Posse to join

**Requirements**:
- Posse exists and is active
- Posse not full
- Caller not already a member
- If openMembership: auto-approve
- If permissioned: create join request

**Effects**:
- Adds to join requests (if permissioned)
- Or adds member directly (if open)
- Emits `JoinRequested(posseId, msg.sender)` or `MemberJoined(posseId, msg.sender)`

#### `approveTownPosseMember(uint256 posseId, address member)`

**Purpose**: Approve a join request

**Parameters**:
- `posseId`: Posse
- `member`: Member to approve

**Requirements**:
- Caller is posse creator or member (permission logic)
- Member has requested to join
- Posse not full

**Effects**:
- Adds member to posse
- Emits `MemberApproved(posseId, member)`

### Tier Management

#### `updateMemberTier(uint256 posseId, address member)`

**Purpose**: Update member tier based on contribution

**Parameters**:
- `posseId`: Posse
- `member`: Member to update

**Logic**:
- If contribution >= goldThreshold → Gold (tier 3)
- Else if contribution >= silverThreshold → Silver (tier 2)
- Else → Bronze (tier 1)

**Effects**:
- Updates member tier
- Emits `TierUpdated(posseId, member, newTier)`

### Liquidity Management

#### `contributeToTownPosse(uint256 posseId, uint256 amountMON, uint256 amountKEEP)`

**Purpose**: Add liquidity to a posse

**Parameters**:
- `posseId`: Posse to contribute to
- `amountMON`: Amount of MON
- `amountKEEP`: Amount of KEEP

**Requirements**:
- Caller is posse member
- Posse is active
- Amounts > 0

**Flow**:
1. Calculate 1% contribution tax
2. Send tax to CellarHook.potBalance
3. Call CellarHook.addLiquidity() with 99%
4. Track LP tokens
5. Update member shares
6. Update member tier (if threshold crossed)

**Returns**: `uint256 lpTokensReceived`

**Effects**:
- Posse LP balance increases
- Member shares updated
- Member tier may update
- Pot receives 1% tax
- Emits `PosseContributed(posseId, msg.sender, amountMON, lpTokensReceived)`

#### `withdrawFromTownPosse(uint256 posseId, uint256 lpTokenAmount)`

**Purpose**: Remove liquidity from posse

**Similar to Bar Regulars**: Same flow, but may affect tier

**Effects**:
- Member shares decrease
- Member tier may decrease
- Emits `PosseWithdrawn(posseId, msg.sender, lpTokenAmount)`

### Governance

#### `createTownPosseProposal(uint256 posseId, string memory description, bytes memory data)`

**Purpose**: Create a governance proposal

**Parameters**:
- `posseId`: Posse
- `description`: Proposal description
- `data`: Function call data (encoded)

**Requirements**:
- Caller is posse member
- Posse is active

**Returns**: `uint256 proposalId`

**Effects**:
- Creates proposal
- Sets deadline (now + VOTING_PERIOD)
- Emits `ProposalCreated(posseId, proposalId, proposer, description)`

#### `voteOnTownPosseProposal(uint256 posseId, uint256 proposalId, bool support)`

**Purpose**: Vote on a proposal

**Parameters**:
- `posseId`: Posse
- `proposalId`: Proposal
- `support`: true = for, false = against

**Requirements**:
- Caller is posse member
- Proposal exists and not executed
- Voting period not ended
- Caller hasn't voted

**Effects**:
- Records vote
- Updates vote counts
- Emits `VoteCast(posseId, proposalId, msg.sender, support)`

#### `executeTownPosseProposal(uint256 posseId, uint256 proposalId)`

**Purpose**: Execute a passed proposal

**Parameters**:
- `posseId`: Posse
- `proposalId`: Proposal

**Requirements**:
- Proposal exists
- Voting period ended
- Proposal passed (votesFor > votesAgainst)
- Quorum met (totalVotes >= quorum)
- Not already executed

**Flow**:
1. Verify proposal passed
2. Execute proposal data (low-level call)
3. Mark as executed

**Effects**:
- Proposal executed
- Emits `ProposalExecuted(posseId, proposalId)`

### Fee Distribution

#### `distributeTownPosseFees(uint256 posseId)`

**Purpose**: Distribute fees earned by posse LP position

**Similar to Bar Regulars**: Same 80/20 split

**Additional**: Tier-based distribution (optional - can be proportional)

**Flow**:
1. Calculate total fees
2. Split: 80% to members, 20% to pot
3. Distribute to members (proportional or tier-based)
4. Send 20% to CellarHook.potBalance

**Effects**:
- Members receive fees
- Pot receives 20%
- Emits `FeesDistributed(posseId, toMembers, toPot)`

## Integration with CellarHook

Same as Bar Regulars:
- Call `contributeToPot()` for fees and taxes
- Call `addLiquidity()` for adding liquidity
- Track LP tokens
- Distribute fees

## Events

```solidity
event PosseCreated(uint256 indexed posseId, address indexed creator, string name);
event MemberJoined(uint256 indexed posseId, address indexed member);
event JoinRequested(uint256 indexed posseId, address indexed requester);
event MemberApproved(uint256 indexed posseId, address indexed member);
event TierUpdated(uint256 indexed posseId, address indexed member, uint256 tier);
event PosseContributed(uint256 indexed posseId, address indexed member, uint256 amountMON, uint256 lpTokensReceived);
event PosseWithdrawn(uint256 indexed posseId, address indexed member, uint256 lpTokenAmount);
event ProposalCreated(uint256 indexed posseId, uint256 indexed proposalId, address indexed proposer, string description);
event VoteCast(uint256 indexed posseId, uint256 indexed proposalId, address indexed voter, bool support);
event ProposalExecuted(uint256 indexed posseId, uint256 indexed proposalId);
event FeesDistributed(uint256 indexed posseId, uint256 toMembers, uint256 toPot);
```

## Security Considerations

### Access Control

- Posse creation: Anyone
- Joining: Depends on openMembership
- Contributing: Only members
- Governance: Only members
- Proposal execution: Only after voting

### Governance Security

- Proposal validation
- Voting integrity
- Execution safety (low-level calls)
- Quorum requirements

### Reentrancy Protection

- ReentrancyGuard on all external functions
- Checks-effects-interactions pattern

## Testing Requirements

### Unit Tests

- Posse creation
- Member joining/approval
- Tier system
- Contributions (verify 1% tax)
- Withdrawals
- Governance (proposals, voting, execution)
- Fee distribution (verify 80/20 split)

### Integration Tests

- With CellarHook
- Fee flow verification
- Pot contribution verification
- Multiple posses simultaneously
- Governance execution

## Deployment

### Initialization Parameters

```solidity
function initialize(
    address _cellarHook,
    address _cellarZap,
    IPoolManager _poolManager,
    Currency _mon,
    Currency _keep,
    uint256 _bronzeThreshold,
    uint256 _silverThreshold,
    uint256 _goldThreshold,
    address _owner
) public initializer {
    __Ownable_init(_owner);
    __UUPSUpgradeable_init();

    cellarHook = _cellarHook;
    cellarZap = _cellarZap;
    poolManager = _poolManager;
    MON = _mon;
    KEEP = _keep;
    bronzeThreshold = _bronzeThreshold;
    silverThreshold = _silverThreshold;
    goldThreshold = _goldThreshold;
    nextPosseId = 1;
}
```

---

**Last Updated**: 2025-12-02
**Status**: Specification complete, ready for implementation
