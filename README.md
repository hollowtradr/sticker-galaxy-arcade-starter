# Sticker Galaxy Arcade — Starter Template

> A ready-to-run minigame template for the Sticker Galaxy Arcade platform.  
> Clone it, point your AI at the SDK docs, and build something worth playing.

---

## What is this?

This is the official starting point for building a Sticker Galaxy Arcade minigame. It ships a working demo game (a 2d6 dice wagering game called "Cantina Dice") that implements every required SDK touchpoint: session auth, midi entry fees, result reporting, and purchase routing. Replace the game logic, keep the SDK wiring, and you have a production-ready game.

---

## Quick Start

Five commands from zero to running game:

```bash
git clone https://github.com/hollowtradr/sticker-galaxy-arcade-starter
cd sticker-galaxy-arcade-starter
npm install
npm run dev
# Open http://localhost:5173 in your browser
```

The demo game runs in **mock mode** by default — no Sticker Galaxy account or session token needed. You'll see a fake player called "Dev Player" with 1,000 midi and 3 daily plays.

---

## What's in the box

```
arcade-starter-template/
├── README.md           ← You're here
├── SETUP.md            ← 5-minute environment setup guide
├── BUILD_WITH_AI.md    ← Cursor prompts for building your game
├── manifest.json       ← Game manifest to fill in before submitting
├── src/
│   ├── main.ts         ← Entry point — wires everything together
│   ├── sdk.ts          ← All SDK calls live here (don't move them)
│   ├── mock-host.ts    ← Offline mock backend for local development
│   ├── game.ts         ← 🎯 THE FILE YOU REPLACE with your game logic
│   ├── ui.ts           ← Rendering (Canvas + DOM) — customize freely
│   └── types.ts        ← TypeScript types matching the SDK spec
└── public/
    └── styles.css      ← Theme variables at the top — easy to customize
```

---

## The 3 files you actually need to change

### 1. `src/game.ts` — Your game logic

This is where the demo dice game lives. Replace it with your game:
- Keep the `init()` and `startGame()` exports
- Replace `rollDice()` and `determineOutcome()` with your mechanics
- Keep the `sdk.submitEntry()` and `sdk.submitResult()` calls — they're required

### 2. `manifest.json` — Your game's identity

Fill in your game name, studio name, sector, wallet address, and score range before submitting. The SDK validation is based on `max_score` — set it accurately.

### 3. `public/styles.css` — Your visual theme

Change the CSS variables at the top (the `--color-*` block) to rebrand the UI instantly. Then customize layout as needed.

---

## How to use this template with AI (Cursor)

The fastest way to build is to give your AI assistant the SDK docs and let it write the game logic for you.

1. Open this project in [Cursor](https://cursor.sh)
2. In the Cursor chat panel, paste this prompt:

```
Read the Sticker Galaxy Arcade SDK at https://docs.stickergalaxy.io/llms.txt
and confirm you understand it.
```

3. Then paste your game concept:

```
I want to build a [DESCRIBE YOUR GAME] minigame for the Sticker Galaxy Arcade.
The starter template is already set up with SDK auth, entry, and result flows.
Replace src/game.ts with my game logic. Keep the sdk.submitEntry() and 
sdk.submitResult() calls exactly as-is — only replace the game mechanics between them.
My game should produce a numeric score (0-1000) and a win/loss outcome.
```

See `BUILD_WITH_AI.md` for more prompts covering visuals, mobile optimization, and leaderboard integration.

---

## How the SDK flow works

Every play session follows this exact sequence:

```
1. Page loads  →  sdk.initSession()        — validates session token, gets player data
2. Player bets →  sdk.submitEntry(midi)    — deducts wager, gets entry_id
3. Game runs   →  [your game logic here]
4. Game ends   →  sdk.submitResult(...)    — reports score, receives midi_awarded
5. Show result →  ui.showResult(...)       — display win/loss + midi awarded
```

In development (mock mode), all of this runs locally. No backend needed.

---

## Mock mode vs. real backend

| Mode | When | How |
|------|------|-----|
| **Mock** (default) | Local dev, no session token in URL | `VITE_USE_MOCK=1` (default) — all calls go to `mock-host.ts` |
| **Real** | Production / sandbox testing | `VITE_USE_MOCK=0` + valid `?session_token=` in URL |

Mock mode uses `localStorage` to track the dev player's midi balance between reloads.

**Dev console helpers** (open browser DevTools):
```js
window.__mockReset()          // reset player to 1000 midi, 3 plays
window.__mockAddMidi(500)     // add 500 midi to dev player
window.__mockRestorePlays()   // restore daily plays to 3
window.__getGameState()       // print current game state
```

---

## How to submit your game

When your game works end-to-end (including SDK integration against the real sandbox):

1. Fill out `manifest.json` completely
2. Deploy your game to a public URL (Vercel, Netlify, GitHub Pages — all work)
3. Go to the Galactic Council Telegram group
4. Run: `/council propose_minigame` followed by your `manifest.json` contents

A council member will review within 7 days. Hollow has final approval.

**You must recuse** from the review if you're a council member — it's your own game.

---

## YODA Holder Perks

Players who hold $YODA unlock compounding perks on every axis of the Arcade — automatically, with no spending required.

| Tier | $YODA held | Daily plays | Free revives/day | Cosmetic discount | Trophy midi bonus |
|---|---|---|---|---|---|
| initiate | 0 | 3 | 0 | 0% | +0% |
| padawan | 1,000 ($3.68) | 4 | 0 | 5% | +5% |
| knight | 10,000 ($37) | 5 | 1 | 15% | +15% |
| master | 50,000 ($184) | 6 | 2 | 20% | +25% |
| grandmaster | 250,000 ($920) | 7 | 3 | 25% | +40% |

These tiers are platform-wide — your game gets them automatically. You can override values per-game using the `yoda_tier_perks` block in `manifest.json`.

**Trophy midi bonus** is a percentage boost on top of the base daily trophy payout (§6 of ARCADE_ECONOMICS.md). It's paid in midi by the host — not in real money. The one-way valve holds: midi never converts to TON, YODA, or USD.

**Midi balance vs. round earnings:** The midi balance shown in the top-right of the Sticker Galaxy shell is your **total wallet balance** — NOT the midi you earned this round. Round earnings appear on the result screen after each play. Displaying round earnings separately from the running balance is intentional UX; do not conflate them in your game UI.

Your game receives a player's tier as part of the session context (available in `GET /arcade/v0/session` via `yoda_tier`). Use it to show tier-specific UI if you want — e.g., displaying the player's free revive count or cosmetic discount at the start of each session.

---

## What you'll earn

**70% of every real-money purchase** made from within your game's context — midi top-ups, cosmetic sales, extra-play unlocks, tournament entries. Paid monthly in TON to the wallet in your manifest.

Tournament rake example: 100 players × 5 TON = 500 TON pool. 20% rake = 100 TON. You get 70 TON (70% of rake).

Full economics: see [ARCADE_ECONOMICS.md](https://docs.stickergalaxy.io/arcade-economics) or `projects/babyyoda-bot/docs/ARCADE_ECONOMICS.md`.

---

## The rules you can't break

- **No separate login** — player identity comes from Sticker Galaxy. No passwords, no sign-ups.
- **No P2W** — only cosmetics, extra plays, and tournament entries can be sold
- **No direct midi manipulation** — all balance changes go through the SDK
- **Score must match manifest** — `max_score` must be realistic (sandbox logs are reviewed)

Full rules: see the [Arcade Charter](https://docs.stickergalaxy.io/arcade-charter).

---

## Wallet Binding & Tier Detection

The SDK ships JIT (Just-In-Time) wallet connect — no persistent "Connect Wallet" button, no blocking on load. Wallets are requested exactly at four moments:

1. Player explicitly selects **TON or YODA** as purchase currency
2. Player taps a **"Check your tier" CTA** (when they're unbound/initiate)
3. Player opens **Settings → Wallet** section
4. Your game has a deliberate **"Verify holdings" button**

Stars purchases are **never** gated on wallet binding. Stars is Telegram-native and walletless.

### `getWalletBinding()` — check current binding

```ts
import * as sdk from './sdk'

const binding = await sdk.getWalletBinding()
if (binding) {
  console.log(binding.tier)          // 'padawan'
  console.log(binding.balance_yoda)  // 2500
  console.log(binding.address)       // 'EQ...'
} else {
  // Player is unbound — show initiate-tier UX
}
```

If the snapshot is >24h old, a background `refreshTier()` fires automatically.

### `promptConnectWallet()` — JIT wallet connect + bind

```ts
// Normal flow
const result = await sdk.promptConnectWallet({ reason: 'purchase' })
if (result.success) {
  console.log('Bound:', result.address, result.tier)
} else if (result.existing_binding) {
  // 409 — player already has a wallet bound from another source
  // Show Keep/Replace UI
  const replace = confirm(`Replace existing wallet ${result.existing_binding.address}?`)
  if (replace) {
    const forceResult = await sdk.promptConnectWallet({ force: true })
    // force=true uses cached proof — no modal reopened
  }
} else if (result.error === 'dismissed') {
  // Player closed the modal — fall back to Stars or show tier-unaware UX
}
```

### `refreshTier()` — manual snapshot refresh

```ts
const { tier, changed } = await sdk.refreshTier()
if (changed) console.log('Tier updated to', tier)
```

Throws `'rate_limited'` on 429 — catch and ignore or show a friendly message.

### `onTierChange(callback)` — reactive tier updates

```ts
const unsub = sdk.onTierChange(({ old_tier, new_tier, balance_yoda }) => {
  showTierBanner(`Level up: ${new_tier}!`)
})
// Call unsub() to remove the listener
```

### `openSettings(section?)` — deep-link to host settings

```ts
sdk.openSettings('wallet')  // opens Wallet tab in host settings
sdk.openSettings('sound')   // opens Sound tab
```

### Mock helpers (DevTools console)

```js
window.__mockBindWallet()            // bind padawan wallet
window.__mockBindWallet('EQabc', 'knight')  // bind specific address + tier
window.__mockDisconnect()            // reset to unbound
window.__mockSetTier('master')       // change tier on existing binding
window.__mockStaleSnapshot()         // age snapshot 48h (triggers background refresh)
window.__mockUnverifyProof()         // set tonproof_verified=false
```

For the full spec — tier thresholds, proof validation, privacy settings, force-bind flow — see `ARCADE_SDK_v0.md` §11.

---

## Resources

| Resource | URL |
|----------|-----|
| SDK docs | https://docs.stickergalaxy.io |
| SDK llms.txt (for AI assistants) | https://docs.stickergalaxy.io/llms.txt |
| Arcade Charter | https://docs.stickergalaxy.io/arcade-charter |
| Arcade Economics | https://docs.stickergalaxy.io/arcade-economics |
| Contact Hollow | @hollowtradr on Telegram |

---

*Build something worth playing. The galaxy is watching.*
