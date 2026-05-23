import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getCurrentUser } from "../users";

export type AuthMethod = "clerk" | "cli" | "api_key";

export interface ResolvedAuth {
  user: Doc<"users">;
  method: AuthMethod;
  apiKeyId?: Id<"api_keys">;
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolveBearerToken(
  ctx: QueryCtx | MutationCtx,
  bearerToken: string | undefined,
): Promise<ResolvedAuth | null> {
  if (!bearerToken?.trim()) {
    const clerkUser = await getCurrentUser(ctx);
    if (!clerkUser) return null;
    return { user: clerkUser, method: "clerk" };
  }

  const token = bearerToken.trim();

  // API key: aw_live_...
  if (token.startsWith("aw_live_")) {
    const keyHash = await hashKey(token);
    const row = await ctx.db
      .query("api_keys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .unique();
    if (!row || row.revokedAt) return null;
    const user = await ctx.db.get(row.userId);
    if (!user) return null;
    return { user, method: "api_key", apiKeyId: row._id };
  }

  // CLI JWT
  const authRow = await ctx.db
    .query("cli_auth_codes")
    .withIndex("by_jwt", (q) => q.eq("jwtToken", token))
    .first();

  if (authRow?.status === "verified" && authRow.userId) {
    if (authRow.tokenExpiresAt && authRow.tokenExpiresAt < Date.now()) {
      return null;
    }
    const user = await ctx.db.get(authRow.userId);
    if (!user) return null;
    if ("patch" in ctx.db) {
      await ctx.db.patch(authRow._id, { lastUsedAt: Date.now() });
    }
    return { user, method: "cli" };
  }

  return null;
}

export async function requireBearerAuth(
  ctx: QueryCtx | MutationCtx,
  bearerToken: string | undefined,
): Promise<ResolvedAuth> {
  const auth = await resolveBearerToken(ctx, bearerToken);
  if (!auth) throw new Error("Not authenticated");
  return auth;
}

export function generateApiKey(): { fullKey: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const fullKey = `aw_live_${secret}`;
  const prefix = fullKey.slice(0, 16);
  return { fullKey, prefix };
}

export { hashKey };
