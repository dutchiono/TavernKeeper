# TavernKeeper System Implementation Roadmap

## Overview

This roadmap outlines the step-by-step implementation of the TavernKeeper NFT system with KEEP token minting, Dutch auction, and game mechanics integration. The implementation is divided into phases with clear dependencies and deliverables.

---

## Phase 1: Smart Contract Development

### 1.1 KeepToken Contract

**Priority**: High
**Dependencies**: None
**Estimated Time**: 2-3 days

#### Tasks

1. **Contract Implementation**
   - [ ] Create `packages/contracts/contracts/KeepToken.sol`
   - [ ] Implement ERC-20 upgradeable (UUPS pattern)
   - [ ] Add minting function (only callable by TavernKeeper contract)
   - [ ] Implement redemption mechanism (KEEP → GOLD)
   - [ ] Add redemption rate management
   - [ ] Emit events for subgraph indexing

2. **Security**
   - [ ] Add ReentrancyGuard
   - [ ] Implement access control checks
   - [ ] Add input validation
   - [ ] Test overflow/underflow protection

3. **Testing**
   - [ ] Unit tests for minting
   - [ ] Unit tests for redemption
   - [ ] Integration tests with TavernKeeper
   - [ ] Gas optimization tests

#### Deliverables

- `KeepToken.sol` contract
- Test suite (`test/KeepToken.test.ts`)
- Deployment script updates

---

### 1.2 Enhanced TavernKeeper Contract

**Priority**: High
**Dependencies**: KeepToken contract
**Estimated Time**: 3-4 days

#### Tasks

1. **Contract Updates**
   - [ ] Add KEEP token contract reference
   - [ ] Implement token minting logic (time-based)
   - [ ] Add claimTokens function with cooldown
   - [ ] Implement minting rate management
   - [ ] Add free hero minting function
   - [ ] Add metadata update function
   - [ ] Integrate with Adventurer contract

2. **Data Structures**
   - [ ] Add TavernKeeperData struct
   - [ ] Implement per-NFT storage mapping
   - [ ] Add minting rate tracking

3. **Security**
   - [ ] Access control for all functions
   - [ ] Reentrancy protection
   - [ ] Cooldown enforcement
   - [ ] Input validation

4. **Testing**
   - [ ] Token minting tests
   - [ ] Claim mechanism tests
   - [ ] Free hero minting tests
   - [ ] Metadata update tests
   - [ ] Integration with KeepToken tests

#### Deliverables

- Updated `TavernKeeper.sol` contract
- Test suite (`test/TavernKeeper.test.ts`)
- Migration guide for existing deployments

---

### 1.3 Dutch Auction Contract

**Priority**: Medium
**Dependencies**: Enhanced TavernKeeper contract
**Estimated Time**: 2-3 days

#### Tasks

1. **Contract Implementation**
   - [ ] Create `packages/contracts/contracts/DutchAuction.sol`
   - [ ] Implement price calculation (linear decrease)
   - [ ] Add purchase function with refund logic
   - [ ] Implement auction lifecycle management
   - [ ] Add fund withdrawal mechanism

2. **Integration**
   - [ ] Integrate with TavernKeeper minting
   - [ ] Add purchase tracking
   - [ ] Implement auction end logic

3. **Security**
   - [ ] Front-running protection (optional commit-reveal)
   - [ ] Refund safety checks
   - [ ] Access control
   - [ ] Price manipulation protection

4. **Testing**
   - [ ] Price calculation tests
   - [ ] Purchase flow tests
   - [ ] Refund mechanism tests
   - [ ] Edge case tests (early end, sold out, etc.)

#### Deliverables

- `DutchAuction.sol` contract
- Test suite (`test/DutchAuction.test.ts`)
- Integration tests with TavernKeeper

---

### 1.4 Contract Deployment

**Priority**: High
**Dependencies**: All contracts complete and tested
**Estimated Time**: 1-2 days

#### Tasks

1. **Deployment Scripts**
   - [ ] Update `packages/contracts/scripts/deploy.ts`
   - [ ] Add KeepToken deployment
   - [ ] Add DutchAuction deployment
   - [ ] Update TavernKeeper deployment
   - [ ] Add initialization sequence

2. **Configuration**
   - [ ] Set initial minting rates
   - [ ] Configure redemption rate
   - [ ] Set auction parameters
   - [ ] Configure contract addresses

3. **Verification**
   - [ ] Verify all contracts on block explorer
   - [ ] Update contract registry
   - [ ] Document deployment addresses

#### Deliverables

- Updated deployment scripts
- Deployment documentation
- Contract addresses registry

---

## Phase 2: Backend Integration

### 2.1 Database Schema Updates

**Priority**: High
**Dependencies**: None
**Estimated Time**: 1 day

#### Tasks

1. **Migration Creation**
   - [ ] Create `supabase/migrations/20250102000000_token_system.sql`
   - [ ] Add `keep_tokens` column to `loot_claims`
   - [ ] Add `collaborator_tokens` column to `loot_claims`
   - [ ] Create `tavernkeeper_metadata` table
   - [ ] Add indexes for performance
   - [ ] Add RLS policies

2. **Schema Validation**
   - [ ] Test migration on local database
   - [ ] Verify indexes are created
   - [ ] Test RLS policies
   - [ ] Document schema changes

#### Deliverables

- Database migration file
- Schema documentation
- Migration test results

---

### 2.2 Engine Token Drop Logic

**Priority**: High
**Dependencies**: Database schema
**Estimated Time**: 2-3 days

#### Tasks

1. **Monster Configuration**
   - [ ] Update monster type definitions
   - [ ] Add token drop configuration to map files
   - [ ] Create token drop config interface
   - [ ] Update existing monster definitions

2. **Loot Calculation**
   - [ ] Implement `calculateMonsterLoot` function
   - [ ] Add KEEP token drop logic
   - [ ] Add collaborator token drop logic
   - [ ] Integrate with existing loot system
   - [ ] Add RNG for drop chances

3. **Run Completion Updates**
   - [ ] Update `completeRun` function
   - [ ] Aggregate token drops per adventurer
   - [ ] Store token data in loot claims
   - [ ] Update run results interface

4. **Testing**
   - [ ] Unit tests for token drop calculation
   - [ ] Integration tests with combat system
   - [ ] Test edge cases (no drops, multiple drops)
   - [ ] Verify RNG determinism

#### Deliverables

- Updated engine code
- Token drop calculation functions
- Updated monster definitions
- Test suite

---

### 2.3 Loot Claim Service Updates

**Priority**: High
**Dependencies**: Engine updates, contracts deployed
**Estimated Time**: 2-3 days

#### Tasks

1. **Service Updates**
   - [ ] Update `LootClaim` interface
   - [ ] Add token fields to `createLootClaims`
   - [ ] Update `claimLoot` to handle tokens
   - [ ] Add `claimKeepTokens` function
   - [ ] Add `claimCollaboratorTokens` function

2. **Token Claiming**
   - [ ] Implement KEEP token transfer
   - [ ] Implement collaborator token transfers
   - [ ] Add batch token claiming
   - [ ] Handle gas estimation for tokens
   - [ ] Add error handling

3. **API Updates**
   - [ ] Update `/api/loot/claim` endpoint
   - [ ] Add token balance endpoints
   - [ ] Add token claim history endpoints
   - [ ] Update response schemas

4. **Testing**
   - [ ] Unit tests for token claiming
   - [ ] Integration tests with contracts
   - [ ] Test error scenarios
   - [ ] Gas optimization tests

#### Deliverables

- Updated `lootClaim.ts` service
- Updated API routes
- Test suite
- API documentation

---

### 2.4 Token Services

**Priority**: Medium
**Dependencies**: Contracts deployed
**Estimated Time**: 2 days

#### Tasks

1. **KEEP Token Service**
   - [ ] Create `apps/web/lib/services/keepToken.ts`
   - [ ] Add balance fetching
   - [ ] Add claim function
   - [ ] Add redemption function
   - [ ] Add minting rate queries

2. **Redemption Service**
   - [ ] Create `apps/web/lib/services/tokenRedemption.ts`
   - [ ] Implement KEEP → GOLD conversion
   - [ ] Add rate fetching
   - [ ] Add approval handling
   - [ ] Add transaction tracking

3. **Testing**
   - [ ] Unit tests for services
   - [ ] Integration tests with contracts
   - [ ] Error handling tests

#### Deliverables

- Token service files
- Redemption service
- Test suites

---

### 2.5 Personalization Service

**Priority**: Medium
**Dependencies**: Database schema, contracts
**Estimated Time**: 2 days

#### Tasks

1. **Service Implementation**
   - [ ] Create `apps/web/lib/services/tavernKeeperPersonalization.ts`
   - [ ] Add metadata fetching
   - [ ] Add metadata update function
   - [ ] Add visual traits management
   - [ ] Integrate with IPFS (if needed)

2. **API Endpoints**
   - [ ] Create `/api/tavernkeeper/metadata` GET
   - [ ] Create `/api/tavernkeeper/metadata` PUT
   - [ ] Add validation
   - [ ] Add authentication

3. **Testing**
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Validation tests

#### Deliverables

- Personalization service
- API endpoints
- Test suite

---

## Phase 3: Frontend Development

### 3.1 TavernKeeper Display Component

**Priority**: High
**Dependencies**: Personalization service
**Estimated Time**: 2-3 days

#### Tasks

1. **Component Development**
   - [ ] Create `apps/web/components/tavernkeeper/TavernKeeperDisplay.tsx`
   - [ ] Fetch TavernKeeper data
   - [ ] Display personalized sprite/image
   - [ ] Add loading states
   - [ ] Add error handling

2. **Homepage Integration**
   - [ ] Update `apps/web/app/page.tsx`
   - [ ] Add TavernKeeper display
   - [ ] Handle user login state
   - [ ] Add conditional rendering

3. **Styling**
   - [ ] Match game aesthetic
   - [ ] Add animations
   - [ ] Responsive design
   - [ ] Pixel art styling

#### Deliverables

- TavernKeeper display component
- Homepage integration
- Styled components

---

### 3.2 Token Claim Interface

**Priority**: High
**Dependencies**: Token services
**Estimated Time**: 2-3 days

#### Tasks

1. **Component Development**
   - [ ] Create `apps/web/components/tokens/TokenClaimModal.tsx`
   - [ ] Display pending KEEP tokens
   - [ ] Show claim button
   - [ ] Display claim history
   - [ ] Add cooldown timer

2. **Integration**
   - [ ] Integrate with TavernKeeper service
   - [ ] Add wallet connection
   - [ ] Handle transaction states
   - [ ] Add success/error feedback

3. **UI/UX**
   - [ ] Clear pending amount display
   - [ ] Transaction status indicators
   - [ ] Gas estimation display
   - [ ] Mobile responsive

#### Deliverables

- Token claim modal component
- Integration with services
- UI components

---

### 3.3 Personalization UI

**Priority**: Medium
**Dependencies**: Personalization service
**Estimated Time**: 3-4 days

#### Tasks

1. **Component Development**
   - [ ] Create `apps/web/components/tavernkeeper/PersonalizationPanel.tsx`
   - [ ] Add name input
   - [ ] Add visual trait selectors
   - [ ] Add preview functionality
   - [ ] Add save/cancel buttons

2. **Trait System**
   - [ ] Define trait categories
   - [ ] Create trait selection UI
   - [ ] Add trait preview
   - [ ] Handle trait combinations

3. **Integration**
   - [ ] Connect to personalization service
   - [ ] Handle metadata updates
   - [ ] Add transaction handling
   - [ ] Add success feedback

#### Deliverables

- Personalization panel component
- Trait selection UI
- Integration with services

---

### 3.4 Dutch Auction Interface

**Priority**: Medium
**Dependencies**: Dutch auction contract
**Estimated Time**: 3-4 days

#### Tasks

1. **Component Development**
   - [ ] Create `apps/web/components/auction/DutchAuctionInterface.tsx`
   - [ ] Display current price
   - [ ] Show price countdown
   - [ ] Add purchase button
   - [ ] Display auction status

2. **Real-time Updates**
   - [ ] Poll for price updates
   - [ ] Update UI in real-time
   - [ ] Show time remaining
   - [ ] Display NFTs sold

3. **Transaction Handling**
   - [ ] Handle purchase transactions
   - [ ] Show transaction status
   - [ ] Handle refunds
   - [ ] Add success feedback

#### Deliverables

- Dutch auction interface component
- Real-time price updates
- Transaction handling

---

### 3.5 Token Redemption UI

**Priority**: Medium
**Dependencies**: Redemption service
**Estimated Time**: 2 days

#### Tasks

1. **Component Development**
   - [ ] Create `apps/web/components/tokens/TokenRedemption.tsx`
   - [ ] Display KEEP balance
   - [ ] Add redemption amount input
   - [ ] Show conversion rate
   - [ ] Display GOLD output

2. **Integration**
   - [ ] Connect to redemption service
   - [ ] Handle approvals
   - [ ] Process transactions
   - [ ] Show success feedback

#### Deliverables

- Token redemption component
- Integration with services

---

## Phase 4: Subgraph Development

### 4.1 Schema Definition

**Priority**: Medium
**Dependencies**: Contracts deployed
**Estimated Time**: 1 day

#### Tasks

1. **Schema Creation**
   - [ ] Create `schema.graphql`
   - [ ] Define TavernKeeper entity
   - [ ] Define TokenClaim entity
   - [ ] Define Auction entity
   - [ ] Define relationships

2. **Entity Design**
   - [ ] Optimize for queries
   - [ ] Add necessary fields
   - [ ] Define indexes

#### Deliverables

- GraphQL schema file
- Entity documentation

---

### 4.2 Event Handlers

**Priority**: Medium
**Dependencies**: Schema defined
**Estimated Time**: 2-3 days

#### Tasks

1. **Handler Implementation**
   - [ ] Create handlers for TavernKeeper events
   - [ ] Create handlers for KeepToken events
   - [ ] Create handlers for DutchAuction events
   - [ ] Implement entity updates

2. **Testing**
   - [ ] Test event indexing
   - [ ] Verify data accuracy
   - [ ] Test query performance

#### Deliverables

- Event handler code
- Test results

---

### 4.3 Query Optimization

**Priority**: Low
**Dependencies**: Handlers complete
**Estimated Time**: 1-2 days

#### Tasks

1. **Query Creation**
   - [ ] Create common queries
   - [ ] Optimize query performance
   - [ ] Add pagination
   - [ ] Add filtering

2. **Documentation**
   - [ ] Document query patterns
   - [ ] Create query examples
   - [ ] Add performance notes

#### Deliverables

- Optimized queries
- Query documentation

---

## Phase 5: Testing & Deployment

### 5.1 Integration Testing

**Priority**: High
**Dependencies**: All phases complete
**Estimated Time**: 3-4 days

#### Tasks

1. **End-to-End Tests**
   - [ ] Test complete token minting flow
   - [ ] Test token claiming flow
   - [ ] Test redemption flow
   - [ ] Test personalization flow
   - [ ] Test Dutch auction flow

2. **Game Integration Tests**
   - [ ] Test monster token drops
   - [ ] Test loot claiming with tokens
   - [ ] Test run completion with tokens
   - [ ] Verify token amounts

3. **Edge Cases**
   - [ ] Test cooldown enforcement
   - [ ] Test rate limiting
   - [ ] Test error scenarios
   - [ ] Test gas optimization

#### Deliverables

- Comprehensive test suite
- Test results documentation
- Bug fixes

---

### 5.2 Security Audit

**Priority**: High
**Dependencies**: Integration tests pass
**Estimated Time**: 1-2 weeks (external)

#### Tasks

1. **Audit Preparation**
   - [ ] Prepare audit documentation
   - [ ] Create test scenarios
   - [ ] Document security considerations

2. **Audit Execution**
   - [ ] External security audit
   - [ ] Address audit findings
   - [ ] Re-test after fixes

#### Deliverables

- Audit report
- Security fixes
- Updated documentation

---

### 5.3 Testnet Deployment

**Priority**: High
**Dependencies**: Security audit complete
**Estimated Time**: 2-3 days

#### Tasks

1. **Deployment**
   - [ ] Deploy contracts to testnet
   - [ ] Deploy subgraph
   - [ ] Update frontend config
   - [ ] Test all functionality

2. **Verification**
   - [ ] Verify contract addresses
   - [ ] Test all user flows
   - [ ] Verify subgraph indexing
   - [ ] Test with real users

#### Deliverables

- Testnet deployment
- Test results
- User feedback

---

### 5.4 Mainnet Deployment

**Priority**: High
**Dependencies**: Testnet successful
**Estimated Time**: 1-2 days

#### Tasks

1. **Final Preparation**
   - [ ] Final security review
   - [ ] Prepare deployment scripts
   - [ ] Set up monitoring
   - [ ] Prepare rollback plan

2. **Deployment**
   - [ ] Deploy contracts to mainnet
   - [ ] Deploy subgraph
   - [ ] Update production config
   - [ ] Monitor deployment

3. **Post-Deployment**
   - [ ] Verify all systems
   - [ ] Monitor for issues
   - [ ] Collect user feedback
   - [ ] Document deployment

#### Deliverables

- Mainnet deployment
- Deployment documentation
- Monitoring setup

---

## Dependencies Graph

```
Phase 1 (Contracts)
├── KeepToken → TavernKeeper → DutchAuction
└── All contracts → Deployment

Phase 2 (Backend)
├── Database Schema → Engine Updates → Loot Claim Updates
├── Contracts → Token Services
└── Database Schema → Personalization Service

Phase 3 (Frontend)
├── Personalization Service → TavernKeeper Display
├── Token Services → Token Claim UI
├── Personalization Service → Personalization UI
├── Dutch Auction Contract → Auction UI
└── Redemption Service → Redemption UI

Phase 4 (Subgraph)
└── Contracts Deployed → Schema → Handlers → Queries

Phase 5 (Testing & Deployment)
└── All Phases → Integration Tests → Audit → Testnet → Mainnet
```

---

## Estimated Timeline

- **Phase 1**: 8-12 days
- **Phase 2**: 9-12 days
- **Phase 3**: 12-16 days
- **Phase 4**: 4-6 days
- **Phase 5**: 3-4 weeks (including audit)

**Total**: ~8-10 weeks (excluding external audit time)

---

## Risk Mitigation

### Technical Risks

1. **Gas Costs**: Monitor and optimize contract gas usage
2. **Scalability**: Test with high transaction volumes
3. **Security**: Comprehensive audit before mainnet
4. **Integration**: Thorough integration testing

### Economic Risks

1. **Token Economics**: Model and test token distribution
2. **Redemption Rate**: Monitor and adjust as needed
3. **Auction Pricing**: Test auction mechanics thoroughly

### Operational Risks

1. **Deployment**: Have rollback plan ready
2. **Monitoring**: Set up comprehensive monitoring
3. **Support**: Prepare user support documentation

---

## Success Criteria

1. ✅ All contracts deployed and verified
2. ✅ Token minting working correctly
3. ✅ Token drops from monsters functional
4. ✅ Redemption mechanism operational
5. ✅ Personalization system working
6. ✅ Dutch auction successful
7. ✅ All tests passing
8. ✅ Security audit passed
9. ✅ User acceptance testing successful
10. ✅ Mainnet deployment successful

---

## Next Steps

1. Review and approve this roadmap
2. Assign team members to phases
3. Set up project tracking
4. Begin Phase 1 implementation
5. Schedule regular progress reviews
