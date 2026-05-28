// ─────────────────────────────────────────────────────────────────────────────
// mock-host.ts — Offline mock of the Sticker Galaxy Arcade backend
//
// PURPOSE
//   Lets you develop and test your game without a real backend or a Telegram
//   session token. All SDK calls route here when VITE_USE_MOCK=1 (the default
//   during local dev).
//
// WHAT IT DOES
//   - Simulates GET /arcade/v0/session
//   - Simulates POST /arcade/v0/entry    (deducts midi, persists to localStorage)
//   - Simulates POST /arcade/v0/result   (awards midi, persists to localStorage)
//   - Simulates POST /arcade/v0/purchase (returns a fake payment URL)
//   - Logs every "API call" to the browser console so you can debug
//
// STORAGE
//   State is persisted in localStorage under the key "sg_arcade_mock_state".
//   Clear it (DevTools → Application → Local Storage) to reset the mock player.
//
// AI ASSISTANTS
//   If you're extending this template, do NOT change this file's interface.
//   sdk.ts calls these functions. Keep the function signatures matching the real
//   SDK response types in types.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SessionResponse,
  EntryResponse,
  ResultResponse,
  PurchaseResponse,
} from './types'

// ── Mock storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sg_arcade_mock_state'

interface MockState {
  midi_balance: number
  daily_plays_remaining: number
  total_plays: number
  pending_entry_id: string | null
}

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockState
  } catch {
    // ignore parse errors
  }
  // Default starting state — a fresh dev player
  return {
    midi_balance: 1000,
    daily_plays_remaining: 3,
    total_plays: 0,
    pending_entry_id: null,
  }
}

function saveState(state: MockState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ── Logging helper ─────────────────────────────────────────────────────────────

function mockLog(endpoint: string, req: unknown, res: unknown): void {
  console.group(`[MOCK HOST] ${endpoint}`)
  console.log('→ Request:', req)
  console.log('← Response:', res)
  console.groupEnd()
}

// ── Simulated network delay (makes dev feel realistic) ───────────────────────

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Mock session ─────────────────────────────────────────────────────────────

/**
 * Simulates GET /arcade/v0/session
 * Returns a fake player context so your game can render without a real token.
 */
export async function mockGetSession(_token: string): Promise<SessionResponse> {
  await delay(200)

  const state = loadState()

  const response: SessionResponse = {
    success: true,
    user_id: 'dev_user_001',
    display_name: 'Dev Player',
    midi_balance: state.midi_balance,
    daily_plays_remaining: state.daily_plays_remaining,
    is_featured_game_today: false,
    proof_of_play_token: 'mock_proof_token_' + Date.now(),
    session_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }

  mockLog('GET /arcade/v0/session', { token: _token }, response)
  return response
}

// ── Mock entry ────────────────────────────────────────────────────────────────

/**
 * Simulates POST /arcade/v0/entry
 * Deducts the entry fee from mock midi balance and returns an entry_id.
 */
export async function mockPostEntry(
  userId: string,
  entryFeeMidi: number,
  description: string
): Promise<EntryResponse> {
  await delay(300)

  const state = loadState()

  if (state.midi_balance < entryFeeMidi) {
    throw new Error(`Not enough midi. Have ${state.midi_balance}, need ${entryFeeMidi}.`)
  }

  if (state.daily_plays_remaining <= 0) {
    throw new Error('No plays remaining today. Come back tomorrow or buy an extra play.')
  }

  const entryId = `mock_entry_${Date.now()}`
  state.midi_balance -= entryFeeMidi
  state.daily_plays_remaining -= 1
  state.total_plays += 1
  state.pending_entry_id = entryId
  saveState(state)

  const response: EntryResponse = {
    success: true,
    entry_id: entryId,
    new_midi_balance: state.midi_balance,
    message: `[MOCK] Entry confirmed. ${description}`,
  }

  mockLog('POST /arcade/v0/entry', { userId, entryFeeMidi, description }, response)
  return response
}

// ── Mock result ───────────────────────────────────────────────────────────────

/**
 * Simulates POST /arcade/v0/result
 *
 * Midi awards follow a simplified version of the real formula:
 *   midi_awarded = floor((score / max_score) * 1000)
 *   Capped at 1000 per play.
 *
 * In real life the host calculates this. We're approximating it here.
 */
export async function mockPostResult(
  entryId: string,
  userId: string,
  score: number,
  outcome: 'win' | 'loss' | 'draw',
  proofToken: string,
  durationSeconds: number,
  metadata: Record<string, unknown>
): Promise<ResultResponse> {
  await delay(400)

  const state = loadState()

  // Midi award formula using payout_per_point from manifest.
  // Real backend: midi_awarded = min(1000, floor(score * manifest.payout_per_point))
  // Mock hardcodes PAYOUT_PER_POINT = 1.0 (the manifest default).
  // Tune payout_per_point in manifest.json to fit your game's score distribution.
  // Cap stays at 1000 midi per play regardless of multiplier.
  const PAYOUT_PER_POINT = 1.0 // See manifest.json: payout_per_point
  const midiAwarded = outcome === 'win'
    ? Math.min(1000, Math.floor(score * PAYOUT_PER_POINT))
    : 0

  state.midi_balance += midiAwarded
  state.pending_entry_id = null
  saveState(state)

  // Randomly award a cosmetic trophy for dramatic effect (simulates real trophy logic)
  const trophyAwarded =
    state.total_plays === 1
      ? {
          trophy_id: 'first_win',
          name: 'Lucky Roll',
          tier: 'studio_cosmetic' as const,
          description: '[MOCK] Trophy: First win!',
        }
      : null

  const response: ResultResponse = {
    success: true,
    midi_awarded: midiAwarded,
    trophy_awarded: trophyAwarded,
    leaderboard_rank: Math.floor(Math.random() * 100) + 1,
    message: `[MOCK] ${outcome === 'win' ? `You won! ${midiAwarded} midi awarded.` : 'Better luck next roll.'}`,
  }

  mockLog(
    'POST /arcade/v0/result',
    { entryId, userId, score, outcome, proofToken, durationSeconds, metadata },
    response
  )

  return response
}

// ── Mock purchase ─────────────────────────────────────────────────────────────

/**
 * Simulates POST /arcade/v0/purchase
 * Returns a fake payment URL — clicking it in dev will just open a blank page.
 */
export async function mockPostPurchase(
  userId: string,
  itemType: string,
  itemId: string,
  priceTon: number,
  description: string,
  currency: string
): Promise<PurchaseResponse> {
  await delay(250)

  const purchaseId = `mock_purchase_${Date.now()}`

  const response: PurchaseResponse = {
    success: true,
    purchase_id: purchaseId,
    // In real life this opens a Telegram payment page. In mock, it's fake.
    payment_url: `https://pay.stickergalaxy.io/mock?purchase_id=${purchaseId}`,
    studio_credit_ton: priceTon * 0.7,
    message: `[MOCK] Payment link ready for "${description}"`,
  }

  mockLog(
    'POST /arcade/v0/purchase',
    { userId, itemType, itemId, priceTon, description, currency },
    response
  )

  return response
}

// ── Dev helpers ──────────────────────────────────────────────────────────────

/**
 * Reset mock state to default. Useful during development.
 * Call from browser console: window.__mockReset()
 */
export function resetMockState(): void {
  localStorage.removeItem(STORAGE_KEY)
  console.log('[MOCK HOST] State reset. Reload the page.')
}

/**
 * Add midi to the mock player. Useful for testing edge cases.
 * Call from browser console: window.__mockAddMidi(500)
 */
export function addMockMidi(amount: number): void {
  const state = loadState()
  state.midi_balance += amount
  saveState(state)
  console.log(`[MOCK HOST] Added ${amount} midi. New balance: ${state.midi_balance}`)
}

/**
 * Restore daily plays in mock state.
 * Call from browser console: window.__mockRestorePlays()
 */
export function restoreMockPlays(): void {
  const state = loadState()
  state.daily_plays_remaining = 3
  saveState(state)
  console.log('[MOCK HOST] Daily plays restored to 3. Reload the page.')
}
