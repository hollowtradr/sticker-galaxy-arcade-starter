// ─────────────────────────────────────────────────────────────────────────────
// ui.ts — DOM rendering and Canvas drawing
//
// PURPOSE
//   All DOM manipulation lives here. game.ts calls these functions — it never
//   touches the DOM directly. This keeps game logic and presentation separate.
//
// TWO RENDERING OPTIONS
//   Option 1 (active): Plain DOM + HTML5 Canvas — simple, fast, beginner-friendly
//   Option 2 (commented): PixiJS — uncomment when you want sprites and animations
//
// AI ASSISTANTS
//   To replace the visual layer:
//   - Keep the exported function signatures (updateUI, showResult, showError, etc.)
//   - Replace the implementations below to use PixiJS or any other renderer
//   - Never put game logic or SDK calls in this file
// ─────────────────────────────────────────────────────────────────────────────

// ── Option 2: PixiJS ──────────────────────────────────────────────────────────
// Uncomment these lines when you're ready to add 2D sprites and animations.
// PixiJS is already installed (package.json). Remove the plain canvas section
// below and replace it with a PixiJS Application + Sprites.
//
// import * as PIXI from 'pixi.js'
//
// const app = new PIXI.Application({
//   width: 390,
//   height: 600,
//   backgroundColor: 0x1a1a2e,
//   resolution: window.devicePixelRatio || 1,
//   autoDensity: true,
// })
// document.getElementById('game-canvas')?.appendChild(app.view as HTMLCanvasElement)
//
// const diceSprite = PIXI.Sprite.from('/assets/dice.png')
// diceSprite.anchor.set(0.5)
// diceSprite.x = app.screen.width / 2
// diceSprite.y = 200
// app.stage.addChild(diceSprite)
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, RoundResult, ResultResponse } from './types'

// ── Option 1: Plain Canvas (active) ──────────────────────────────────────────

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!canvas) canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  if (!ctx && canvas) ctx = canvas.getContext('2d')
  if (!canvas || !ctx) return null
  return { canvas, ctx }
}

/**
 * drawDice(die1, die2, rolling?)
 *
 * Draws two dice on the canvas using plain Canvas API.
 * Replace this with PixiJS sprites when you're ready for fancier graphics.
 */
export function drawDice(die1: number, die2: number, rolling = false): void {
  const c = getCanvas()
  if (!c) return
  const { canvas: cv, ctx: cx } = c

  cx.clearRect(0, 0, cv.width, cv.height)

  // Background
  cx.fillStyle = '#1a1a2e'
  cx.fillRect(0, 0, cv.width, cv.height)

  if (rolling) {
    // "Rolling..." state — draw blurry wobble effect
    cx.globalAlpha = 0.6
    drawSingleDie(cx, 70, cv.height / 2, Math.ceil(Math.random() * 6), 60)
    drawSingleDie(cx, 190, cv.height / 2, Math.ceil(Math.random() * 6), 60)
    cx.globalAlpha = 1

    cx.fillStyle = '#e2c04a'
    cx.font = 'bold 18px monospace'
    cx.textAlign = 'center'
    cx.fillText('Rolling…', cv.width / 2, cv.height / 2 + 70)
  } else {
    drawSingleDie(cx, 80, cv.height / 2, die1, 60)
    drawSingleDie(cx, 210, cv.height / 2, die2, 60)

    cx.fillStyle = '#aaa'
    cx.font = '14px monospace'
    cx.textAlign = 'center'
    cx.fillText(`Total: ${die1 + die2}`, cv.width / 2, cv.height / 2 + 65)
  }
}

function drawSingleDie(
  cx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  size: number
): void {
  const half = size / 2
  const r = 10 // corner radius

  // Die body
  cx.fillStyle = '#2d2d5e'
  cx.strokeStyle = '#e2c04a'
  cx.lineWidth = 2
  cx.beginPath()
  cx.roundRect(x - half, y - half, size, size, r)
  cx.fill()
  cx.stroke()

  // Pip positions for each face value
  const pips: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-0.3, -0.3], [0.3, 0.3]],
    3: [[-0.3, -0.3], [0, 0], [0.3, 0.3]],
    4: [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]],
    5: [[-0.3, -0.3], [0.3, -0.3], [0, 0], [-0.3, 0.3], [0.3, 0.3]],
    6: [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0], [0.3, 0], [-0.3, 0.3], [0.3, 0.3]],
  }

  const pipPositions = pips[value] ?? []
  cx.fillStyle = '#e2c04a'

  for (const [px, py] of pipPositions) {
    cx.beginPath()
    cx.arc(x + px * size * 0.65, y + py * size * 0.65, size * 0.08, 0, Math.PI * 2)
    cx.fill()
  }
}

// ── DOM update functions ──────────────────────────────────────────────────────

/**
 * updateUI(state)
 *
 * Called after any state change to re-render the UI to match the current state.
 */
export function updateUI(state: GameState): void {
  // Midi balance
  const balanceEl = document.getElementById('midi-balance')
  if (balanceEl) balanceEl.textContent = state.midiBalance.toLocaleString()

  // Plays remaining
  const playsEl = document.getElementById('plays-remaining')
  if (playsEl) {
    playsEl.textContent = `${state.dailyPlaysRemaining}/3 plays today`
    playsEl.className = state.dailyPlaysRemaining === 0 ? 'plays-empty' : 'plays-ok'
  }

  // Player name
  if (state.session) {
    const nameEl = document.getElementById('player-name')
    if (nameEl) nameEl.textContent = state.session.display_name
  }

  // Wager input max
  const wagerInput = document.getElementById('wager-input') as HTMLInputElement
  if (wagerInput) {
    wagerInput.max = String(Math.min(200, state.midiBalance))
    // Cap current value if balance dropped below it
    if (parseInt(wagerInput.value) > state.midiBalance) {
      wagerInput.value = String(Math.min(state.midiBalance, 50))
    }
  }

  // Roll button — disabled when playing or no plays left
  const rollBtn = document.getElementById('roll-btn') as HTMLButtonElement
  if (rollBtn) {
    rollBtn.disabled = state.isPlaying || state.dailyPlaysRemaining === 0
    rollBtn.textContent = state.isPlaying ? 'Rolling…' : 'Roll Dice'
  }

  // Empty canvas if not in a roll
  if (!state.isPlaying && state.history.length === 0) {
    drawDice(1, 6, false)
  }

  // History
  renderHistory(state)
}

/**
 * showResult(round, resultResponse)
 *
 * Called after a game round completes. Shows the outcome prominently.
 */
export function showResult(round: RoundResult, resultRes: ResultResponse): void {
  drawDice(round.roll.die1, round.roll.die2, false)

  const resultEl = document.getElementById('result-display')
  if (!resultEl) return

  const isWin = round.outcome === 'win'

  resultEl.className = isWin ? 'result-win' : 'result-loss'
  resultEl.innerHTML = `
    <div class="result-headline">${isWin ? '🎲 You Win!' : '💀 You Lose'}</div>
    <div class="result-roll">Rolled ${round.roll.die1} + ${round.roll.die2} = <strong>${round.roll.total}</strong></div>
    ${isWin
      ? `<div class="result-payout">+${round.payout.toLocaleString()} midi returned</div>`
      : `<div class="result-loss-text">-${round.wager.toLocaleString()} midi lost</div>`
    }
    ${resultRes.midi_awarded > 0
      ? `<div class="result-reward">+${resultRes.midi_awarded} bonus midi from platform 🎁</div>`
      : ''
    }
    ${resultRes.trophy_awarded
      ? `<div class="result-trophy">🏆 Trophy Unlocked: ${resultRes.trophy_awarded.name}</div>`
      : ''
    }
    <div class="result-rank">${resultRes.leaderboard_rank ? `Leaderboard rank: #${resultRes.leaderboard_rank}` : ''}</div>
  `

  // Auto-clear result display after 5 seconds
  setTimeout(() => {
    resultEl.className = ''
    resultEl.innerHTML = ''
  }, 5000)
}

/**
 * showError(message)
 *
 * Display an error message to the player.
 */
export function showError(message: string): void {
  const errEl = document.getElementById('error-display')
  if (errEl) {
    errEl.textContent = message
    errEl.style.display = 'block'
    setTimeout(() => {
      errEl.style.display = 'none'
      errEl.textContent = ''
    }, 4000)
  }
  console.error('[UI ERROR]', message)
}

/**
 * showLoading(message?)
 */
export function showLoading(message = 'Loading…'): void {
  const loadEl = document.getElementById('loading-display')
  if (loadEl) {
    loadEl.textContent = message
    loadEl.style.display = 'block'
  }
}

/**
 * hideLoading()
 */
export function hideLoading(): void {
  const loadEl = document.getElementById('loading-display')
  if (loadEl) loadEl.style.display = 'none'
}

/**
 * renderHistory(state)
 *
 * Renders the last 3 round results in the history section.
 */
function renderHistory(state: GameState): void {
  const historyEl = document.getElementById('history-list')
  if (!historyEl) return

  if (state.history.length === 0) {
    historyEl.innerHTML = '<li class="history-empty">No rolls yet — place your first wager!</li>'
    return
  }

  historyEl.innerHTML = state.history
    .map(
      (r) => `
      <li class="${r.outcome === 'win' ? 'history-win' : 'history-loss'}">
        <span class="history-dice">[${r.roll.die1}+${r.roll.die2}=${r.roll.total}]</span>
        <span class="history-outcome">${r.outcome === 'win' ? '✓ Won' : '✗ Lost'}</span>
        <span class="history-wager">${r.wager} midi wagered</span>
        ${r.midiAwarded > 0 ? `<span class="history-bonus">+${r.midiAwarded} bonus</span>` : ''}
      </li>
    `
    )
    .join('')
}

// ── Rolling animation helper ──────────────────────────────────────────────────

/**
 * animateRolling(onComplete)
 *
 * Shows 3 frames of random dice before settling on the final roll.
 * Call this between entry and result for a satisfying visual effect.
 */
export function animateRolling(frames = 6, intervalMs = 120): Promise<void> {
  return new Promise((resolve) => {
    let count = 0
    const timer = setInterval(() => {
      drawDice(0, 0, true)
      count++
      if (count >= frames) {
        clearInterval(timer)
        resolve()
      }
    }, intervalMs)
  })
}
