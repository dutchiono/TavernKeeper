# Contract Reference - m00n-cabal

## Contract-by-Contract Breakdown

**Status**: ⚠️ Awaiting repository clone for detailed contract analysis

## Expected Contract Structure

### Core Contracts

#### 1. LP Position Manager
**Purpose**: Manages individual and group LP positions

**Key Functions** (Expected):
- `createPosition()` - Create new LP position
- `addLiquidity()` - Add liquidity to position
- `removeLiquidity()` - Remove liquidity from position
- `getPosition()` - Get position details
- `claimFees()` - Claim accrued fees

**State Variables** (Expected):
- `positions` - Mapping of position IDs to position data
- `userPositions` - Mapping of users to their positions
- `totalPositions` - Total number of positions

**Security Features**:
- ReentrancyGuard
- Access control
- Slippage protection

#### 2. Group Position Manager
**Purpose**: Manages group/collective LP positions

**Key Functions** (Expected):
- `createGroup()` - Create new group
- `joinGroup()` - Join existing group
- `contributeToGroup()` - Add liquidity to group
- `withdrawFromGroup()` - Remove liquidity from group
- `getGroupInfo()` - Get group details
- `distributeGroupFees()` - Distribute fees to members

**State Variables** (Expected):
- `groups` - Mapping of group IDs to group data
- `groupMembers` - Mapping of groups to members
- `memberGroups` - Mapping of members to groups

**Security Features**:
- Member verification
- Contribution limits
- Withdrawal authorization
- Fee distribution fairness

#### 3. Pool Interface
**Purpose**: Interface with underlying DEX pool

**Key Functions** (Expected):
- `addLiquidity()` - Add liquidity to pool
- `removeLiquidity()` - Remove liquidity from pool
- `getPoolInfo()` - Get pool information
- `getPrice()` - Get current price

**Integration**:
- Uniswap V3/V4
- Other DEX protocols
- Price oracles

#### 4. Fee Distributor
**Purpose**: Distribute fees to position holders

**Key Functions** (Expected):
- `accrueFees()` - Track fee accrual
- `claimFees()` - Claim fees
- `distributeFees()` - Distribute to group members
- `getAccruedFees()` - Get fee balance

**Distribution Methods**:
- Proportional to position size
- Time-weighted
- Group-based sharing

### Supporting Contracts

#### 5. Access Control
**Purpose**: Manage permissions and roles

**Key Functions**:
- `grantRole()` - Grant role to address
- `revokeRole()` - Revoke role from address
- `hasRole()` - Check if address has role
- `pause()` - Pause contract
- `unpause()` - Unpause contract

#### 6. Token Receipt
**Purpose**: ERC20 tokens representing LP positions

**Key Functions**:
- `mint()` - Mint receipt tokens
- `burn()` - Burn receipt tokens
- `transfer()` - Transfer ownership
- `balanceOf()` - Get balance

**Features**:
- Transferable
- Represent position ownership
- Used for fee distribution

## Contract Interactions

### Flow: Creating Individual Position
1. User calls `LP Position Manager.createPosition()`
2. Manager calls `Pool Interface.addLiquidity()`
3. Manager mints `Token Receipt` tokens
4. Position tracked in `LP Position Manager`

### Flow: Creating Group Position
1. User calls `Group Position Manager.createGroup()`
2. Members call `Group Position Manager.joinGroup()`
3. Members call `Group Position Manager.contributeToGroup()`
4. Manager calls `LP Position Manager.createPosition()`
5. Manager distributes `Token Receipt` tokens to members
6. Group position tracked in `Group Position Manager`

### Flow: Fee Distribution
1. Fees accrue in pool
2. `Fee Distributor.accrueFees()` tracks fees
3. Users call `Fee Distributor.claimFees()`
4. For groups, `Fee Distributor.distributeFees()` shares fees

## Security Patterns

### Reentrancy Protection
- OpenZeppelin ReentrancyGuard
- Checks-effects-interactions pattern
- External call ordering

### Access Control
- OpenZeppelin AccessControl
- Role-based permissions
- Owner/admin functions

### Slippage Protection
- Minimum output amounts
- Price oracle checks
- Maximum slippage limits

### Emergency Controls
- Pause functionality
- Withdrawal limits
- Emergency withdrawal

## Upgradeability

### Proxy Pattern (if used)
- UUPS proxy
- Implementation upgrades
- State preservation

### Initialization
- Initializer functions
- One-time setup
- Parameter configuration

## Gas Optimization

### Patterns Used
- Packed structs
- Storage optimization
- Batch operations
- Event optimization

### Considerations
- Gas costs per operation
- Batch transaction support
- Efficient data structures

---

**Note**: This document will be updated with actual contract analysis once the repository is cloned and contracts are reviewed.
