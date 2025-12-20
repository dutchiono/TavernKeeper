KEEP Token Migration and Treasury Setup Plan
Overview
Migrate from GOLD token to KEEP token system. KEEP will serve dual purpose: tradable ERC-20 token in wallets and in-game currency when held by TBAs. Remove all mock states and use real on-chain data. Set up treasury system similar to donut-miner.

Phase 1: KeepToken Contract Creation
1.1 Create KeepToken.sol
File: packages/contracts/contracts/KeepToken.sol

ERC-20 upgradeable (UUPS pattern, matching existing contracts)
Name: "Tavern Keeper", Symbol: "KEEP", Decimals: 18
Only TavernKeeper contract can mint tokens
Treasury address for fee collection (initialized to deployer, changeable)
No initial supply minting (all tokens minted by TavernKeeper NFTs)
Events for subgraph indexing
Key Functions:

initialize(address _treasury, address _tavernKeeperContract) - Setup
mintTokens(address to, uint256 amount, uint256 tavernKeeperId) - Only callable by TavernKeeper
setTreasury(address _treasury) - Owner can update treasury
setTavernKeeperContract(address _contract) - Owner can set minting contract
1.2 Security Features
ReentrancyGuard for minting
Access control (only TavernKeeper can mint)
Input validation
UUPS upgradeable pattern
Phase 2: Update TavernKeeper Contract
2.1 Enhance TavernKeeper.sol
File: packages/contracts/contracts/TavernKeeper.sol

Add KEEP token minting functionality:

Reference to KeepToken contract
Time-based minting rate per NFT
Claim cooldown mechanism
Per-NFT data tracking (lastClaimTime, mintingRate, totalClaimed)
Free hero minting on TavernKeeper mint
New Functions:

setKeepTokenContract(address _keepToken) - Set KEEP token address
claimTokens(uint256 tokenId) - Claim pending KEEP tokens
calculatePendingTokens(uint256 tokenId) - View function for pending tokens
mintFreeHero(uint256 tavernKeeperId) - Mint free hero to owner
Phase 3: Remove GOLD Token References
3.1 Code References to Remove
Files to update:

packages/contracts/contracts/GoldToken.sol - Keep file but mark as deprecated
packages/contracts/scripts/deploy.ts - Remove GOLD deployment, add KEEP
packages/contracts/scripts/testnetWorkflow.ts - Replace GOLD with KEEP
packages/contracts/test/*.test.ts - Update all tests to use KEEP
apps/web/lib/contracts/registry.ts - Replace GOLD_TOKEN with KEEP_TOKEN
apps/web/lib/stores/gameStore.ts - Remove gold: 450 mock state
apps/web/app/page.tsx - Remove mock gold display, use real KEEP balance
All service files referencing GOLD
3.2 Environment Variables
Files: .env, .env.example (all in root)

Replace:

NEXT_PUBLIC_ERC20_TOKEN_ADDRESS → NEXT_PUBLIC_KEEP_TOKEN_ADDRESS
Remove NEXT_PUBLIC_ERC20_TOKEN_IMPLEMENTATION_ADDRESS
Add NEXT_PUBLIC_KEEP_TOKEN_IMPLEMENTATION_ADDRESS
Add NEXT_PUBLIC_TREASURY_ADDRESS (set to deployer for now)
3.3 Documentation Updates
File: packages/contracts/DEPLOYMENT_TRACKER.md

Mark GoldToken as DEPRECATED in contract inventory
Add note: "Replaced by KeepToken. Contract remains deployed but unused."
Add KeepToken to deployment history
Update environment variables section
Document treasury address
Phase 4: Remove Mock States
4.1 Game Store Updates
File: apps/web/lib/stores/gameStore.ts

Remove gold: number from GameState interface
Remove gold: 450 from initial state
Add keepBalance: string (from on-chain query)
Add function to fetch real KEEP balance from wallet/TBA
4.2 UI Updates
File: apps/web/app/page.tsx

Remove hardcoded 450g display
Replace with real KEEP balance query
Show balance from user wallet or TavernKeeper TBA
Add loading state for balance fetch
4.3 Service Layer
New File: apps/web/lib/services/keepToken.ts

Create service for KEEP token operations:

getKeepBalance(address) - Get balance from contract
getKeepBalanceFromTBA(nftContract, tokenId) - Get balance from TBA
formatKeepBalance(balance) - Format for display
Integration with wagmi/viem
Phase 5: Treasury System Setup
5.1 Treasury Configuration
Initial Setup:

Use deployer address: 0xEC4bc7451B9058D42Ea159464C6dA14a322946fD
Stored in KeepToken contract as treasury address
Can be updated via setTreasury() function (owner only)
Document in DEPLOYMENT_TRACKER.md
5.2 Fee Collection Integration
Files: packages/contracts/contracts/Inventory.sol, packages/contracts/contracts/DutchAuction.sol

Inventory contract already has fee recipient (update to use treasury)
Dutch auction proceeds go to treasury
All protocol fees flow to treasury address
5.3 Treasury Documentation
File: packages/contracts/DEPLOYMENT_TRACKER.md

Add treasury section:

Treasury address
Fee collection sources
Update mechanism
Future multisig migration path
Phase 6: Deployment Updates
6.1 Deployment Script
File: packages/contracts/scripts/deploy.ts

Changes:

Remove GoldToken deployment
Add KeepToken deployment (UUPS proxy)
Initialize KeepToken with treasury and TavernKeeper addresses
Update deployment info JSON output
Update console output messages
6.2 Testnet Workflow
File: packages/contracts/scripts/testnetWorkflow.ts

Replace GOLD operations with KEEP
Test KEEP minting from TavernKeeper
Test KEEP balance queries
Verify treasury address
6.3 Test Updates
Files: packages/contracts/test/*.test.ts

Update all tests to use KeepToken instead of GoldToken
Test minting functionality
Test treasury updates
Test access control
Phase 7: Frontend Integration
7.1 Contract Registry
File: apps/web/lib/contracts/registry.ts

Remove GOLD_TOKEN entry
Add KEEP_TOKEN entry with ABI and address
Update all references throughout codebase
7.2 Balance Display
Files: All components showing gold/balance

Replace GOLD balance queries with KEEP
Update display formatting
Add TBA balance support (for in-game gold)
Handle both wallet and TBA balances
7.3 Service Updates
Files: apps/web/lib/services/*.ts

Update lootClaim.ts to use KEEP instead of GOLD
Update marketplace.ts to use KEEP for pricing
Update any other services referencing GOLD
Phase 8: Documentation and Tracking
8.1 Deployment Tracker
File: packages/contracts/DEPLOYMENT_TRACKER.md

Updates:

Mark GoldToken as DEPRECATED
Add KeepToken deployment section
Document treasury address
Update environment variables list
Add migration notes
8.2 Configuration Files
Files: apps/web/MONAD_CONFIG.md, .env.example

Update all GOLD references to KEEP
Add treasury address documentation
Update contract addresses section
8.3 Migration Notes
New File: packages/contracts/MIGRATION_NOTES.md

Document:

Why GOLD was replaced
Migration date
Treasury setup
How to update treasury address
Breaking changes
Files to Create
packages/contracts/contracts/KeepToken.sol - New KEEP token contract
apps/web/lib/services/keepToken.ts - KEEP token service
packages/contracts/MIGRATION_NOTES.md - Migration documentation
Files to Modify
packages/contracts/contracts/TavernKeeper.sol - Add KEEP minting
packages/contracts/contracts/GoldToken.sol - Add deprecation comment
packages/contracts/scripts/deploy.ts - Replace GOLD with KEEP
packages/contracts/scripts/testnetWorkflow.ts - Update for KEEP
packages/contracts/DEPLOYMENT_TRACKER.md - Mark GOLD deprecated, add KEEP
packages/contracts/test/*.test.ts - Update all tests
apps/web/lib/contracts/registry.ts - Replace GOLD_TOKEN with KEEP_TOKEN
apps/web/lib/stores/gameStore.ts - Remove mock gold, add real KEEP
apps/web/app/page.tsx - Use real KEEP balance
apps/web/lib/services/lootClaim.ts - Update for KEEP
apps/web/lib/services/marketplace.ts - Update for KEEP
All .env files - Update environment variables
apps/web/MONAD_CONFIG.md - Update documentation
Key Design Decisions
Treasury: Uses deployer address initially, easily changeable via setTreasury()
GOLD Deprecation: Contract remains deployed but marked deprecated, all code references removed
Mock States: Completely removed, all balances from on-chain queries
Dual Purpose: KEEP works as ERC-20 in wallets and currency in TBAs (same token, different context)
No Migration: Fresh start with KEEP, no GOLD balance migration needed
Success Criteria
KeepToken contract deployed and verified
All GOLD references removed from code
GOLD marked as deprecated in tracker
Mock states removed, real on-chain data used
Treasury address configured and documented
All tests passing with KEEP
Frontend displays real KEEP balances
Deployment tracker fully updated
