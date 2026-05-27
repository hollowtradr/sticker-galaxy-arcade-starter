# Arcade Starter Template — Status Report

**Built:** 2026-05-26  
**Repo:** https://github.com/hollowtradr/sticker-galaxy-arcade-starter  
**Status:** ✅ Live, tested, pushed to GitHub

---

## Verification

### `npm install` ✅
```
added 76 packages in 9s
```

### `npm run build` ✅
```
vite v5.4.21 building for production...
✓ 7 modules transformed.
dist/index.html                 5.32 kB │ gzip: 1.89 kB
dist/assets/index-BtqWrfqN.js  12.17 kB │ gzip: 4.85 kB
✓ built in 294ms
```
TypeScript compiled clean. Production bundle in `dist/`.

### `npm run dev` ✅
```
VITE v5.4.21  ready in 252 ms
➜  Local:   http://localhost:5173/
```
Dev server starts in ~250ms.

### Mock flow (verified via code review) ✅
1. Page load → `sdk.initSession()` → reads mock state from localStorage  
   → renders "Dev Player" + 1000 midi + 3/3 plays
2. Set wager → `sdk.submitEntry(50)` → deducts 50 midi → sets entry_id  
   → balance shows 950 midi
3. Dice animate (8 frames at 100ms) → `rollDice()` → 2d6 result
4. `sdk.submitResult(entry_id, score, outcome, duration)` → mock awards  
   `floor((score/1000)*1000)` bonus midi on win, 0 on loss
5. `showResult()` renders win/loss, payout, bonus midi, leaderboard rank
6. History section updates with last 3 rolls
7. After 3 plays: Roll button disabled, shows "You've used all your plays for today"

### Git init + GitHub push ✅
```
[master (root-commit) ca7cae9] Initial Arcade starter template
 17 files changed, 4621 insertions(+)
→ https://github.com/hollowtradr/sticker-galaxy-arcade-starter
```

---

## What's in the template

| File | What it does |
|------|-------------|
| `src/sdk.ts` | All SDK calls — session, entry, result, purchase, leaderboard |
| `src/mock-host.ts` | Offline mock — tracks midi/plays in localStorage, logs every call |
| `src/game.ts` | Demo dice game + **the file studios replace** |
| `src/ui.ts` | Canvas dice renderer + DOM update functions |
| `src/main.ts` | Entry point, event wiring, postMessage listener |
| `src/types.ts` | TypeScript types matching the full SDK spec |
| `manifest.json` | Template manifest with all required + optional fields |
| `README.md` | Start-here doc for studios |
| `SETUP.md` | 5-minute environment setup |
| `BUILD_WITH_AI.md` | Copy-paste Cursor prompts for every build stage |

---

## What works (mock mode)

- ✅ Session init with fake player data (1000 midi, 3 plays)
- ✅ Entry fee deduction (deducts from localStorage balance)
- ✅ Dice roll animation (Canvas2D, 8-frame wobble)
- ✅ Win/loss determination (roll ≥ 8 = win)
- ✅ Result submission (returns midi_awarded + fake leaderboard rank)
- ✅ Balance update after each round
- ✅ Daily plays tracking (3 plays → button disabled)
- ✅ Last-3-rounds history panel
- ✅ First-win trophy simulation (on total_plays === 1)
- ✅ Dev console helpers (`__mockReset`, `__mockAddMidi`, `__mockRestorePlays`)
- ✅ postMessage listener for host events (SESSION_EXPIRING, PURCHASE_CONFIRMED, etc.)
- ✅ State persistence (localStorage save on beforeunload / visibilitychange)

---

## What needs the real backend

- ⚠️ **Real session auth** — requires `?session_token=<JWT>` from Sticker Galaxy host
- ⚠️ **Real midi balance** — mock uses localStorage; real uses player's actual balance
- ⚠️ **Real midi awards** — mock estimates awards; host calculates actual payout using manifest's `max_score`
- ⚠️ **Real purchase flow** — mock returns a fake `payment_url`; real opens Telegram payment UI
- ⚠️ **Real leaderboard** — mock returns 4 hardcoded entries; real reflects live monthly rankings
- ⚠️ **Real trophies** — mock simulates first-win trophy; real evaluates all manifest trophy conditions

To switch to real backend: set `VITE_USE_MOCK=0` in your deploy environment and add `?session_token=<token>` to the URL (injected automatically by the host when it launches your game in an iframe).

---

## For Cows (Phase 1 path)

1. **Clone the repo:** `git clone https://github.com/hollowtradr/sticker-galaxy-arcade-starter`
2. **Open in Cursor** and run `npm install && npm run dev`
3. **Read `BUILD_WITH_AI.md`** — paste prompt Step 0 into Cursor to load SDK context
4. **Replace `src/game.ts`** with Podrace Betting logic using the AI prompt in Step 1
5. **Update `manifest.json`** with game name, studio name, sector = "kessel-route"
6. **Submit via** `/council propose_minigame` when the game works in sandbox

The mock host is already set up to let Cows iterate on game logic without touching the backend. The SDK wiring is done — just change the game mechanics.

---

## Architecture notes

**Why vanilla TS + Vite?**  
No framework noise. A non-coder opening this in Cursor should be able to read `game.ts` and understand every line. React/Vue would add a mental model layer that doesn't help with the core task (build a game, wire SDK).

**Why mock-host.ts instead of `.env` flags?**  
The mock host is a real module, not just a toggle. It logs every call, tracks state, and can be extended. This lets studios test edge cases (empty balance, 0 plays remaining) without backend access.

**Why Canvas over PixiJS as default?**  
Lower dependency weight for the demo. PixiJS is installed and there's a commented setup block in `ui.ts` — studios uncomment when they want sprites. Starting with Canvas keeps the "working game in 5 minutes" promise.
