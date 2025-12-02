# InnKeeper Discord Verification Flow

## Overview

InnKeeper uses a **two-step verification system** to ensure both human verification and wallet ownership verification.

## Step-by-Step Flow

### Step 1: Human Verification (Anti-Bot Protection)

**Location:** `#start-here` channel

**Process:**
1. New member joins the server
2. Sees `#start-here` channel with welcome message
3. Clicks verification button (from Wick Bot - captcha included)
4. Completes captcha/verification challenge
5. Receives **"Human Verified"** role

**Purpose:** Prevents bot accounts, spam, and raids before they can access wallet verification.

**Channels Available After Step 1:**
- `#start-here` (read-only)
- `#rules` (read-only)
- `#faq` (read-only)
- `#support-unverified` (can post)
- `#verify-wallet` (unlocks - can use `/verify` command)

### Step 2: Wallet Verification (NFT Ownership Check)

**Location:** `#verify-wallet` channel

**Process:**
1. User with "Human Verified" role can now see `#verify-wallet`
2. User runs: `/verify [wallet-address]`
3. Bot validates:
   - Wallet address format (0x...)
   - User owns at least one Adventurer NFT hero
4. If valid:
   - Stores verification data
   - Assigns **"Verified"** role
   - Assigns **"Player"** role (if not already assigned)
5. User now has full server access

**Purpose:** Ensures only users who own game NFTs can access game channels and features.

**Channels Available After Step 2:**
- All Entry Gate channels
- All Wallet Verification channels
- **All Community channels** (`#announcements`, `#general`, `#bot-commands`, `#showcase`)
- **All Game channels** (`#game-help`, `#party-finder`, `#contract-info`, `#trading`, `#tavern-regulars`, `#town-posse`)
- **All Support channels** (`#support`, `#bug-reports`, `#suggestions`)

## Role Hierarchy

```
Admin (Full Access)
  ↓
Moderator (Moderation Powers)
  ↓
Bot (Bot Role)
  ↓
Human Verified (After Step 1)
  ↓
Verified (After Step 2 - Full Access)
  ↓
Player (Game Access)
  ↓
Tavern Regular / Town Posse / VIP (Special Groups)
```

## Error Messages

### "Please complete human verification first"
- **Cause:** User hasn't completed Step 1
- **Solution:** Go to `#start-here` and complete Wick Bot verification (captcha is built-in)

### "Invalid wallet address format"
- **Cause:** Wallet address is not in correct format
- **Solution:** Use format: `0x` followed by 40 hexadecimal characters

### "No heroes found for this wallet address"
- **Cause:** Wallet doesn't own any Adventurer NFT heroes
- **Solution:** Mint or acquire an Adventurer NFT first

### "Error verifying wallet"
- **Cause:** Game API is down or wallet check failed
- **Solution:** Try again later or contact support

## Channel Categories

### 🛡️ Entry Gate
- **Access:** Everyone
- **Purpose:** First contact point, human verification
- **Channels:** `#start-here`, `#rules`, `#faq`, `#support-unverified`

### 🔐 Wallet Verification
- **Access:** Human Verified role required
- **Purpose:** Wallet/NFT verification
- **Channels:** `#verify-wallet`

### 💬 Community
- **Access:** Verified role required
- **Purpose:** General discussion and announcements
- **Channels:** `#announcements`, `#general`, `#bot-commands`, `#showcase`

### 🎮 Game
- **Access:** Verified role required (some require special roles)
- **Purpose:** Game-specific discussions
- **Channels:** `#game-help`, `#party-finder`, `#contract-info`, `#trading`, `#tavern-regulars`, `#town-posse`

### 💬 Support
- **Access:** Verified role required
- **Purpose:** Help and feedback
- **Channels:** `#support`, `#bug-reports`, `#suggestions`

### 🛡️ Moderation
- **Access:** Moderator+ only
- **Purpose:** Moderation tools and logs
- **Channels:** `#mod-logs`, `#reports`

## Benefits of This System

1. **Bot Protection:** Human verification catches 99% of bot accounts
2. **Quality Control:** Only real players with NFTs can access game channels
3. **Security:** Two layers of verification prevent abuse
4. **User Experience:** Clear, step-by-step process
5. **Industry Standard:** Matches what users expect from professional Web3 servers

## Commands

- `/verify [wallet]` - Verify wallet address (requires Human Verified role)
- `/help` - Show all available commands
- `/game-info [topic]` - Get game information
- `/player [wallet]` - Look up player heroes
- `/contract [name]` - Get contract information

## Support

If you have issues with verification:
1. Check `#faq` for common questions
2. Post in `#support-unverified` (before Step 2) or `#support` (after Step 2)
3. Contact a moderator
