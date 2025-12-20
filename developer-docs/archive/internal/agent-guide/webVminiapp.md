You’re running into a common headache: supporting both “regular” browser wallet connect (like MetaMask or WalletConnect) outside Farcaster, and then Farcaster’s built-in wallet—aka “warplet”—when you’re inside the Farcaster mini app sandbox.

Here’s how to explain the requirement (and architecture) clearly to your IDE—or your team:

Goal:
Develop a website that supports two wallet connection modes:

On the open web: Use browser wallet options (MetaMask, WalletConnect, Rabby, etc).
When embedded as a Farcaster Miniapp: Use Farcaster’s warplet (“/wallet-frame/” context) via FC-specific connect APIs.
Key points for your IDE (or dev):

Detect Miniapp Context:

Check for
window.parent !== window
plus warplet-specific signals.
Alternatively, look for
window.farcaster
or check for the
__warpcast
user agent.
Logic

If NOT in the mini app:
Show browser-based wallet connect flow (MetaMask, WalletConnect, etc).
If in Farcaster mini app:
Use the Farcaster Miniapp wallet connect flow (
window.farcaster
methods or Neynar Miniapp SDK).
Why:

Warplet replaces the browser wallet inside Farcaster. If you try to trigger a regular browser wallet connect, Farcaster blocks popups and hijacks window focus, leading to user confusion.
Sample pseudocode:

function isInFarcasterMiniapp() {
  return (
    typeof window !== 'undefined' &&
    window.parent !== window &&
    (window.farcaster !== undefined || navigator.userAgent.includes("Warpcast"))
  );
}

// In app logic
if (isInFarcasterMiniapp()) {
  // Use warplet connection (Miniapp auth/connect)
  // Example: window.farcaster.connect()
} else {
  // Do regular WalletConnect/Metamask here
}
TL;DR for your devs:
Detect the context, and switch wallet connect logic accordingly. Never trigger MetaMask or WalletConnect inside the mini app. Always use warplet (
window.farcaster
) in Farcaster and fall back to normal browser wallets elsewhere.

Here’s the Neynar mini app doc on wallet connection and detecting mini app context for details.

If you want a real-world example or code snippet with context switching, let me know!
