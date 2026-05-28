// ─────────────────────────────────────────────────────────────────────────────
// sdk.ts — Sticker Galaxy Arcade SDK wrapper
//
// PURPOSE
//   This file wraps every Arcade API call. Your game code (game.ts) calls
//   these functions — it never calls fetch() directly. This keeps your game
//   logic clean and makes it trivial to swap mock ↔ real backend.
//
// MOCK vs REAL
//   When VITE_USE_MOCK=1 (default in dev), all calls go to mock-host.ts.
//   When VITE_USE_MOCK=0 (set in production), all calls hit the real API.
//
// SDK BASE URL
//   Production: https://api.stickergalaxy.io/arcade/v0
//   Sandbox:    https://sandbox.api.stickergalaxy.io/arcade/v0
//
// AI ASSISTANTS
//   All SDK functions are here. Do NOT add fetch() calls in game.ts or ui.ts.
//   If you need a new SDK endpoint, add a wrapper function in this file.
//   The real endpoint shapes are defined in types.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SessionResponse,
  EntryResponse,
  ResultResponse,
  PurchaseResponse,
  LeaderboardResponse,
  ApiError,
  WalletBinding,
  ConnectResult,
  HolderTier,
  TierChangeEvent,
} from './types'

import { TonConnectUI } from '@tonconnect/ui'
import type { TonProofItemReplySuccess } from '@tonconnect/ui'

import {
  mockGetSession,
  mockPostEntry,
  mockPostResult,
  mockPostPurchase,
  mockGetWalletBinding,
  mockPromptConnectWallet,
  mockRefreshTier,
  mockBindWallet,
  mockDisconnectWallet,
  mockSetTier,
  mockStaleSnapshot,
  mockUnverifyProof,
} from './mock-host'

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * Your game's registered ID. Change this to match your manifest.
 * This is sent as X-Game-Id on every API request.
 */
const GAME_ID = 'arcade-starter-demo'

/**
 * Real API base URL. Swap to sandbox URL for QA testing.
 */
const API_BASE = 'https://api.stickergalaxy.io/arcade/v0'

/**
 * Wallet API base — hosted on babyyoda-bot while wallet endpoints are in preview.
 * Will unify with API_BASE when promoted to the main edge.
 */
const WALLET_API_BASE = 'https://babyyoda-bot.fly.dev/arcade/v0'

/**
 * Whether to use the mock host instead of the real API.
 * Controlled by the VITE_USE_MOCK environment variable.
 * Default: true (mock active) in dev, false in production builds.
 */
const USE_MOCK: boolean =
  import.meta.env.VITE_USE_MOCK === '1' ||
  import.meta.env.VITE_USE_MOCK === 'true' ||
  // If no session_token in URL, fall back to mock automatically
  !new URLSearchParams(window.location.search).has('session_token')

// ── Internal state ────────────────────────────────────────────────────────────

/**
 * The session token read from the URL (?session_token=...) when the host
 * launches your game. Everything is unauthenticated without this.
 */
let _sessionToken: string | null = null

/**
 * The proof-of-play token returned by initSession().
 * MUST be passed with every result submission.
 */
let _proofOfPlayToken: string | null = null

/** Cache of last-known wallet binding. Updated by getWalletBinding() and promptConnectWallet(). */
let _lastBinding: WalletBinding | null = null

/** Registered tier-change callbacks. Fired when refreshTier() returns changed=true. */
let _tierChangeCallbacks: Array<(e: TierChangeEvent) => void> = []

/** TonConnect UI singleton (real mode only). */
let _tcUI: TonConnectUI | null = null

/** Pending force-bind data cached from a 409 conflict response. */
interface PendingForceBind {
  address: string
  ton_proof: TonProofItemReplySuccess['proof']
  network: string
}
let _pendingForceBind: PendingForceBind | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  if (!_sessionToken) {
    throw new Error('SDK: no session token. Call initSession() first.')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${_sessionToken}`,
    'X-Game-Id': GAME_ID,
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T | ApiError> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    })
    return (await res.json()) as T | ApiError
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

async function apiGet<T>(path: string): Promise<T | ApiError> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    return (await res.json()) as T | ApiError
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * Status-aware fetch for wallet endpoints (WALLET_API_BASE).
 * Returns { status, data } so callers can branch on HTTP codes (409, 429, etc.).
 * Throws on network failure — callers should wrap in try/catch.
 */
async function walletFetch<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const init: RequestInit = { method, headers: getHeaders() }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(`${WALLET_API_BASE}${path}`, init)
  const data = (await res.json()) as T
  return { status: res.status, data }
}

/** Lazy-init TonConnect UI singleton (real mode only). */
function getTonConnect(): TonConnectUI {
  if (!_tcUI) {
    _tcUI = new TonConnectUI({
      manifestUrl: 'https://stickergalaxy.io/tonconnect-manifest.json',
    })
  }
  return _tcUI
}

// ── Public SDK functions ──────────────────────────────────────────────────────

/**
 * initSession()
 *
 * CALL THIS FIRST — before rendering any game UI.
 *
 * Reads session_token from the URL query string (injected by the Sticker
 * Galaxy host when it launches your iframe), validates it against the host
 * backend, and returns the player's context (user_id, display_name,
 * midi_balance, etc.).
 *
 * In mock mode: returns a fake dev player without any URL token.
 *
 * @example
 *   const session = await sdk.initSession()
 *   if (!session.success) { showError(session.error); return }
 *   renderGame(session)
 */
export async function initSession(): Promise<SessionResponse | ApiError> {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('session_token') ?? 'mock_token'
  _sessionToken = token

  if (USE_MOCK) {
    const result = await mockGetSession(token)
    _proofOfPlayToken = result.proof_of_play_token
    return result
  }

  const result = await apiGet<SessionResponse>('/session')
  if ('success' in result && result.success) {
    _proofOfPlayToken = result.proof_of_play_token
  }
  return result
}

/**
 * submitEntry(feeMidi, description?)
 *
 * CALL THIS when the player confirms they want to play a round.
 * (When they click "Roll", "Place Bet", "Enter Race", etc.)
 *
 * This deducts the entry fee from the player's midi balance and returns an
 * entry_id that you MUST pass to submitResult().
 *
 * Free-to-play games: pass feeMidi = 0.
 *
 * @param feeMidi     Midi to deduct as entry fee (0 for free-to-play)
 * @param description Human-readable label for this entry (shown in logs)
 * @returns entry_id + updated midi balance, or an error
 */
export async function submitEntry(
  feeMidi: number,
  description = 'Game entry'
): Promise<EntryResponse | ApiError> {
  const userId = (await getStoredUserId()) ?? 'unknown'

  if (USE_MOCK) {
    return mockPostEntry(userId, feeMidi, description)
  }

  return apiPost<EntryResponse>('/entry', {
    user_id: userId,
    entry_fee_midi: feeMidi,
    description,
  })
}

/**
 * submitResult(entryId, score, outcome, durationSeconds, metadata?)
 *
 * CALL THIS when the game session ends.
 *
 * This is how midi rewards are triggered. The host reads your score, validates
 * it against your manifest's max_score, and decides how much midi to award.
 *
 * @param entryId         Returned by submitEntry()
 * @param score           Player's score this session (integer, max = manifest max_score)
 * @param outcome         'win' | 'loss' | 'draw'
 * @param durationSeconds How long the session lasted (used for fraud detection)
 * @param metadata        Optional freeform data for leaderboards/trophy logic (max 2KB)
 * @returns midi_awarded, trophy_awarded, leaderboard_rank
 */
export async function submitResult(
  entryId: string,
  score: number,
  outcome: 'win' | 'loss' | 'draw',
  durationSeconds: number,
  metadata: Record<string, unknown> = {}
): Promise<ResultResponse | ApiError> {
  if (!_proofOfPlayToken) {
    return { success: false, error: 'No proof-of-play token. Was initSession() called?' }
  }

  const userId = (await getStoredUserId()) ?? 'unknown'

  if (USE_MOCK) {
    return mockPostResult(
      entryId,
      userId,
      score,
      outcome,
      _proofOfPlayToken,
      durationSeconds,
      metadata
    )
  }

  return apiPost<ResultResponse>('/result', {
    entry_id: entryId,
    user_id: userId,
    score,
    outcome,
    proof_of_play_token: _proofOfPlayToken,
    play_duration_seconds: durationSeconds,
    metadata,
  })
}

/**
 * requestPurchase(itemType, itemId, priceTon, description, currency?)
 *
 * CALL THIS to trigger a real-money cosmetic / extra-play purchase.
 *
 * IMPORTANT: You never handle money directly. This endpoint creates a payment
 * link on the host. The host's payment UI opens, then sends a PURCHASE_CONFIRMED
 * or PURCHASE_FAILED postMessage back to your iframe.
 *
 * Allowed item types: 'cosmetic_skin' | 'extra_play' | 'tournament_entry'
 *
 * @example
 *   const res = await sdk.requestPurchase('extra_play', 'extra_play_1', 0.1, '1 extra roll today')
 *   if (res.success) window.open(res.payment_url)
 */
export async function requestPurchase(
  itemType: 'cosmetic_skin' | 'extra_play' | 'tournament_entry',
  itemId: string,
  priceTon: number,
  description: string,
  currency: 'TON' | 'Stars' | 'YODA' = 'TON'
): Promise<PurchaseResponse | ApiError> {
  // JIT wallet check — TON and YODA purchases require a bound wallet.
  // Stars is Telegram-native and walletless; never gate the Stars path.
  if (currency === 'TON' || currency === 'YODA') {
    const binding = await getWalletBinding()
    if (!binding) {
      const connectResult = await promptConnectWallet({ reason: 'purchase' })
      if (!connectResult.success) {
        return { success: false, error: 'wallet_required' }
      }
    }
  }

  const userId = (await getStoredUserId()) ?? 'unknown'

  if (USE_MOCK) {
    return mockPostPurchase(userId, itemType, itemId, priceTon, description, currency)
  }

  return apiPost<PurchaseResponse>('/purchase', {
    user_id: userId,
    item_type: itemType,
    item_id: itemId,
    price_ton: priceTon,
    description,
    currency,
  })
}

/**
 * getLeaderboard(limit?)
 *
 * Fetch the current month's leaderboard for this game.
 * Safe to poll every 30 seconds on a leaderboard screen.
 */
export async function getLeaderboard(limit = 20): Promise<LeaderboardResponse | ApiError> {
  if (USE_MOCK) {
    // Return a fake leaderboard for dev purposes
    return {
      success: true,
      month: new Date().toISOString().slice(0, 7),
      resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      entries: [
        { rank: 1, user_id: 'mock_001', display_name: 'GalacticRoller', score: 9800, trophy_tier: 'gold', daily_midi_bonus: 750 },
        { rank: 2, user_id: 'mock_002', display_name: 'LuckyDev', score: 7400, trophy_tier: 'gold', daily_midi_bonus: 750 },
        { rank: 3, user_id: 'mock_003', display_name: 'CantinaDice', score: 6200, trophy_tier: 'gold', daily_midi_bonus: 750 },
        { rank: 4, user_id: 'dev_user_001', display_name: 'Dev Player', score: 3000, trophy_tier: 'silver', daily_midi_bonus: 500 },
      ],
    }
  }

  return apiGet<LeaderboardResponse>(`/leaderboard?game_id=${GAME_ID}&limit=${limit}`)
}

// ── Wallet SDK functions ─────────────────────────────────────────────────────

/**
 * getWalletBinding()
 *
 * Returns the player's current wallet binding or null if unbound.
 *
 * - Caches the result in memory; refreshed on each call.
 * - If the snapshot is >24h old, fires a background refreshTier() best-effort.
 * - Safe to call before each game start to gate TON/YODA features.
 *
 * @example
 *   const binding = await sdk.getWalletBinding()
 *   if (binding) {
 *     console.log(binding.tier, binding.balance_yoda)
 *   }
 */
export async function getWalletBinding(): Promise<WalletBinding | null> {
  if (USE_MOCK) return mockGetWalletBinding()

  try {
    const { status, data } = await walletFetch<{ address: string | null } & Partial<WalletBinding>>(
      'GET',
      '/wallet'
    )
    if (status === 401) return null
    if (status !== 200 || !data.address) {
      _lastBinding = null
      return null
    }
    _lastBinding = data as WalletBinding
    // Stale snapshot: background refresh (fire-and-forget)
    const ageMs = Date.now() - new Date(data.last_snapshot_at!).getTime()
    if (ageMs > 24 * 60 * 60 * 1000) {
      void refreshTier().catch(() => {})
    }
    return _lastBinding
  } catch {
    return null
  }
}

/**
 * promptConnectWallet(opts?)
 *
 * Opens the TonConnect wallet modal so the player can connect and bind their
 * TON wallet. Call only at JIT trigger moments — never persist a button.
 *
 * On 409 (existing binding), returns { success: false, existing_binding: {...} }.
 * The game shows Keep/Replace UI. To replace, call promptConnectWallet({ force: true }).
 *
 * @param opts.reason  Optional context shown in the confirm dialog / modal label.
 * @param opts.force   Use cached 409 proof to call /wallet/bind/force without reopening modal.
 *
 * @example
 *   const result = await sdk.promptConnectWallet({ reason: 'purchase' })
 *   if (!result.success && result.existing_binding) {
 *     if (confirm('Replace existing wallet?')) {
 *       await sdk.promptConnectWallet({ force: true })
 *     }
 *   }
 */
export async function promptConnectWallet(
  opts?: { reason?: string; force?: boolean }
): Promise<ConnectResult> {
  if (USE_MOCK) return mockPromptConnectWallet(opts)

  const tc = getTonConnect()

  // Force bind: use address + proof cached from the last 409 response.
  // Avoids reopening the wallet modal for a simple Keep/Replace confirmation.
  if (opts?.force) {
    if (!_pendingForceBind) {
      return { success: false, error: 'no_pending_bind' }
    }
    try {
      const { status, data } = await walletFetch<WalletBinding>(
        'POST', '/wallet/bind/force', _pendingForceBind
      )
      _pendingForceBind = null
      if (status === 200) {
        _lastBinding = data
        return { success: true, address: data.address, tier: data.tier }
      }
      return { success: false, error: `force_bind_failed_${status}` }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  // Normal flow: disconnect TC first to guarantee a fresh tonProof on reconnect.
  if (tc.connected) {
    await tc.disconnect()
  }

  // Generate a nonce payload for this tonProof request.
  const payload = `arcade-${Date.now()}-${Math.random().toString(36).slice(2)}`
  tc.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } })

  return new Promise<ConnectResult>((resolve) => {
    let settled = false
    let unsubStatus: (() => void) | null = null
    let unsubModal: (() => void) | null = null

    function settle(result: ConnectResult): void {
      if (settled) return
      settled = true
      unsubStatus?.()
      unsubModal?.()
      tc.setConnectRequestParameters(null)
      resolve(result)
    }

    // Watch for wallet connection with tonProof
    unsubStatus = tc.onStatusChange(async (wallet) => {
      if (!wallet) return // disconnected event — ignore

      const address = wallet.account.address
      const network = wallet.account.chain
      const proofReply = wallet.connectItems?.tonProof

      // tonProof is mandatory for arcade binding
      if (!proofReply || !('proof' in proofReply)) {
        settle({ success: false, error: 'tonproof_failed' })
        return
      }

      const tonProof = (proofReply as TonProofItemReplySuccess).proof

      try {
        const { status, data } = await walletFetch<
          WalletBinding | { existing: { address: string; tier: HolderTier; bind_source: string } } | { error?: string }
        >('POST', '/wallet/bind', { address, ton_proof: tonProof, network })

        if (status === 200) {
          const ok = data as WalletBinding
          _lastBinding = ok
          _pendingForceBind = null
          settle({ success: true, address: ok.address, tier: ok.tier })
        } else if (status === 409) {
          // Cache proof so force-bind skips reopening TonConnect
          _pendingForceBind = { address, ton_proof: tonProof, network }
          const conflict = data as { existing: { address: string; tier: HolderTier; bind_source: string } }
          settle({ success: false, existing_binding: conflict.existing })
        } else {
          const errData = data as { error?: string; detail?: string }
          settle({ success: false, error: errData.error ?? errData.detail ?? `bind_failed_${status}` })
        }
      } catch (err) {
        settle({ success: false, error: String(err) })
      }
    })

    // Detect user closing modal without connecting
    unsubModal = tc.onModalStateChange((state) => {
      if (state.status === 'closed' && state.closeReason === 'action-cancelled') {
        settle({ success: false, error: 'dismissed' })
      }
    })

    void tc.openModal()
  })
}

/**
 * refreshTier()
 *
 * Requests a fresh $YODA balance snapshot and returns the current tier.
 * Fires onTierChange() callbacks if the tier changed since last snapshot.
 * Throws on 429 rate-limit — caller should handle gracefully.
 *
 * @example
 *   const { tier, changed } = await sdk.refreshTier()
 *   if (changed) console.log('Tier updated to', tier)
 */
export async function refreshTier(): Promise<{ tier: HolderTier; changed: boolean }> {
  if (USE_MOCK) return mockRefreshTier()

  const { status, data } = await walletFetch<{ tier: HolderTier; changed: boolean; balance_yoda: number }>(
    'POST', '/wallet/refresh', {}
  )

  if (status === 429) throw new Error('rate_limited')
  if (status !== 200) throw new Error(`refresh_failed_${status}`)

  if (data.changed && _lastBinding) {
    const event: TierChangeEvent = {
      old_tier: _lastBinding.tier,
      new_tier: data.tier,
      balance_yoda: data.balance_yoda,
    }
    _lastBinding.tier = data.tier
    _lastBinding.balance_yoda = data.balance_yoda
    for (const cb of _tierChangeCallbacks) cb(event)
  }

  return { tier: data.tier, changed: data.changed }
}

/**
 * openSettings(section?)
 *
 * Asks the host shell to open the Settings screen.
 * Posts { type: 'OPEN_SETTINGS', section } to window.parent.
 * No-ops when running standalone (no parent shell).
 */
export function openSettings(section?: 'wallet' | 'sound' | 'haptics' | 'about'): void {
  if (window.parent === window) {
    console.warn('openSettings: no parent shell detected — running standalone?')
    return
  }
  window.parent.postMessage({ type: 'OPEN_SETTINGS', section }, '*')
}

/**
 * onTierChange(callback)
 *
 * Subscribe to holder-tier change events. Fires when refreshTier()
 * (or the background stale-snapshot refresh) detects a tier change.
 * Returns an unsubscribe function.
 *
 * @example
 *   const unsub = sdk.onTierChange(({ old_tier, new_tier }) => {
 *     showTierBanner(`Level up: ${new_tier}!`)
 *   })
 *   // Later: unsub()
 */
export function onTierChange(cb: (e: TierChangeEvent) => void): () => void {
  _tierChangeCallbacks.push(cb)
  return () => { _tierChangeCallbacks = _tierChangeCallbacks.filter((fn) => fn !== cb) }
}

// ── postMessage helpers ────────────────────────────────────────────────────────

/**
 * notifyGameReady()
 *
 * Tell the host shell that your game has loaded and is ready to display.
 * Call this after initSession() succeeds and your first frame renders.
 */
export function notifyGameReady(): void {
  window.parent.postMessage({ type: 'GAME_READY', game_id: GAME_ID }, '*')
}

/**
 * notifyGameComplete(entryId)
 *
 * Tell the host the game session is fully complete. The host may show a
 * "Play Again" button or navigate the player away.
 */
export function notifyGameComplete(entryId: string): void {
  window.parent.postMessage({ type: 'GAME_COMPLETE', game_id: GAME_ID, entry_id: entryId }, '*')
}

/**
 * notifyGameError(message)
 *
 * Tell the host something went wrong. The host will show an error state.
 */
export function notifyGameError(message: string): void {
  window.parent.postMessage({ type: 'GAME_ERROR', game_id: GAME_ID, message }, '*')
}

// ── Internal util ─────────────────────────────────────────────────────────────

/**
 * Returns the user_id from the URL param (set by the host on iframe launch).
 * Falls back to the mock user_id in dev.
 */
async function getStoredUserId(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search)
  return params.get('user_id') ?? 'dev_user_001'
}

// ── Dev console helpers ───────────────────────────────────────────────────────

// Expose mock controls to the browser console for easy testing
if (USE_MOCK) {
  console.info(
    '%c[MOCK MODE ACTIVE]%c\nAll SDK calls are going to the mock host, not the real backend.\n' +
    'Dev console helpers:\n' +
    '  window.__mockReset()                   — reset player state\n' +
    '  window.__mockAddMidi(500)              — add midi to balance\n' +
    '  window.__mockRestorePlays()            — restore daily plays\n' +
    '  window.__mockBindWallet(addr?, tier?)  — bind a mock wallet\n' +
    '  window.__mockDisconnect()              — reset wallet to unbound\n' +
    '  window.__mockSetTier(tier)             — change tier on bound wallet\n' +
    '  window.__mockStaleSnapshot()           — age snapshot 48h (triggers refresh)\n' +
    '  window.__mockUnverifyProof()           — set tonproof_verified=false\n' +
    'Disable mock: set VITE_USE_MOCK=0 and add ?session_token=real_token to URL.',
    'background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    ''
  )

  // Assign wallet mock helpers to window
  window.__mockBindWallet = mockBindWallet
  window.__mockDisconnect = mockDisconnectWallet
  window.__mockSetTier = mockSetTier
  window.__mockStaleSnapshot = mockStaleSnapshot
  window.__mockUnverifyProof = mockUnverifyProof
}

// Augment Window with mock wallet helpers
declare global {
  interface Window {
    __mockBindWallet: (address?: string, tier?: HolderTier) => void
    __mockDisconnect: () => void
    __mockSetTier: (tier: HolderTier) => void
    __mockStaleSnapshot: () => void
    __mockUnverifyProof: () => void
  }
}
