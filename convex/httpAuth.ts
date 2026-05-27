import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { resolveBearerToken } from "./lib/apiAuth";
import { authHasScope, scopeErrorMessage, type ApiScope } from "./lib/apiScopes";

export const verifyTokenScope = internalQuery({
  args: {
    token: v.string(),
    scope: v.string(),
  },
  handler: async (ctx, { token, scope }) => {
    const auth = await resolveBearerToken(ctx, token);
    if (!auth) {
      return { ok: false as const, status: 401, error: "Authentication failed" };
    }
    const required = scope as ApiScope;
    if (!authHasScope(auth, required)) {
      return { ok: false as const, status: 403, error: scopeErrorMessage(required) };
    }
    return {
      ok: true as const,
      userId: auth.user._id,
      apiKeyId: auth.apiKeyId,
      method: auth.method,
    };
  },
});

/** Delete audit rows older than 30 days (runs on cron). */
export const cleanupAuditLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("api_audit_logs")
      .filter((q) => q.lt(q.field("_creationTime"), cutoff))
      .take(500);
    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    return { deleted: old.length };
  },
});

export const logApiRequest = internalMutation({
  args: {
    method: v.string(),
    path: v.string(),
    status: v.number(),
    userId: v.optional(v.id("users")),
    apiKeyId: v.optional(v.id("api_keys")),
    ip: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("api_audit_logs", {
      method: args.method.slice(0, 10),
      path: args.path.slice(0, 256),
      status: args.status,
      userId: args.userId,
      apiKeyId: args.apiKeyId,
      ip: args.ip?.slice(0, 64),
      durationMs: args.durationMs,
      error: args.error?.slice(0, 500),
    });
  },
});
