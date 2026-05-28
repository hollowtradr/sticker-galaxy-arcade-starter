// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Local type definitions for the Arcade Starter Template
//
// These mirror the shapes returned by the Sticker Galaxy Arcade SDK.
// If you're an AI assistant reading this: these types come from the SDK spec.
// Do not invent new API shapes — match these exactly.
//
// SDK Docs: https://docs.stickergalaxy.io
// ─────────────────────────────────────────────────────────────────────────────

// ── Session ──────────────────────────────────────────────────────────────────

/**
 * Returned by GET /arcade/v0/session
 * The core player context your game works with.
 */
export interface SessionResponse {
  success: true
  user_id: string
  display_name: string
  midi_balance: number
  daily_plays_remaining: number
  is_featured_game_today: boolean
  /** IMPORTANT: Store this and pass it with every result submission */
  proof_of_play_token: string
  session_expires_at: string
}

// ── Entry ─────────────────────────────────────────────────────────────────────

/**
 * Returned by POST /arcade/v0/entry
 * Called when the player commits to a play (clicks "Play", "Bet", "Enter Race").
 */
export interface EntryResponse {
  success: true
  /** Store this — you need it when submitting the result */
  entry_id: string
  new_midi_balance: number
  message: string
}

// ── Result ────────────────────────────────────────────────────────────────────

/**
 * Returned by POST /arcade/v0/result
 * Called when the game session ends (win, loss, or draw).
 */
export interface ResultResponse {
  success: true
  midi_awarded: number
  trophy_awarded: TrophyAwarded | null
  leaderboard_rank: number | null
  message: string
}

export interface TrophyAwarded {
  trophy_id: string
  name: string
  tier: 'gold' | 'silver' | 'bronze' | 'studio_cosmetic'
  description: string
}

// ── Purchase ──────────────────────────────────────────────────────────────────

/**
 * Returned by POST /arcade/v0/purchase
 * Studios never handle real money — always route through this endpoint.
 */
export interface PurchaseResponse {
  success: true
  purchase_id: string
  payment_url: string
  studio_credit_ton: number
  message: string
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardResponse {
  success: true
  month: string
  resets_at: string
  entries: LeaderboardEntry[]
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  score: number
  trophy_tier: 'gold' | 'silver' | 'bronze' | null
  daily_midi_bonus: number
}

// ── Error ─────────────────────────────────────────────────────────────────────

/** All SDK errors return this shape */
export interface ApiError {
  success: false
  error: string
}

export type ApiResponse<T> = T | ApiError

// ── Game-specific types (dice roll demo) ─────────────────────────────────────

export type Outcome = 'win' | 'loss' | 'draw'

export interface DiceRoll {
  die1: number
  die2: number
  total: number
}

export interface RoundResult {
  roll: DiceRoll
  wager: number
  outcome: Outcome
  payout: number       // midi returned to player (0 on loss)
  midiAwarded: number  // bonus midi from platform (score reward)
  score: number        // score reported to platform
  balanceBefore: number
  balanceAfter: number
  timestamp: number
}

export interface GameState {
  session: SessionResponse | null
  entryId: string | null
  midiBalance: number
  dailyPlaysRemaining: number
  history: RoundResult[]
  isPlaying: boolean
}

// ── Wallet Binding & Holder Tiers ────────────────────────────────────────────

/**
 * Five-tier holder status based on $YODA balance snapshot.
 * Returned by getWalletBinding() and refreshTier().
 */
export type HolderTier = 'initiate' | 'padawan' | 'knight' | 'master' | 'grandmaster'

/**
 * Full wallet binding record returned by GET /arcade/v0/wallet when bound.
 */
export interface WalletBinding {
  address: string
  tier: HolderTier
  balance_yoda: number
  last_snapshot_at: string  // ISO8601
  bind_source: 'bot' | 'mini-app' | 'arcade'
  address_public: boolean
  tonproof_verified: boolean
}

/**
 * Returned by promptConnectWallet().
 *
 * On 409 (wallet already bound elsewhere) existing_binding is set.
 * The game should show Keep/Replace UI and call promptConnectWallet({ force: true })
 * if the user chooses to replace.
 */
export interface ConnectResult {
  success: boolean
  address?: string
  tier?: HolderTier
  error?: string
  /** 409 case — client must show Keep/Replace UI */
  existing_binding?: { address: string; tier: HolderTier; bind_source: string }
}

/**
 * Fired by onTierChange() callbacks when a wallet refresh detects a tier change.
 */
export interface TierChangeEvent {
  old_tier: HolderTier
  new_tier: HolderTier
  balance_yoda: number
}

// ── postMessage events (host ↔ game) ─────────────────────────────────────────

export interface HostMessage {
  type:
    | 'SESSION_INIT'
    | 'PURCHASE_CONFIRMED'
    | 'PURCHASE_FAILED'
    | 'SESSION_EXPIRING'
    | 'SESSION_KILLED'
  [key: string]: unknown
}

export interface GameMessage {
  type:
    | 'GAME_READY'
    | 'PURCHASE_REQUEST'
    | 'GAME_COMPLETE'
    | 'GAME_ERROR'
  game_id: string
  [key: string]: unknown
}
