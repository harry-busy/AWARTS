import type { ResolvedAuth } from "./apiAuth";

/** Scopes granted on API keys. CLI JWT and Clerk sessions have full access. */
export type ApiScope = "read" | "write" | "mcp";

export const DEFAULT_API_KEY_SCOPES: ApiScope[] = ["read", "write", "mcp"];

export function authHasScope(auth: ResolvedAuth, scope: ApiScope): boolean {
  if (auth.method === "cli" || auth.method === "clerk") return true;
  const scopes = auth.scopes ?? [];
  if (scopes.includes("admin")) return true;
  switch (scope) {
    case "read":
      return scopes.includes("read") || scopes.includes("write");
    case "write":
      return scopes.includes("write");
    case "mcp":
      return scopes.includes("mcp") || scopes.includes("write");
    default:
      return false;
  }
}

export function scopeErrorMessage(scope: ApiScope): string {
  return `API key missing required scope: ${scope}`;
}
