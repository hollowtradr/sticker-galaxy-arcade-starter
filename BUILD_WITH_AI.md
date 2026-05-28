# Building with AI (Cursor + Claude)

This guide has **copy-paste prompts** for every stage of building your game.

The pattern is simple:
1. Give the AI the SDK docs so it knows the rules
2. Describe your game concept
3. Tell it exactly which file to change and which to leave alone
4. Test. Describe bugs. Iterate.

---

## Before You Build Monetization UI: Read the YODA Tier Schema

If you are building any UI that shows prices, revive prompts, daily play counts, or cosmetic discounts, **read the `yoda_tier_perks` block in `manifest.json` first**. The host applies these values server-side; your UI should reflect them accurately.

Key rules for AI assistants building monetization features:

1. **Daily play cap is tier-dependent.** Do not hardcode `3` plays. Read the player's tier from the session context and use `daily_plays_remaining` from `GET /arcade/v0/session`.
2. **Free revive count is tier-dependent.** A knight gets 1 free revive per day; a grandmaster gets 3. Show the correct count, not a fixed value.
3. **Cosmetic discount is applied by the host.** Do not calculate discounts client-side. The payment URL returned by `POST /arcade/v0/purchase` already reflects the discount. Show the discounted price from the API response, not a manually computed one.
4. **Trophy midi bonus is host-side.** You do not need to calculate or display it in-game. It shows on the daily trophy payout notification, not on the result screen.
5. **Midi balance ≠ round earnings.** The running midi balance is the player's total wallet. Round earnings are in `midi_awarded` from `POST /arcade/v0/result`. Display them separately — show round earnings on the result screen, and update the wallet display from the session balance.
6. **Do not invent a YODA→TON or YODA→midi conversion.** YODA held unlocks perks. YODA spent is a direct purchase. These are different paths. There is no in-game conversion mechanic.

For the full perk matrix and pricing rationale, see:
- `ARCADE_ECONOMICS.md` §3.1 (per-event pricing) and §3.2 (hold-tier perks)
- `ARCADE_SDK_v0.md` §9 (`yoda_tier_perks` schema and override rules)

---

## Step 0 — Load the SDK into your AI's context

Paste this into Cursor's chat first, every new session:

```
Read the Sticker Galaxy Arcade SDK documentation at this URL:
https://docs.stickergalaxy.io/llms.txt

Confirm you understand it by summarizing:
1. The 4 required API endpoints and what each one does
2. The score-to-midi reward formula
3. The items studios are allowed to sell
4. The postMessage events the host sends to the game
```

---

## Step 1 — Replace the game logic

This prompt replaces the dice demo in `src/game.ts` with your game concept while leaving all SDK integration intact:

```
I'm building a [DESCRIBE YOUR GAME CONCEPT — e.g. "card flip memory game" or 
"simulated podrace betting"] minigame for the Sticker Galaxy Arcade.

The starter template at src/game.ts has a dice-roll demo. I need you to replace 
the game logic with my concept. 

Rules:
- Keep the init() and startGame() function signatures exactly as-is
- Keep all sdk.submitEntry() and sdk.submitResult() calls exactly as-is  
- Replace rollDice() and determineOutcome() with my game mechanics
- The game must produce: a numeric score (0 to [MY MAX SCORE]), and an outcome 
  ('win' | 'loss' | 'draw')
- My game's maximum possible score is [MY MAX SCORE] — set manifest.json max_score 
  to match this

My game concept:
[DESCRIBE YOUR GAME MECHANICS IN PLAIN LANGUAGE]
```

---

## Step 2 — Update the UI for your game

After the logic works, update the visual layer:

```
The game logic in src/game.ts now does [DESCRIBE WHAT IT DOES].

Update src/ui.ts and index.html to match. I need:
- The canvas to show [DESCRIBE WHAT PLAYERS SHOULD SEE]
- The action button text changed to [YOUR BUTTON LABEL]  
- The wager section to [keep as-is / change to X]
- The result display to show [YOUR WIN/LOSS MESSAGE FORMAT]

Do NOT change the exported function signatures (updateUI, showResult, showError, 
showLoading, hideLoading) — game.ts depends on them.
```

---

## Step 3 — Add PixiJS sprites (when you're ready for visuals)

This swaps the plain Canvas renderer for PixiJS:

```
I want to add 2D sprite animations to my Sticker Galaxy game.

In src/ui.ts, there's a commented-out PixiJS setup block at the top. 
Uncomment it and replace the drawDice() Canvas2D implementation with 
a PixiJS renderer. 

The game assets are:
- [LIST YOUR SPRITES: e.g. "dice faces 1-6 at /assets/dice_*.png"]
- Background texture at /assets/bg.png

Keep the exported function signatures. Replace only the implementations.
The canvas should still be 290×160px and fit in a 390px wide mobile screen.
```

---

## Step 4 — Mobile optimization

```
My game at [localhost:5173] needs to work on a 390px wide mobile phone screen 
inside Telegram's Mini App browser.

Check src/ui.ts, index.html, and public/styles.css and:
1. Make sure all touch targets are at least 44×44px
2. Make sure no text is smaller than 12px
3. Make sure the layout works in portrait orientation on 390px width
4. Prevent any horizontal scrolling
5. Test the wager slider — make sure it's easy to drag on a phone

Don't change any game logic or SDK calls. Only change presentation files.
```

---

## Step 5 — Add a leaderboard screen

```
Add a leaderboard tab to my Sticker Galaxy game.

The SDK already has a getLeaderboard() function in src/sdk.ts that returns 
the current month's top scores. 

Build:
1. A "Leaderboard" button that reveals a leaderboard panel
2. The panel calls sdk.getLeaderboard() and displays top 10 entries
3. Highlight the current player's row (user_id matches session.user_id)
4. Show trophy tiers (gold/silver/bronze icons next to ranked players)
5. Show a "Resets [DATE]" countdown

Add HTML to index.html, styles to public/styles.css, 
and the fetch logic to src/main.ts or src/ui.ts (your choice).
```

---

## Step 6 — Add a cosmetic purchase

```
Add a cosmetic purchase button to my game.

In src/sdk.ts there's a requestPurchase() function. Wire it up:

1. Add a "Buy Golden Dice (0.1 TON)" button to index.html 
   (already stub-hidden with style="display:none" — just unhide it)
2. When clicked, call sdk.requestPurchase('cosmetic_skin', 'golden_dice', 0.1, 
   'Golden Dice — cosmetic only')
3. If the response has success: true, open response.payment_url in a new window
4. Listen for the PURCHASE_CONFIRMED postMessage in main.ts and show a 
   "Purchase complete!" message

This is a mock purchase in dev mode — it won't charge anyone.
Update manifest.json cosmetic_items to include the golden_dice item.
```

---

## Step 7 — Prepare for launch

```
My game is ready to submit to the Sticker Galaxy Arcade.

Review all files and help me prepare for launch:

1. Check manifest.json — are all required fields filled in? 
   Required: name, studio, studio_ton_wallet, genre, sector, url, 
   max_score, play_duration_range_seconds
   
2. Check that VITE_USE_MOCK defaults to 0 in production builds 
   (it should, per vite.config.ts)

3. Verify the postMessage origin check in main.ts is uncommented 
   and set to 'https://app.stickergalaxy.io'

4. Check that score values passed to sdk.submitResult() are within 
   the range declared in manifest.json max_score

5. Check that no purchase type is blocked (only cosmetic_skin, extra_play, 
   tournament_entry are allowed)

List any issues found and fix them.
```

---

## Debugging prompts

**"The dice/game animation isn't working":**
```
The animation in src/ui.ts at [FUNCTION NAME] isn't working. 
Here's what I see: [DESCRIBE THE PROBLEM]
Here's what I expected: [DESCRIBE EXPECTED BEHAVIOR]
Look at the browser console errors: [PASTE CONSOLE ERRORS]
Fix it without changing any SDK calls or exported function signatures.
```

**"The SDK mock isn't updating the balance":**
```
After clicking Roll, the midi balance in the header isn't updating.
Here's the flow that should happen:
1. submitEntry() reduces balance (sets state.midiBalance = entryRes.new_midi_balance)
2. If win, submitResult() increases balance by payout + midi_awarded
3. updateUI(state) renders state.midiBalance to #midi-balance

Look at src/game.ts lines around the state update and src/ui.ts updateUI().
Find why the DOM isn't reflecting state.midiBalance and fix it.
```

**"TypeScript errors I don't understand":**
```
I have TypeScript errors I don't understand. Here they are:
[PASTE ERRORS]

I'm building a Sticker Galaxy Arcade game. The types are in src/types.ts.
Explain what each error means in plain English and fix them.
Don't change the type definitions in types.ts — those come from the SDK spec.
```

---

## The golden rule

**Describe what you want, not how to build it.**

Bad: "I want to change the clickHandler to use async/await and update the promise chain"  
Good: "When I click Roll, I want to see a loading spinner, then the dice result, then the midi balance update — all in sequence without the page jumping around"

The AI knows the code. You know what the game should feel like. Describe the experience.

---

*SDK docs: https://docs.stickergalaxy.io/llms.txt*  
*Contact Hollow: @hollowtradr*
