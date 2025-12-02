# Human Verification Setup Guide

This guide explains how to set up human verification (anti-bot protection) for your Discord server before users can verify their wallets.

## Why Two-Step Verification?

1. **Human Verification** (Step 1): Prevents bot accounts, spam, and raids
2. **Wallet Verification** (Step 2): Grants access based on NFT ownership

This is the industry standard used by top Web3 Discord servers (Parallel, Immutable, Shrapnel, etc.).

## Recommended Bot: Wick Bot

**Wick Bot** is the best choice for professional servers because it handles:
- ✅ Human verification (captcha) - **Built-in, no need for CaptchaBot!**
- ✅ Anti-raid protection
- ✅ Anti-nuke protection
- ✅ Suspicious account detection
- ✅ Auto-kick bot accounts
- ✅ Comprehensive logging

**Note:** Wick Bot includes captcha functionality, so you don't need a separate CaptchaBot.

### Setup Wick Bot

1. **Invite Wick Bot:**
   - Go to: https://wickbot.com/
   - Click "Invite Wick"
   - Select your server
   - Grant necessary permissions

2. **Configure Wick Bot:**
   - Set verification role name to: `Human Verified`
   - Enable auto-verification
   - Set verification channel to: `#start-here`
   - Configure anti-raid settings (recommended: Medium)

3. **Role Hierarchy (CRITICAL!):**
   - **Wick Bot's role MUST be HIGH in the hierarchy** - above all roles it needs to manage
   - Ensure "Human Verified" role is **BELOW** Wick Bot's role (so Wick can assign it)
   - Ensure "Human Verified" role is **ABOVE** "Verified" role
   - This ensures wallet verification happens after human verification

   **Important:** After inviting Wick Bot, go to Server Settings → Roles and drag "Wick Bot" role to be near the top (below Admin/Moderator but above Human Verified). Wick Bot cannot assign roles that are above its own role!

## Alternative: CaptchaBot (Not Needed if Using Wick Bot)

**Note:** Wick Bot already includes captcha functionality, so CaptchaBot is not necessary. Only use CaptchaBot if you want a simpler, captcha-only solution without Wick Bot's advanced features.

If you prefer CaptchaBot instead of Wick Bot:

1. **Invite CaptchaBot:**
   - Go to: https://captcha.bot/
   - Click "Invite"
   - Select your server

2. **Configure CaptchaBot:**
   - Set verification role to: `Human Verified`
   - Set verification channel to: `#start-here`

**Recommendation:** Stick with Wick Bot - it does everything CaptchaBot does plus much more!

## Verification Flow

```
New User Joins
    ↓
#start-here (everyone can see)
    ↓
Click Wick Bot verification button (captcha included)
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

## Channel Permissions

The setup script automatically configures:

- **Entry Gate** (`#start-here`, `#rules`, `#faq`, `#support-unverified`): Everyone can see
- **Wallet Verification** (`#verify-wallet`): Requires "Human Verified" role
- **Community/Game Channels**: Requires "Verified" role (after wallet verification)

## Testing

1. Create a test account or use a friend's account
2. Join the server
3. Verify you see `#start-here` but NOT `#verify-wallet`
4. Complete human verification
5. Verify `#verify-wallet` channel appears
6. Run `/verify [wallet-address]` with a wallet that owns NFTs
7. Verify you get "Verified" role and can see all channels

## Troubleshooting

### "Human Verified" role not being assigned
- **MOST COMMON ISSUE:** Wick Bot's role is too low in hierarchy!
  - Go to Server Settings → Roles
  - Drag "Wick Bot" role UP so it's above "Human Verified" role
  - Wick Bot cannot assign roles that are equal to or above its own role
- Check Wick Bot is online
- Verify role name matches exactly: `Human Verified`
- Check Wick Bot has "Manage Roles" permission
- Ensure "Human Verified" role is below Wick Bot's role (in hierarchy position, not just permissions)

### Users can't see #verify-wallet after human verification
- Check role hierarchy: "Human Verified" must be above "Verified"
- Verify channel permissions in Discord settings
- Check if user actually received the role (use `/verify` command to see error message)

### Verification button not appearing
- Ensure Wick Bot is configured for `#start-here` channel
- Check Wick Bot has "Send Messages" and "Embed Links" permissions
- Verify Wick Bot's captcha/verification is enabled in Wick Bot dashboard
- Try re-running `/setup-server` to ensure channels are created correctly

## Role Order (CRITICAL!)

Discord role hierarchy (top to bottom):
1. Admin
2. Moderator
3. **Wick Bot** ← MUST be here (high enough to manage roles below)
4. Bot (your InnKeeper bot's role)
5. **Human Verified** ← Must be below Wick Bot
6. Verified
7. Player
8. Tavern Regular / Town Posse / VIP

**⚠️ IMPORTANT:**
- Wick Bot's role MUST be positioned high enough (near the top) so it can assign "Human Verified" role
- If Wick Bot can't assign roles, it means its role is too low in the hierarchy
- Drag Wick Bot's role UP in Server Settings → Roles until it's above "Human Verified"
- Wick Bot cannot manage roles that are equal to or above its own role position

## Next Steps

After setting up human verification:

1. Run `/setup-server` to create all channels and roles
2. Configure Wick Bot as described above (captcha is built-in)
3. Test the flow with a test account
4. Update your server description to mention two-step verification

**You're all set!** Wick Bot handles captcha verification automatically - no need for additional bots.

Your server is now protected with industry-standard anti-bot measures! 🛡️
