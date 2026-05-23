/**
 * Shared type definitions for the AWARTS CLI.
 */

// ── Provider keys ──────────────────────────────────────────────────────
export type ProviderKey = 'claude' | 'codex' | 'gemini' | 'antigravity' | 'cursor';

// ── Usage entry -- the universal shape sent to the backend ─────────────
export interface UsageEntry {
  date: string;                           // YYYY-MM-DD
  provider: ProviderKey;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  models: string[];
  cost_source?: 'real' | 'estimated';
  raw_data?: string;
}

// ── Adapter contract ───────────────────────────────────────────────────
export interface Adapter {
  /** Provider key used in API payloads. */
  name: ProviderKey;
  /** Human-readable display name. */
  displayName: string;
  /** Returns true if the tool appears to be installed / has local data. */
  detect(): Promise<boolean>;
  /** Read all available usage entries from local data. */
  read(): Promise<UsageEntry[]>;
}

// ── API response types (mirrors backend) ───────────────────────────────
export interface InitResponse {
  code: string;
  device_token: string;
  verify_url: string;
  expires_in: number;
}

export interface PollResponse {
  status: 'pending' | 'verified' | 'expired';
  token?: string;
  user_id?: string;
}

export interface SubmitRequest {
  entries: UsageEntry[];
  source: 'cli' | 'web' | 'api' | 'mcp';
  hash?: string;
  note?: string;
}

export interface SubmitResponse {
  success: boolean;
  processed: number;
  posts_created: number;
  errors?: Array<{ date: string; provider: string; error: string }>;
}
