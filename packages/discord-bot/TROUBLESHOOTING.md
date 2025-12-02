# Bot Not Responding to Mentions - Troubleshooting

## Issue: Bot responds to slash commands but not mentions

### Symptoms
- ✅ Slash commands work (`/help` responds)
- ❌ Mentions don't work (`@TavernKeeper` gets no response)
- ❌ No debug logs appear in console when mentioning bot

### Root Cause
The bot isn't receiving message events. This is usually because:

1. **Message Content Intent not enabled** in Discord Developer Portal
2. **Bot doesn't have permission** to read messages in the channel
3. **Event handler not firing** (less likely if slash commands work)

## Solution Steps

### Step 1: Enable Message Content Intent

1. Go to https://discord.com/developers/applications
2. Select your application (TavernKeeper)
3. Go to **Bot** section
4. Scroll down to **Privileged Gateway Intents**
5. **Enable** "MESSAGE CONTENT INTENT" ✅
6. Save changes
7. **Restart your bot** (the bot needs to reconnect with new intents)

### Step 2: Verify Bot Permissions

In Discord:
1. Right-click your server → **Server Settings**
2. Go to **Roles** → Select your bot's role
3. Ensure these permissions are enabled:
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Read Message History**
   - ✅ **Use Slash Commands**

### Step 3: Check Channel Permissions

1. Right-click the channel (`#general`) → **Edit Channel**
2. Go to **Permissions** tab
3. Find your bot's role
4. Ensure:
   - ✅ **View Channel**
   - ✅ **Send Messages**
   - ✅ **Read Message History**

### Step 4: Restart Bot After Enabling Intent

**CRITICAL:** After enabling Message Content Intent, you MUST restart the bot:

```powershell
# Stop bot (Ctrl+C)
# Then restart:
pnpm --filter @innkeeper/discord-bot start
```

### Step 5: Test Again

After restarting, try mentioning the bot:
```
@TavernKeeper are you here?
```

You should see debug logs in the console:
```
[DEBUG] Message from iono (bot: false): @TavernKeeper are you here?
[DEBUG] Mentions: TavernKeeper#1150, Client user: TavernKeeper#1150
Bot mentioned by iono in 123456789: @TavernKeeper are you here?
Responding with "Yes, I'm here!"
```

## Verification Checklist

- [ ] Message Content Intent enabled in Developer Portal
- [ ] Bot restarted after enabling intent
- [ ] Bot has "View Channels" permission
- [ ] Bot has "Read Message History" permission
- [ ] Bot has "Send Messages" permission
- [ ] Channel allows bot to read messages
- [ ] Debug logs appear when mentioning bot

## Still Not Working?

If you've done all the above and still no debug logs appear:

1. **Check bot is actually online** (green dot in Discord)
2. **Try mentioning in a different channel**
3. **Check console for errors** (might be silently failing)
4. **Verify the bot's role hierarchy** (can't be too low)

## Expected Behavior After Fix

When working correctly:
- Mentioning `@TavernKeeper` should trigger debug logs
- Bot should respond with "✅ Yes, I'm here! Use `/help` to see all my commands."
- Console should show: `[DEBUG] Message from...` and `Bot mentioned by...`
