Mobile UI Redesign and Navigation Restructure
Overview
Redesign the mobile/miniapp interface to better fit viewport, restructure navigation, improve information display, and add contextual help system.

Key Changes
1. Bottom Navigation Restructure
File: apps/web/components/BottomNav.tsx

Remove Posse button (currently routes to /town-posse)
Remove Regulars button (currently routes to /tavern-regulars)
Add Chat button as last nav item (opens chat overlay/modal)
Keep: Inn, Cellar, Map, Battle, Party (5 items total)
Implementation:

Remove buttons for /town-posse and /tavern-regulars
Add new Chat button that triggers GameView.CHAT or opens chat modal
Update GameView enum if needed to include CHAT
2. Cellar Page Enhancements
File: apps/web/components/TheCellarView.tsx

Fix black background: Change from `bg-[#2a1d17]` to proper background with texture/pattern
Add access buttons for Posse and Regulars:
Add two buttons/links: "TOWN POSSE" and "TAVERN REGULARS"
Place them below the "MINT LP" section or in a dedicated section
Route to /town-posse and /tavern-regulars respectively
Improve spacing and padding to fit mobile viewport better
3. Home Screen Redesign
Files:

apps/web/app/page.tsx
apps/web/app/miniapp/page.tsx
apps/web/components/TheOffice.tsx
Remove/Reduce Chat:

Remove or minimize ChatOverlay from home screen (INN view)
Chat will be accessible via bottom nav button instead
Add Information Display:

Create new component: apps/web/components/HomeInfoDisplay.tsx
Display:
LP Balance: User's LP token balance
MON Total: User's MON balance + market value
KEEP Total: User's KEEP balance + market value
Market Values: Current exchange rates (MON/USD, KEEP/USD, LP value)
Cellar Info: Pot size, current price (1.00 LP minimum)
Fetch data from:
theCellarService.getUserLpBalance()
keepTokenService.getBalance()
MON balance from wallet
Market prices (may need new service or API)
Layout:

Replace chat area with compact info cards/grid
Use pixel-art styling consistent with game
Make it scrollable if needed
4. Chat as Separate View
Files:

apps/web/lib/types.ts (add GameView.CHAT)
apps/web/app/page.tsx
apps/web/app/miniapp/page.tsx
When Chat nav button clicked, switch to GameView.CHAT
Display full-screen chat interface
Include ChatOverlay component in chat view
Add back button to return to previous view
5. Mobile/Miniapp Optimization
Files: All component files

Reduce font sizes where appropriate
Reduce padding/margins
Optimize spacing for narrow viewport
Ensure no horizontal overflow
Test on actual mobile/miniapp viewport (480px width)
Specific optimizations:

Bottom nav: Reduce height from h-20 to h-16 or h-14
Info cards: Use smaller text sizes (text-xs, `text-[10px]`)
Buttons: Reduce padding
Top bar: Reduce height if possible
6. AI-Powered Tutorial/Help System
Files:

Create apps/web/components/TutorialOverlay.tsx
Create apps/web/lib/services/tutorialService.ts
Create apps/web/lib/services/docSearchService.ts
Features:

Context-aware help based on current view/page
AI-powered responses using existing docs (apps/web/content/docs/)
Tutorial overlays for first-time users
"?" button in top bar that opens contextual help
Use chatWithAgent pattern but with docs as context
Implementation:

docSearchService.ts: Search and retrieve relevant docs based on context
tutorialService.ts:
Load docs content
Use AI (OpenAI) to answer questions with doc context
Provide step-by-step tutorials
TutorialOverlay.tsx: Modal/overlay component for help/tutorials
Add tutorial triggers:
First visit to each major section
"?" button click
Specific help buttons on complex features
AI Integration:

Use existing chatWithAgent pattern from apps/web/app/actions/aiActions.ts
Enhance with RAG (Retrieval Augmented Generation):
Load relevant docs based on current page/view
Pass docs as context to AI
Generate contextual help responses
7. SDK Ready Call for Root
File: apps/web/app/page.tsx

Add sdk.actions.ready() call similar to /miniapp/page.tsx
Only call if in Farcaster miniapp context
Use isInFarcasterMiniapp() check
8. Embed/Manifest Updates
Files:

apps/web/app/layout.tsx
apps/web/public/.well-known/farcaster.json
Add fc:miniapp and fc:frame metadata to root layout
Update farcaster.json homeUrl from /miniapp to / (root)
Ensure embed metadata works for root domain
Critical Fix: Cellar Price Calculation
Issue: Price oscillates between 1.1 and 1 MON instead of growing properly.

Root Cause:

Current priceMultiplier is 1.1x (110%)
When price hits floor (1 MON), new epoch starts at 1 * 1.1 = 1.1 MON
Price decays back to 1 MON over epoch period
Cycle repeats with very small oscillation (1.1 → 1 → 1.1 → 1)
Donut Miner Pattern:

Uses PRICE_MULTIPLIER = 2e18 (2x multiplier)
This creates larger price swings, allowing pot to accumulate more before raids
Fix Required:

Increase priceMultiplier from 1.1x to 2x (like donut miner)
Update deployment scripts: deploy_mainnet.ts, deploy_localhost.ts
Change from ethers.parseEther("1.1") to ethers.parseEther("2")
Keep minInitPrice floor at 1 MON (user requirement - don't give away for free)
Current behavior is correct: price decays to 1 MON minimum
This ensures there's always an LP fee cost to raid
Result: With 2x multiplier:
Price hits floor: 1 MON
New epoch starts: 1 * 2 = 2 MON
Price decays: 2 MON → 1 MON over epoch period
Larger swing (2 → 1) gives more time for pot accumulation
Files to Update:

packages/contracts/scripts/deploy_mainnet.ts (line 93)
packages/contracts/scripts/deploy_localhost.ts (line 96)
Any other deployment scripts using priceMultiplier = ethers.parseEther("1.1")
Note: Existing deployed contracts would need an upgrade to change the multiplier. This is a deployment-time parameter, not runtime configurable.

Implementation Order
CRITICAL: Fix Cellar price calculation (remove floor, allow price to 0)
Bottom nav restructure (remove Posse/Regulars, add Chat)
Add Chat view to GameView enum and routing
Cellar page: Add Posse/Regulars buttons, fix background
Home screen: Create info display component, replace chat
Mobile optimization pass
Tutorial system foundation
SDK ready and embed updates
Testing
Test on mobile viewport (480px width)
Test in Farcaster miniapp context
Verify all navigation works
Verify info displays update correctly
Test tutorial system with various contexts
