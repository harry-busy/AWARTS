import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { generateApiKey, hashKey } from "./lib/apiAuth";
import { DEFAULT_API_KEY_SCOPES } from "./lib/apiScopes";

export const listMyKeys = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const keys = await ctx.db
      .query("api_keys")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    return keys
      .filter((k) => !k.revokedAt)
      .map((k) => ({
        id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        createdAt: k._creationTime,
        lastUsedAt: k.lastUsedAt,
      }));
  },
});

export const createKey = mutation({
  args: {
    name: v.string(),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { name, scopes }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const trimmed = name.trim().slice(0, 64);
    if (!trimmed) throw new Error("Name is required");

    const allowedScopes = new Set(["read", "write", "mcp", "admin"]);
    const finalScopes = (scopes ?? [...DEFAULT_API_KEY_SCOPES]).filter((s) =>
      allowedScopes.has(s),
    );
    if (finalScopes.length === 0) {
      throw new Error("At least one valid scope required: read, write, mcp");
    }

    const existing = await ctx.db
      .query("api_keys")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const active = existing.filter((k) => !k.revokedAt);
    if (active.length >= 10) {
      throw new Error("Maximum 10 active API keys per account");
    }

    const { fullKey, prefix } = generateApiKey();
    const keyHash = await hashKey(fullKey);

    const id = await ctx.db.insert("api_keys", {
      userId: me._id,
      name: trimmed,
      keyHash,
      keyPrefix: prefix,
      scopes: finalScopes,
    });

    return {
      id,
      key: fullKey,
      keyPrefix: prefix,
      name: trimmed,
      message: "Store this key securely — it will not be shown again.",
    };
  },
});

export const revokeKey = mutation({
  args: { keyId: v.id("api_keys") },
  handler: async (ctx, { keyId }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const row = await ctx.db.get(keyId);
    if (!row || row.userId !== me._id) throw new Error("Key not found");

    await ctx.db.patch(keyId, { revokedAt: Date.now() });
    return { success: true };
  },
});
