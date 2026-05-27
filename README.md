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
