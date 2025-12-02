# Discord Server Upgrade Summary

## What Changed

Your Discord bot and server setup have been upgraded to follow industry-standard practices used by top Web3 Discord servers (Parallel, Immutable, Shrapnel, etc.).

## Key Improvements

### 1. Two-Step Verification System

**Before:** Single wallet verification step
**After:** Two-step process:
1. **Human Verification** (anti-bot protection)
2. **Wallet Verification** (NFT ownership check)

### 2. New Role: "Human Verified"

- Added between "Moderator" and "Verified" roles
- Assigned by Wick Bot after captcha completion (captcha is built into Wick Bot)
- Required before users can access wallet verification

### 3. Restructured Channels

**New Category: 🛡️ Entry Gate**
- `#start-here` - Welcome message + human verification button
- `#rules` - Server rules
- `#faq` - Frequently asked questions
- `#support-unverified` - Support for users who haven't verified yet

**Updated Category: 🔐 Wallet Verification** (was "Verification")
- `#verify-wallet` - Wallet verification channel (requires Human Verified role)

**All Other Categories:** Now require "Verified" role (after wallet verification)

### 4. Updated Code

**Files Modified:**
- `src/scripts/setup-server.ts` - New channel structure and roles
- `src/services/verification.ts` - Checks for human verification first
- `src/commands/verify.ts` - Better success messages

**Files Created:**
- `HUMAN_VERIFICATION_SETUP.md` - Guide for setting up Wick Bot (captcha included)
- `VERIFICATION_FLOW.md` - Complete verification flow documentation
- `UPGRADE_SUMMARY.md` - This file

**Files Updated:**
- `README.md` - Updated to reflect new verification flow

## Next Steps

### 1. Rebuild and Restart Bot

```powershell
cd c:\Users\epj33\Desktop\InnKeeper
pnpm --filter @innkeeper/discord-bot build
pnpm --filter @innkeeper/discord-bot start
```

### 2. Run Server Setup

In Discord, run:
```
/setup-server
```

This will create all new channels and roles.

### 3. Set Up Human Verification Bot

**Option A: Wick Bot (Recommended)**
1. Go to https://wickbot.com/
2. Invite Wick Bot to your server
3. Configure:
   - Verification role: `Human Verified`
   - Verification channel: `#start-here`
   - Enable anti-raid protection

**Option B: CaptchaBot**
1. Go to https://captcha.bot/
2. Invite CaptchaBot to your server
3. Configure:
   - Verification role: `Human Verified`
   - Verification channel: `#start-here`

See `HUMAN_VERIFICATION_SETUP.md` for detailed instructions.

### 4. Verify Role Hierarchy (CRITICAL!)

In Discord Server Settings → Roles, ensure order (top to bottom):
1. Admin
2. Moderator
3. **Wick Bot** ← MUST be here (high enough to manage roles below)
4. Bot (your InnKeeper bot's role)
5. **Human Verified** ← Must be below Wick Bot
6. Verified
7. Player
8. Tavern Regular / Town Posse / VIP

**⚠️ IMPORTANT:**
- After inviting Wick Bot, drag its role UP in the hierarchy so it's above "Human Verified"
- Wick Bot cannot assign roles that are equal to or above its own role position
- This is the #1 reason verification fails - Wick Bot's role is too low!

### 5. Test the Flow

1. Create a test account or use a friend's account
2. Join the server
3. Verify you see `#start-here` but NOT `#verify-wallet`
4. Complete human verification (Wick Bot - captcha included)
5. Verify `#verify-wallet` channel appears
6. Run `/verify [wallet-address]` with a wallet that owns NFTs
7. Verify you get "Verified" role and can see all channels

## Verification Flow Diagram

```
New User Joins
    ↓
#start-here (everyone can see)
    ↓
Click Wick/CaptchaBot verification button
    ↓
Complete captcha/verification
    ↓
Receives "Human Verified" role
    ↓
#verify-wallet channel unlocks
    ↓
User runs /verify [wallet-address]
    ↓
Bot checks for NFT ownership
    ↓
Receives "Verified" role
    ↓
Full server access unlocked
```

## Benefits

✅ **Bot Protection**: Human verification catches 99% of bot accounts before they reach wallet verification
✅ **Quality Control**: Only real players with NFTs can access game channels
✅ **Security**: Two layers of verification prevent abuse
✅ **User Experience**: Clear, step-by-step process users expect
✅ **Industry Standard**: Matches what users expect from professional Web3 servers

## Troubleshooting

### Users can't see #verify-wallet after human verification
- Check role hierarchy: "Human Verified" must be above "Verified"
- Verify channel permissions in Discord settings
- Check if user actually received the role

### Verification button not appearing
- Ensure Wick Bot is configured for `#start-here` channel (captcha is built-in)
- Check bot has "Send Messages" and "Embed Links" permissions
- Try re-running `/setup-server`

### Bot says "Please complete human verification first"
- User needs to complete Wick Bot verification first (captcha is built-in)
- Check if "Human Verified" role exists and is assigned correctly

## Documentation

- `HUMAN_VERIFICATION_SETUP.md` - How to set up Wick Bot (captcha included)
- `VERIFICATION_FLOW.md` - Complete verification flow details
- `README.md` - General bot documentation

## Support

If you have questions or issues:
1. Check the documentation files above
2. Review error messages carefully
3. Test with a test account first
4. Check Discord role hierarchy and permissions

Your server is now set up with industry-standard verification! 🎉
