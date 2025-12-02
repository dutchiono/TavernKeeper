# Wick Bot Setup - Role Hierarchy Guide

## The Problem

**"Wick isn't placed high enough, you have several immune roles in your server!"**

This error means Wick Bot's role is positioned too low in Discord's role hierarchy. Wick Bot cannot assign or manage roles that are equal to or above its own role position.

## Solution: Fix Role Hierarchy

### Step 1: Check Current Role Order

1. Go to your Discord server
2. Click Server Settings → Roles
3. Look at the role list (top to bottom = highest to lowest)

### Step 2: Identify Wick Bot's Role

- Look for the role assigned to Wick Bot (usually named "Wick Bot" or similar)
- Note its current position

### Step 3: Move Wick Bot's Role UP

1. In Server Settings → Roles
2. Find "Wick Bot" role
3. **Drag it UP** in the list so it's positioned:
   - Below Admin and Moderator roles
   - **ABOVE** "Human Verified" role
   - Above all roles Wick needs to manage

### Step 4: Correct Role Order

Your role hierarchy should look like this (top to bottom):

```
1. @everyone (always at bottom)
   ...
   [Higher roles]
   ...
2. Admin
3. Moderator
4. Wick Bot          ← MUST be here (high enough)
5. Bot (InnKeeper)   ← Your bot's role
6. Human Verified    ← Must be BELOW Wick Bot
7. Verified
8. Player
9. Tavern Regular
10. Town Posse
11. VIP
```

### Step 5: Verify Wick Bot Permissions

Wick Bot's role should have these permissions:
- ✅ Manage Roles
- ✅ Manage Channels
- ✅ Kick Members
- ✅ Ban Members
- ✅ Send Messages
- ✅ Embed Links

### Step 6: Test

1. Have a test account join the server
2. Complete Wick Bot verification
3. Verify "Human Verified" role is assigned
4. If it works, you're done!

## Why This Happens

Discord's role hierarchy is **positional**, not just permission-based. Even if Wick Bot has "Manage Roles" permission, it cannot:
- Assign roles that are equal to its own position
- Assign roles that are above its own position

**Example:**
- If Wick Bot's role is at position #10
- And "Human Verified" is at position #5
- Wick Bot **cannot** assign "Human Verified" (even with permissions)

## Common Mistakes

❌ **Wrong:** Wick Bot role below "Human Verified"
✅ **Correct:** Wick Bot role above "Human Verified"

❌ **Wrong:** Assuming permissions alone are enough
✅ **Correct:** Role position matters more than permissions

❌ **Wrong:** Placing Wick Bot at the very top (above Admin)
✅ **Correct:** Place Wick Bot below Admin/Moderator but above roles it manages

## Troubleshooting

### "Wick Bot can't assign Human Verified role"
- **Fix:** Move Wick Bot's role UP in hierarchy (above Human Verified)

### "Wick Bot can't kick/ban users"
- **Fix:** Move Wick Bot's role UP (above the roles of users you want to kick/ban)

### "Verification button doesn't work"
- Check Wick Bot is online
- Check Wick Bot has "Send Messages" permission
- Check verification channel is set correctly in Wick Bot settings

### "Role hierarchy looks correct but still doesn't work"
- Refresh Discord (Ctrl+R or restart app)
- Check Wick Bot's role name matches exactly what Wick Bot expects
- Verify Wick Bot has "Manage Roles" permission enabled

## Quick Checklist

- [ ] Wick Bot invited to server
- [ ] Wick Bot role created (or assigned existing role)
- [ ] Wick Bot role positioned ABOVE "Human Verified" role
- [ ] Wick Bot has "Manage Roles" permission
- [ ] Verification channel set to `#start-here`
- [ ] Verification role set to `Human Verified`
- [ ] Test with a new account

## Still Having Issues?

1. Check Wick Bot's dashboard: https://wickbot.com/dashboard
2. Review Wick Bot logs in your server
3. Contact Wick Bot support: https://wickbot.com/support
4. Verify your server isn't hitting Discord rate limits

Remember: **Role position > Permissions** in Discord!
