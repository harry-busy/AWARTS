import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { resolveBearerToken } from "./lib/apiAuth";
import { isValidProvider, ALL_PROVIDERS_COUNT } from "./lib/providers";

const usageEntryValidator = v.object({
  date: v.string(),
  provider: v.string(),
  cost_usd: v.number(),
  input_tokens: v.number(),
  output_tokens: v.number(),
  cache_creation_tokens: v.optional(v.number()),
  cache_read_tokens: v.optional(v.number()),
  models: v.array(v.string()),
  raw_data: v.optional(v.string()),
  cost_source: v.optional(v.string()),
});

// Maximum per-token cost in USD (very generous: $75/1M output = $0.000075/token)
// Using 5x safety margin = $0.000375/token ≈ $0.0004/token
const MAX_COST_PER_TOKEN = 0.0004;
// Minimum tokens required if cost exceeds this threshold
const COST_SANITY_THRESHOLD = 0.50; // $0.50

/**
 * Validate that cost_usd is proportional to token counts.
 * Returns the corrected cost (capped if unrealistic) or the original cost.
 */
function sanitizeCost(costUsd: number, inputTokens: number, outputTokens: number): number {
  if (costUsd <= COST_SANITY_THRESHOLD) return costUsd; // small costs are fine
  const totalTokens = inputTokens + outputTokens;
  if (totalTokens === 0) return 0; // no tokens means no cost
  const maxReasonableCost = totalTokens * MAX_COST_PER_TOKEN;
  // Cap the cost at the maximum reasonable amount (with a floor of $1)
  return Math.min(costUsd, Math.max(maxReasonableCost, 1));
}

// POST /usage/submit — core endpoint (supports both Clerk auth and CLI token auth)
export const submitUsage = mutation({
  args: {
    entries: v.array(usageEntryValidator),
    source: v.string(),
    hash: v.optional(v.string()),
    authToken: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { entries, source, hash, authToken, note }) => {
    let me = await getCurrentUser(ctx);
    if (!me && authToken) {
      const resolved = await resolveBearerToken(ctx, authToken);
      if (resolved) {
        me = resolved.user;
        if (resolved.apiKeyId) {
          await ctx.db.patch(resolved.apiKeyId, { lastUsedAt: Date.now() });
        }
      }
    }

    if (!me) throw new Error("Not authenticated");

    const errors: Array<{ date: string; provider: string; error: string }> = [];
    let processed = 0;
    const affectedDates = new Set<string>();

    const validProviders = ["claude", "codex", "gemini", "antigravity", "cursor"];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const today = new Date().toISOString().split("T")[0];

    // Deduplicate: keep last entry for each date+provider pair
    const dedupMap = new Map<string, typeof entries[number]>();
    for (const entry of entries) {
      dedupMap.set(`${entry.date}:${entry.provider}`, entry);
    }
    const dedupedEntries = [...dedupMap.values()];

    for (const entry of dedupedEntries) {
      if (!isValidProvider(entry.provider)) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Invalid provider" });
        continue;
      }

      // Validate date format and not in the future
      if (!dateRegex.test(entry.date)) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Invalid date format (expected YYYY-MM-DD)" });
        continue;
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      if (entry.date > tomorrow) {
        errors.push({ date: entry.date, provider: entry.provider, error: `Date ${entry.date} is too far in the future (today is ${today})` });
        continue;
      }

      // Validate numeric bounds
      if (entry.cost_usd < 0 || entry.cost_usd > 10000) {
        errors.push({ date: entry.date, provider: entry.provider, error: "cost_usd out of range (0-10000)" });
        continue;
      }
      if (entry.input_tokens < 0 || entry.input_tokens > 1_000_000_000) {
        errors.push({ date: entry.date, provider: entry.provider, error: "input_tokens out of range" });
        continue;
      }
      if (entry.output_tokens < 0 || entry.output_tokens > 1_000_000_000) {
        errors.push({ date: entry.date, provider: entry.provider, error: "output_tokens out of range" });
        continue;
      }

      // Sanitize cost to prevent unrealistic values
      const sanitizedCost = sanitizeCost(entry.cost_usd, entry.input_tokens, entry.output_tokens);

      // Validate models array
      if (entry.models.length > 20) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Too many models (max 20)" });
        continue;
      }
      if (entry.models.some((m: string) => m.length > 100)) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Model name too long (max 100 chars)" });
        continue;
      }

      // Check for existing entry (upsert logic)
      const existing = await ctx.db
        .query("daily_usage")
        .withIndex("by_user_date_provider_source", (q) =>
          q.eq("userId", me._id).eq("date", entry.date).eq("provider", entry.provider).eq("source", source)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          costUsd: sanitizedCost,
          inputTokens: entry.input_tokens,
          outputTokens: entry.output_tokens,
          cacheCreationTokens: entry.cache_creation_tokens ?? 0,
          cacheReadTokens: entry.cache_read_tokens ?? 0,
          models: entry.models,
          source,
          dataHash: hash ?? undefined,
          rawData: entry.raw_data ?? undefined,
          costSource: sanitizedCost < entry.cost_usd ? "capped" : (entry.cost_source ?? undefined),
        });
      } else {
        await ctx.db.insert("daily_usage", {
          userId: me._id,
          date: entry.date,
          provider: entry.provider,
          costUsd: sanitizedCost,
          inputTokens: entry.input_tokens,
          outputTokens: entry.output_tokens,
          cacheCreationTokens: entry.cache_creation_tokens ?? 0,
          cacheReadTokens: entry.cache_read_tokens ?? 0,
          models: entry.models,
          source,
          dataHash: hash ?? undefined,
          rawData: entry.raw_data ?? undefined,
          costSource: sanitizedCost < entry.cost_usd ? "capped" : (entry.cost_source ?? undefined),
        });
      }

      processed++;
      affectedDates.add(entry.date);
    }

    // Create or update posts for each affected date
    let postsCreated = 0;
    for (const date of affectedDates) {
      const existingPost = await ctx.db
        .query("posts")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", me._id).eq("usageDate", date)
        )
        .unique();

      const usageEntries = await ctx.db
        .query("daily_usage")
        .withIndex("by_user", (q) =>
          q.eq("userId", me._id)
        )
        .filter((q) => q.eq(q.field("date"), date))
        .collect();

      const providers = [...new Set(usageEntries.map((e) => e.provider))];

      if (existingPost) {
        const patch: Record<string, any> = { providers };
        // Only set description from CLI note if post doesn't already have one
        if (note && !existingPost.description) {
          patch.description = note.slice(0, 2000);
        }
        await ctx.db.patch(existingPost._id, patch);
        // Re-link
        const oldLinks = await ctx.db
          .query("post_daily_usage")
          .withIndex("by_post", (q) => q.eq("postId", existingPost._id))
          .collect();
        for (const link of oldLinks) await ctx.db.delete(link._id);
        for (const ue of usageEntries) {
          await ctx.db.insert("post_daily_usage", {
            postId: existingPost._id,
            dailyUsageId: ue._id,
          });
        }
      } else {
        const postId = await ctx.db.insert("posts", {
          userId: me._id,
          usageDate: date,
          images: [],
          providers,
          isPublished: true,
          ...(note && { description: note.slice(0, 2000) }),
        });
        for (const ue of usageEntries) {
          await ctx.db.insert("post_daily_usage", {
            postId,
            dailyUsageId: ue._id,
          });
        }

        // Auto-generate caption if no manual note was provided
        if (!note) {
          const totalCost = usageEntries.reduce((s, e) => s + e.costUsd, 0);
          const totalTokens = usageEntries.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0);
          const allModels = [...new Set(usageEntries.flatMap((e) => e.models ?? []))];
          if (totalCost > 0.5 || totalTokens > 10000) {
            await ctx.scheduler.runAfter(0, internal.ai.autoGeneratePostCaption, {
              postId,
              stats: {
                totalCost,
                totalTokens,
                providers,
                models: allModels.length > 0 ? allModels : undefined,
                date,
              },
            });
          }
        }

        postsCreated++;
      }
    }

    // Check achievements
    await checkAchievements(ctx, me._id);

    return {
      success: errors.length === 0,
      processed,
      posts_created: postsCreated,
      ...(errors.length > 0 && { errors }),
    };
  },
});

async function checkAchievements(
  ctx: any,
  userId: Id<"users">
) {
  const stats = await ctx.db
    .query("daily_usage")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  if (!stats || stats.length === 0) return;

  const totalCost = stats.reduce((sum: number, r: any) => sum + r.costUsd, 0);
  const uniqueDates = new Set(stats.map((r: any) => r.date));
  const uniqueProviders = new Set(stats.map((r: any) => r.provider));
  const dayCount = uniqueDates.size;

  const checks = [
    { slug: "first-submit", condition: dayCount >= 1 },
    { slug: "week-warrior", condition: dayCount >= 7 },
    { slug: "month-master", condition: dayCount >= 30 },
    { slug: "hundred-days", condition: dayCount >= 100 },
    { slug: "big-spender-10", condition: totalCost >= 10 },
    { slug: "big-spender-100", condition: totalCost >= 100 },
    { slug: "big-spender-1000", condition: totalCost >= 1000 },
    { slug: "multi-provider", condition: uniqueProviders.size >= 2 },
    { slug: "all-providers", condition: uniqueProviders.size >= ALL_PROVIDERS_COUNT },
  ];

  for (const { slug, condition } of checks) {
    if (!condition) continue;
    const existing = await ctx.db
      .query("user_achievements")
      .withIndex("by_user_slug", (q: any) =>
        q.eq("userId", userId).eq("slug", slug)
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("user_achievements", { userId, slug });
    }
  }
}

// ─── Cleanup: delete usage entries and orphaned posts for bad dates ─────
export const cleanupUsage = mutation({
  args: {
    beforeDate: v.optional(v.string()), // Delete entries with date before this (default: "2020-01-01")
    dates: v.optional(v.array(v.string())), // Delete entries with these specific dates
    authToken: v.optional(v.string()),
  },
  handler: async (ctx, { beforeDate, dates, authToken }) => {
    let me = await getCurrentUser(ctx);
    if (!me && authToken) {
      const resolved = await resolveBearerToken(ctx, authToken);
      if (resolved) me = resolved.user;
    }

    if (!me) throw new Error("Not authenticated");

    const cutoff = beforeDate ?? "2020-01-01";
    let deleted = 0;
    let postsDeleted = 0;

    // Find all usage entries for this user
    const allEntries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const entriesToDelete = allEntries.filter((e) => {
      if (dates && dates.includes(e.date)) return true;
      if (e.date < cutoff) return true;
      return false;
    });

    const affectedDates = new Set(entriesToDelete.map((e) => e.date));

    // Delete usage entries
    for (const entry of entriesToDelete) {
      // Delete post_daily_usage links pointing to this entry
      const links = await ctx.db
        .query("post_daily_usage")
        .withIndex("by_usage", (q) => q.eq("dailyUsageId", entry._id))
        .collect();
      for (const link of links) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.delete(entry._id);
      deleted++;
    }

    // Delete orphaned posts for affected dates
    for (const date of affectedDates) {
      const post = await ctx.db
        .query("posts")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", me._id).eq("usageDate", date)
        )
        .unique();

      if (!post) continue;

      // Check if post still has any linked usage entries
      const remainingLinks = await ctx.db
        .query("post_daily_usage")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      if (remainingLinks.length === 0) {
        // Delete kudos and comments too
        const kudos = await ctx.db
          .query("kudos")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();
        for (const k of kudos) await ctx.db.delete(k._id);

        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();
        for (const c of comments) await ctx.db.delete(c._id);

        await ctx.db.delete(post._id);
        postsDeleted++;
      }
    }

    return { deleted, posts_deleted: postsDeleted };
  },
});

// ─── Web Import (Clerk auth only) ──────────────────────────────────────
export const importUsage = mutation({
  args: {
    entries: v.array(v.object({
      date: v.string(),
      provider: v.string(),
      cost_usd: v.number(),
      input_tokens: v.number(),
      output_tokens: v.number(),
      models: v.array(v.string()),
      cost_source: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { entries }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    if (entries.length > 500) {
      throw new Error("Too many entries (max 500)");
    }

    // Reuse submitUsage logic by calling it internally
    const errors: Array<{ date: string; provider: string; error: string }> = [];
    let processed = 0;
    const affectedDates = new Set<string>();

    const validProviders = ["claude", "codex", "gemini", "antigravity", "cursor"];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const today = new Date().toISOString().split("T")[0];

    for (const entry of entries) {
      if (!isValidProvider(entry.provider)) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Invalid provider" });
        continue;
      }
      if (!dateRegex.test(entry.date)) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Invalid date format" });
        continue;
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      if (entry.date > tomorrow) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Future date" });
        continue;
      }
      if (entry.cost_usd < 0 || entry.cost_usd > 10000) {
        errors.push({ date: entry.date, provider: entry.provider, error: "Cost out of range" });
        continue;
      }

      const importSanitizedCost = sanitizeCost(entry.cost_usd, entry.input_tokens, entry.output_tokens);

      const existing = await ctx.db
        .query("daily_usage")
        .withIndex("by_user_date_provider_source", (q) =>
          q.eq("userId", me._id).eq("date", entry.date).eq("provider", entry.provider).eq("source", "web-import")
        )
        .unique();

      const record = {
        costUsd: importSanitizedCost,
        inputTokens: entry.input_tokens,
        outputTokens: entry.output_tokens,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        models: entry.models,
        source: "web-import",
        costSource: importSanitizedCost < entry.cost_usd ? "capped" : (entry.cost_source ?? "real"),
      };

      if (existing) {
        await ctx.db.patch(existing._id, record);
      } else {
        await ctx.db.insert("daily_usage", {
          userId: me._id,
          date: entry.date,
          provider: entry.provider,
          ...record,
        });
      }

      processed++;
      affectedDates.add(entry.date);
    }

    // Create posts for affected dates
    let postsCreated = 0;
    for (const date of affectedDates) {
      const existingPost = await ctx.db
        .query("posts")
        .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("usageDate", date))
        .unique();

      const usageEntries = await ctx.db
        .query("daily_usage")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .filter((q) => q.eq(q.field("date"), date))
        .collect();

      const providers = [...new Set(usageEntries.map((e) => e.provider))];

      if (!existingPost) {
        const postId = await ctx.db.insert("posts", {
          userId: me._id,
          usageDate: date,
          images: [],
          providers,
          isPublished: true,
        });
        for (const ue of usageEntries) {
          await ctx.db.insert("post_daily_usage", { postId, dailyUsageId: ue._id });
        }
        postsCreated++;
      } else {
        await ctx.db.patch(existingPost._id, { providers });
      }
    }

    await checkAchievements(ctx, me._id);

    return {
      success: errors.length === 0,
      processed,
      posts_created: postsCreated,
      ...(errors.length > 0 && { errors }),
    };
  },
});

// ─── Fix unrealistic costs in existing data (admin only) ────────────
function getAdminClerkIds(): string[] {
  const ids = process.env.ADMIN_CLERK_IDS;
  if (!ids) return [];
  return ids.split(",").map((id) => id.trim()).filter(Boolean);
}

export const fixUnrealisticCosts = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    // Only allow admins to run this mutation
    const adminIds = getAdminClerkIds();
    if (adminIds.length === 0 || !adminIds.includes(me.clerkId)) {
      throw new Error("Forbidden: admin access required");
    }

    // Fix all usage entries (admin action)
    const allEntries = await ctx.db.query("daily_usage").collect();

    let fixed = 0;
    for (const entry of allEntries) {
      const corrected = sanitizeCost(entry.costUsd, entry.inputTokens, entry.outputTokens);
      if (corrected < entry.costUsd) {
        await ctx.db.patch(entry._id, {
          costUsd: corrected,
          costSource: "capped",
        });
        fixed++;
      }
    }

    return { fixed, total: allEntries.length };
  },
});
