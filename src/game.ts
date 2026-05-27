// ─────────────────────────────────────────────────────────────────────────────
// game.ts — Demo Game Logic: "Cantina Dice" (Beat-the-House Wager Game)
//
// THIS IS THE FILE YOU REPLACE TO MAKE YOUR OWN GAME.
//
// The demo is a simple 2d6 dice roll:
//   - Player sets a midi wager (max = their balance, UI-capped at 200)
//   - Player clicks "Roll"
//   - Two dice are rolled (sum of 2-12)
//   - Roll ≥ 8 = WIN → player gets 2x their wager back
//   - Roll < 8 = LOSS → player loses their wager
//
// The SDK integration (entry → play → result) is in this file so you can see
// the full flow. sdk.ts handles the actual HTTP calls.
//
// TO REPLACE THIS DEMO:
//   1. Keep the import block and the export functions (startGame, getGameState)
//   2. Replace rollDice() and the win condition with your own game logic
//   3. Keep the sdk.submitEntry() / sdk.submitResult() calls — they're required
//   4. Update manifest.json with your game's actual max_score
//
// AI ASSISTANTS
//   When building a custom game, replace the game logic here.
//   Keep the SDK calls (submitEntry, submitResult) exactly as-is.
//   The score passed to submitResult should match your manifest's max_score scale.
// ─────────────────────────────────────────────────────────────────────────────

import * as sdk from './sdk'
import { updateUI, showResult, showError, showLoading, hideLoading } from './ui'
import type { GameState, RoundResult, DiceRoll, Outcome } from './types'

// ── Game state ────────────────────────────────────────────────────────────────

/**
 * The single source of truth for the current game state.
 * ui.ts reads from this to render. Never modify it directly — use the
 * functions below to update it.
 */
const state: GameState = {
  session: null,
  entryId: null,
  midiBalance: 0,
  dailyPlaysRemaining: 0,
  history: [],
  isPlaying: false,
}

export function getGameState(): GameState {
  return state
}

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * init()
 *
 * Called once on page load. Validates the session and populates the initial
 * game state. Nothing renders until this succeeds.
 */
export async function init(): Promise<void> {
  showLoading('Connecting to Sticker Galaxy…')

  const session = await sdk.initSession()

  if (!session.success) {
    hideLoading()
    showError(`Session failed: ${session.error}`)
    sdk.notifyGameError(`Session failed: ${session.error}`)
    return
  }

  state.session = session
  state.midiBalance = session.midi_balance
  state.dailyPlaysRemaining = session.daily_plays_remaining

  hideLoading()
  updateUI(state)

  // Tell the host shell we're ready to display
  sdk.notifyGameReady()
}

// ── Core game loop ─────────────────────────────────────────────────────────────

/**
 * startGame(wagerMidi)
 *
 * The main game function. Call this when the player clicks "Roll".
 *
 * Flow:
 *   1. submitEntry — deducts wager from player's midi balance
 *   2. [game logic] — roll 2d6, determine outcome
 *   3. submitResult — reports score/outcome, receives midi_awarded
 *   4. Update UI with result
 */
export async function startGame(wagerMidi: number): Promise<void> {
  if (state.isPlaying) return
  if (!state.session) {
    showError('No active session. Reload the page.')
    return
  }

  // ── Validation ────────────────────────────────────────────────────────────
  if (wagerMidi <= 0) {
    showError('Wager must be at least 1 midi.')
    return
  }
  if (wagerMidi > state.midiBalance) {
    showError(`Not enough midi. You have ${state.midiBalance}.`)
    return
  }
  if (state.dailyPlaysRemaining <= 0) {
    showError("You've used all your plays for today. Come back tomorrow!")
    return
  }

  state.isPlaying = true
  const startTime = Date.now()

  // ── Step 1: Submit entry (deduct wager) ───────────────────────────────────
  showLoading('Placing your bet…')

  const entryRes = await sdk.submitEntry(wagerMidi, `Cantina Dice — ${wagerMidi} midi wager`)

  if (!entryRes.success) {
    state.isPlaying = false
    hideLoading()
    showError(`Entry failed: ${entryRes.error}`)
    return
  }

  state.entryId = entryRes.entry_id
  state.midiBalance = entryRes.new_midi_balance
  state.dailyPlaysRemaining = Math.max(0, state.dailyPlaysRemaining - 1)

  hideLoading()
  updateUI(state)

  // ── Step 2: Animate the dice roll ─────────────────────────────────────────
  // Small delay so the player sees the "rolling…" animation in the UI
  showLoading('Rolling…')
  await sleep(800)

  const roll = rollDice()
  const outcome = determineOutcome(roll)
  const payout = outcome === 'win' ? wagerMidi * 2 : 0

  // Score submitted to the platform: 0-1000 scale
  // Win = score proportional to wager relative to max bet (200 midi)
  // Loss = 0
  // Adjust MAX_WAGER to match your manifest's max_score scale.
  const MAX_WAGER = 200
  const score = outcome === 'win' ? Math.round((wagerMidi / MAX_WAGER) * 1000) : 0

  hideLoading()

  // ── Step 3: Submit result to platform ─────────────────────────────────────
  const durationSeconds = Math.round((Date.now() - startTime) / 1000)

  const resultRes = await sdk.submitResult(
    state.entryId,
    score,
    outcome,
    durationSeconds,
    {
      dice_total: roll.total,
      die1: roll.die1,
      die2: roll.die2,
      wager_midi: wagerMidi,
      payout_midi: payout,
    }
  )

  if (!resultRes.success) {
    // Result failed — this is unusual. Log it and show a warning.
    // The entry fee is already spent even if result fails.
    console.error('[GAME] Result submission failed:', resultRes.error)
    showError(`Result could not be recorded. Contact support. Entry ID: ${state.entryId}`)
    state.isPlaying = false
    return
  }

  // ── Step 4: Update state with result ─────────────────────────────────────
  // On win: payout (2x wager) was already deducted but the wager came back
  // The platform awards midi_awarded on top of the payout
  state.midiBalance += payout + resultRes.midi_awarded

  const roundResult: RoundResult = {
    roll,
    wager: wagerMidi,
    outcome,
    payout,
    midiAwarded: resultRes.midi_awarded,
    score,
    balanceBefore: entryRes.new_midi_balance,
    balanceAfter: state.midiBalance,
    timestamp: Date.now(),
  }

  // Keep last 3 results in history
  state.history = [roundResult, ...state.history].slice(0, 3)
  state.entryId = null
  state.isPlaying = false

  // ── Step 5: Show the result ───────────────────────────────────────────────
  showResult(roundResult, resultRes)
  updateUI(state)

  // Tell the host we're done with this session
  sdk.notifyGameComplete(entryRes.entry_id)

  // If a trophy was awarded, make it a moment
  if (resultRes.trophy_awarded) {
    console.log('🏆 Trophy awarded!', resultRes.trophy_awarded)
    // ui.ts handles trophy display inside showResult()
  }
}

// ── Game logic: 2d6 dice roll ─────────────────────────────────────────────────

/**
 * rollDice()
 *
 * Rolls two six-sided dice and returns the individual values and their sum.
 *
 * ─── REPLACE THIS FUNCTION to implement your own game ───
 * Whatever your game does — physics sim, card draw, race calculation —
 * it should return a score (integer) and an outcome ('win'/'loss'/'draw').
 */
function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  return { die1, die2, total: die1 + die2 }
}

/**
 * determineOutcome(roll)
 *
 * Roll ≥ 8 = win (probability: ~58% — slightly favors the player)
 * Roll < 8 = loss
 *
 * ─── REPLACE THIS with your win condition ───
 */
function determineOutcome(roll: DiceRoll): Outcome {
  return roll.total >= 8 ? 'win' : 'loss'
}

// ── Utility ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
