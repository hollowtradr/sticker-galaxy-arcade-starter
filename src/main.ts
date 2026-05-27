// ─────────────────────────────────────────────────────────────────────────────
// main.ts — Entry point for the Sticker Galaxy Arcade Starter Template
//
// PURPOSE
//   This file wires everything together:
//     1. On load → init the session (sdk.ts)
//     2. Connect the "Roll" button to startGame() (game.ts)
//     3. Listen for postMessage events from the host shell
//     4. Register dev console helpers (mock-host.ts)
//
// WHAT NOT TO CHANGE
//   - The postMessage listener structure (§11 of the SDK spec)
//   - The session initialization flow
//   - The import structure
//
// WHAT TO CHANGE
//   - The game-specific event handler calls (startGame, etc.)
//   - Add your own UI event listeners
//   - Replace game.ts with your own game logic
// ─────────────────────────────────────────────────────────────────────────────

import { init, startGame, getGameState } from './game'
import { updateUI, drawDice, animateRolling, showError } from './ui'
import { resetMockState, addMockMidi, restoreMockPlays } from './mock-host'
import type { HostMessage } from './types'

// ── postMessage listener — host → game ───────────────────────────────────────
//
// The Sticker Galaxy host shell sends these events to your iframe.
// You MUST listen for SESSION_EXPIRING to save state before the session dies.

window.addEventListener('message', (event: MessageEvent) => {
  // In production, enforce origin check:
  // if (event.origin !== 'https://app.stickergalaxy.io') return
  //
  // Skipped in dev/mock mode so localhost works.
  const useMock = import.meta.env.VITE_USE_MOCK === '1' ||
    import.meta.env.VITE_USE_MOCK === 'true'

  if (!useMock && event.origin !== 'https://app.stickergalaxy.io') return

  const msg = event.data as HostMessage
  if (!msg?.type) return

  switch (msg.type) {
    case 'SESSION_INIT':
      // Host is pushing session data directly (alternative to URL params)
      // sdk.ts already handles the URL-param flow, but you can use this too
      console.log('[HOST] SESSION_INIT received', msg)
      break

    case 'PURCHASE_CONFIRMED':
      // Player completed a real-money purchase — update their state
      console.log('[HOST] PURCHASE_CONFIRMED', msg)
      // TODO: if this was an extra_play, increment dailyPlaysRemaining
      break

    case 'PURCHASE_FAILED':
      console.log('[HOST] PURCHASE_FAILED', msg)
      showError('Payment was cancelled or failed. Try again.')
      break

    case 'SESSION_EXPIRING':
      // Session expires in ~5 minutes — save any important state now
      console.warn('[HOST] SESSION_EXPIRING — session expires soon, save state')
      // If your game has mid-round state, save it to localStorage here
      // so you can restore it when the player re-opens the game
      saveGameStateToStorage()
      break

    case 'SESSION_KILLED':
      // Host is tearing down the iframe — final cleanup
      console.warn('[HOST] SESSION_KILLED — cleaning up')
      saveGameStateToStorage()
      break
  }
})

// ── DOM event listeners ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // ── Wager slider sync ─────────────────────────────────────────────────────
  const wagerInput = document.getElementById('wager-input') as HTMLInputElement
  const wagerDisplay = document.getElementById('wager-display')

  if (wagerInput && wagerDisplay) {
    wagerInput.addEventListener('input', () => {
      wagerDisplay.textContent = wagerInput.value
    })
  }

  // ── Roll button ──────────────────────────────────────────────────────────
  const rollBtn = document.getElementById('roll-btn') as HTMLButtonElement
  if (rollBtn) {
    rollBtn.addEventListener('click', async () => {
      const wager = parseInt(wagerInput?.value ?? '50')
      if (isNaN(wager) || wager <= 0) {
        showError('Set a wager amount first.')
        return
      }

      // Animate dice rolling before the real result
      rollBtn.disabled = true
      await animateRolling(8, 100)

      await startGame(wager)
    })
  }

  // ── Max bet button ────────────────────────────────────────────────────────
  const maxBetBtn = document.getElementById('max-bet-btn')
  if (maxBetBtn) {
    maxBetBtn.addEventListener('click', () => {
      const state = getGameState()
      const maxWager = Math.min(200, state.midiBalance)
      if (wagerInput) {
        wagerInput.value = String(maxWager)
        if (wagerDisplay) wagerDisplay.textContent = String(maxWager)
      }
    })
  }

  // ── Min bet button ────────────────────────────────────────────────────────
  const minBetBtn = document.getElementById('min-bet-btn')
  if (minBetBtn) {
    minBetBtn.addEventListener('click', () => {
      if (wagerInput) {
        wagerInput.value = '10'
        if (wagerDisplay) wagerDisplay.textContent = '10'
      }
    })
  }

  // ── Initialize the game (session + first render) ──────────────────────────
  await init()

  // Draw initial dice so the canvas isn't blank
  drawDice(3, 4, false)
})

// ── State persistence ─────────────────────────────────────────────────────────
//
// Save minimal state to localStorage so the game can resume after a session
// token refresh or a brief page reload.

const GAME_STATE_KEY = 'sg_arcade_game_state'

function saveGameStateToStorage(): void {
  const state = getGameState()
  try {
    localStorage.setItem(
      GAME_STATE_KEY,
      JSON.stringify({
        history: state.history,
        savedAt: Date.now(),
      })
    )
  } catch {
    // localStorage might be unavailable in some iframe contexts — ignore
  }
}

// Save state when player navigates away (best-effort)
window.addEventListener('beforeunload', saveGameStateToStorage)
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGameStateToStorage()
})

// ── Dev console helpers ───────────────────────────────────────────────────────
// These are accessible in the browser console during development.

declare global {
  interface Window {
    __mockReset: () => void
    __mockAddMidi: (amount: number) => void
    __mockRestorePlays: () => void
    __getGameState: () => unknown
  }
}

window.__mockReset = () => {
  resetMockState()
  location.reload()
}
window.__mockAddMidi = (amount: number) => {
  addMockMidi(amount)
  location.reload()
}
window.__mockRestorePlays = () => {
  restoreMockPlays()
  location.reload()
}
window.__getGameState = () => {
  console.table(getGameState())
  return getGameState()
}
