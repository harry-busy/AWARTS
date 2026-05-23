/** Canonical AI provider keys used across API, CLI, and web. */
export const VALID_PROVIDERS = [
  "claude",
  "codex",
  "gemini",
  "antigravity",
  "cursor",
] as const;

export type ProviderKey = (typeof VALID_PROVIDERS)[number];

export function isValidProvider(provider: string): provider is ProviderKey {
  return (VALID_PROVIDERS as readonly string[]).includes(provider);
}

export const ALL_PROVIDERS_COUNT = VALID_PROVIDERS.length;
