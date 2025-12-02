# Bar Regulars Manager Contract Specification

## Overview

Bar Regulars Manager is a contract that manages small groups (3-10 members) who pool liquidity together for shared LP positions in the Cellar. Groups contribute fees back to the Cellar pot, creating an integrated flywheel effect.

## Contract Details

**Contract Name**: `BarRegularsManager`
**Type**: UUPS Upgradeable Proxy
**Inheritance**: `OwnableUpgradeable`, `UUPSUpgradeable`, `Initializable`
**Purpose**: Manage small group LP positions with integrated Cellar flywheel

## Core Concepts

### Bar Regulars Group

A small, trusted group of users (3-10 members) who:
- Pool liquidity together
- Share LP positions
- Distribute fees proportionally (80% to members, 20% to pot)
- Pay 1% contribution tax when adding liquidity

### Fee Flow

**When Adding Liquidity**:
- 99% → Actual LP position (via CellarHook)
- 1% → Contribution tax to CellarHook.potBalance

**When Earning Fees**:
- 80% → Distributed to group members (proportional to contribution)
- 20% → Contributed to CellarHook.potBalance (flywheel)

**No Group Treasury**: All fees go to members or pot

## Data Structures

### BarRegularsGroup

```solidity
struct BarRegularsGroup {
    uint256 groupId;
    address creator;
    address[] members;
    uint256 maxMembers;              // Maximum members (e.g., 10)
    uint256 totalContribution;        // Total MON contributed
    mapping(address => uint256) contributions;  // Per-member contributions
    uint256 lpTokenBalance;           // Total LP tokens held by group
    mapping(address => uint256) memberShares;    // LP tokens per member
    uint256 createdAt;
    bool active;
    string groupName;
}
```

### State Variables

```solidity
mapping(uint256 => BarRegularsGroup) public groups;
mapping(address => uint256[]) public userGroups;  // Groups user belongs to
uint256 public nextGroupId;

// Constants
uint256 public constant MIN_MEMBERS = 3;
uint256 public constant MAX_MEMBERS = 10;
uint256 public constant CONTRIBUTION_TAX_BPS = 100;  // 1% = 100 basis points
uint256 public constant FLYWHEEL_FEE_BPS = 2000;      // 20% = 2000 basis points
uint256 public constant MEMBER_SHARE_BPS = 8000;      // 80% = 8000 basis points

// Dependencies
address public cellarHook;            // CellarHook contract address
address public cellarZap;              // CellarZapV4 contract address (optional)
IPoolManager public poolManager;      // Uniswap V4 PoolManager
Currency public MON;
Currency public KEEP;
```

## Key Functions

### Group Management

#### `createBarRegularsGroup(string memory name, uint256 maxMembers, address[] memory initialMembers)`

**Purpose**: Create a new Bar Regulars group

**Parameters**:
- `name`: Group name
- `maxMembers`: Maximum members (3-10)
- `initialMembers`: Initial members (must include creator)

**Requirements**:
- `maxMembers >= MIN_MEMBERS && maxMembers <= MAX_MEMBERS`
- `initialMembers.length >= 1` (at least creator)
- `initialMembers.length <= maxMembers`
- Creator must be in initialMembers

**Returns**: `uint256 groupId`

**Effects**:
- Creates new group with nextGroupId
- Sets creator and members
- Sets maxMembers
- Marks group as active
- Increments nextGroupId
- Emits `GroupCreated(groupId, creator, name)`

#### `joinBarRegularsGroup(uint256 groupId)`

**Purpose**: Join an existing group (if open)

**Parameters**:
- `groupId`: Group to join

**Requirements**:
- Group exists and is active
- Group not full (`members.length < maxMembers`)
- Caller not already a member
- Group allows open membership (or invite-only logic)

**Effects**:
- Adds caller to group members
- Adds groupId to userGroups[caller]
- Emits `MemberJoined(groupId, msg.sender)`

#### `inviteToBarRegularsGroup(uint256 groupId, address member)`

**Purpose**: Invite a member (if permissioned)

**Parameters**:
- `groupId`: Group to invite to
- `member`: Address to invite

**Requirements**:
- Caller is group creator or member (permission logic)
- Group not full
- Member not already in group

**Effects**:
- Adds member to group
- Emits `MemberInvited(groupId, member)`

### Liquidity Management

#### `contributeToBarRegularsGroup(uint256 groupId, uint256 amountMON, uint256 amountKEEP)`

**Purpose**: Add liquidity to a group

**Parameters**:
- `groupId`: Group to contribute to
- `amountMON`: Amount of MON to contribute
- `amountKEEP`: Amount of KEEP to contribute

**Requirements**:
- Caller is group member
- Group is active
- `amountMON > 0 && amountKEEP > 0`
- Caller has approved tokens (if ERC20)

**Flow**:
1. Calculate 1% contribution tax: `tax = (amountMON * CONTRIBUTION_TAX_BPS) / 10000`
2. Calculate net amount: `netAmount = amountMON - tax`
3. Send tax to CellarHook: `CellarHook.contributeToPot{value: tax}()`
4. Call CellarHook.addLiquidity() with netAmount and amountKEEP
5. Track LP tokens received
6. Update member shares proportionally
7. Update totalContribution

**Returns**: `uint256 lpTokensReceived`

**Effects**:
- Group LP balance increases
- Member shares updated
- Pot receives 1% tax
- Emits `GroupContributed(groupId, msg.sender, amountMON, lpTokensReceived)`

#### `withdrawFromBarRegularsGroup(uint256 groupId, uint256 lpTokenAmount)`

**Purpose**: Remove liquidity from group

**Parameters**:
- `groupId`: Group to withdraw from
- `lpTokenAmount`: LP tokens to withdraw

**Requirements**:
- Caller is group member
- Caller has enough shares: `memberShares[groupId][msg.sender] >= lpTokenAmount`
- Group has enough LP: `lpTokenBalance >= lpTokenAmount`

**Flow**:
1. Calculate proportional MON+KEEP to return
2. Burn LP tokens (via CellarHook or transfer back)
3. Return MON+KEEP to member
4. Update member shares
5. Update group LP balance

**Returns**: `(uint256 amountMON, uint256 amountKEEP)`

**Effects**:
- Member shares decrease
- Group LP balance decreases
- Member receives tokens
- Emits `GroupWithdrawn(groupId, msg.sender, lpTokenAmount)`

### Fee Distribution

#### `distributeGroupFees(uint256 groupId)`

**Purpose**: Distribute fees earned by group LP position

**Parameters**:
- `groupId`: Group to distribute fees for

**Requirements**:
- Group exists and is active
- Group has LP tokens
- Fees have been earned (calculation needed)

**Flow**:
1. Calculate total fees earned by group's LP position
2. Calculate split:
   - `toMembers = totalFees * MEMBER_SHARE_BPS / 10000` (80%)
   - `toPot = totalFees * FLYWHEEL_FEE_BPS / 10000` (20%)
3. Send toPot to CellarHook: `CellarHook.contributeToPot{value: toPot}()`
4. Distribute toMembers to group members proportionally
5. Reset fee tracking

**Effects**:
- Members receive proportional fees
- Pot receives 20% contribution
- Emits `FeesDistributed(groupId, toMembers, toPot)`

#### `claimBarRegularsFees(uint256 groupId)`

**Purpose**: Claim fees for a specific member

**Parameters**:
- `groupId`: Group to claim from

**Requirements**:
- Caller is group member
- Caller has accrued fees

**Flow**:
1. Calculate caller's share of fees
2. Transfer fees to caller
3. Update fee tracking

**Returns**: `uint256 feesClaimed`

**Effects**:
- Member receives fees
- Fee tracking updated
- Emits `FeesClaimed(groupId, msg.sender, feesClaimed)`

### View Functions

#### `getBarRegularsGroup(uint256 groupId)`

**Purpose**: Get group information

**Returns**: Group struct (members array, balances, etc.)

#### `getMemberShares(uint256 groupId, address member)`

**Purpose**: Get member's LP token shares

**Returns**: `uint256 shares`

#### `getGroupLPTokens(uint256 groupId)`

**Purpose**: Get total LP tokens held by group

**Returns**: `uint256 lpTokens`

#### `getUserGroups(address user)`

**Purpose**: Get all groups user belongs to

**Returns**: `uint256[] groupIds`

## Integration with CellarHook

### Calling CellarHook Functions

**Adding Liquidity**:
```solidity
// Calculate tax
uint256 tax = (amountMON * CONTRIBUTION_TAX_BPS) / 10000;
uint256 netAmount = amountMON - tax;

// Send tax to pot
ICellarHook(cellarHook).contributeToPot{value: tax}();

// Add liquidity
ICellarHook(cellarHook).addLiquidity{value: netAmount}(
    poolKey,
    netAmount,
    amountKEEP,
    0,
    0
);

// Track LP tokens received
uint256 lpReceived = IERC20(cellarHook).balanceOf(address(this)) - group.lpTokenBalance;
group.lpTokenBalance += lpReceived;
```

**Contributing Fees**:
```solidity
// Calculate fee split
uint256 toPot = totalFees * FLYWHEEL_FEE_BPS / 10000;

// Send to pot
ICellarHook(cellarHook).contributeToPot{value: toPot}();
```

**Checking Pot Balance**:
```solidity
uint256 potBalance = ICellarHook(cellarHook).potBalance();
```

**Getting Auction Price**:
```solidity
uint256 price = ICellarHook(cellarHook).getAuctionPrice();
```

## Events

```solidity
event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
event MemberJoined(uint256 indexed groupId, address indexed member);
event MemberInvited(uint256 indexed groupId, address indexed member);
event GroupContributed(uint256 indexed groupId, address indexed member, uint256 amountMON, uint256 lpTokensReceived);
event GroupWithdrawn(uint256 indexed groupId, address indexed member, uint256 lpTokenAmount);
event FeesDistributed(uint256 indexed groupId, uint256 toMembers, uint256 toPot);
event FeesClaimed(uint256 indexed groupId, address indexed member, uint256 feesClaimed);
```

## Security Considerations

### Access Control

- Group creation: Anyone can create
- Joining: Depends on group settings (open/permissioned)
- Contributing: Only members
- Withdrawing: Only members, only own shares
- Fee distribution: Only members

### Reentrancy Protection

- Use ReentrancyGuard on all external functions
- Checks-effects-interactions pattern
- External calls at end of functions

### Validation

- Member verification before operations
- Contribution amount validation
- LP token balance validation
- Group state validation (active, not full, etc.)

### Fee Distribution Accuracy

- Precise calculation of proportional shares
- Rounding handled correctly
- Total always equals 100% (80% + 20%)

## Gas Optimization

### Storage Optimization

- Pack structs efficiently
- Use mappings instead of arrays where possible
- Cache storage reads

### Batch Operations

- Consider batch fee distribution
- Consider batch member operations

### External Calls

- Minimize external calls
- Batch approvals if possible

## Testing Requirements

### Unit Tests

- Group creation
- Member joining/inviting
- Contributions (verify 1% tax)
- Withdrawals
- Fee distribution (verify 80/20 split)
- Edge cases (empty groups, single member, full group)

### Integration Tests

- With CellarHook
- Fee flow verification
- Pot contribution verification
- Multiple groups simultaneously

## Deployment

### Initialization Parameters

```solidity
function initialize(
    address _cellarHook,
    address _cellarZap,
    IPoolManager _poolManager,
    Currency _mon,
    Currency _keep,
    address _owner
) public initializer {
    __Ownable_init(_owner);
    __UUPSUpgradeable_init();

    cellarHook = _cellarHook;
    cellarZap = _cellarZap;
    poolManager = _poolManager;
    MON = _mon;
    KEEP = _keep;
    nextGroupId = 1;
}
```

### Upgrade Considerations

- Storage layout compatibility
- New functions additive only
- Existing groups unaffected

---

**Last Updated**: 2025-12-02
**Status**: Specification complete, ready for implementation
