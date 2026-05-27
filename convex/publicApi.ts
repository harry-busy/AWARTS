import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { requireBearerAuth, resolveBearerToken } from "./lib/apiAuth";
import { authHasScope, scopeErrorMessage } from "./lib/apiScopes";
import { isValidProvider } from "./lib/providers";

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function serializeUserPublic(user: {
  _id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  githubUsername?: string;
  isPublic: boolean;
  _creationTime: number;
}) {
  return {
    id: user._id,
    username: user.username,
    display_name: user.displayName ?? user.username,
    avatar_url: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    country: user.country ?? null,
    github_username: user.githubUsername ?? null,
    is_public: user.isPublic,
    joined_at: new Date(user._creationTime).toISOString(),
  };
}

function aggregateUsage(entries: Array<{
  date: string;
  provider: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  models: string[];
  rawData?: string;
}>) {
  const totalCostUsd = entries.reduce((s, e) => s + e.costUsd, 0);
  const totalInputTokens = entries.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutputTokens = entries.reduce((s, e) => s + e.outputTokens, 0);
  const uniqueDates = new Set(entries.map((e) => e.date));
  const uniqueProviders = [...new Set(entries.map((e) => e.provider))];

  const sortedDates = [...uniqueDates].sort().reverse();
  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];
  let checkDate = today;
  for (const date of sortedDates) {
    if (date === checkDate || date === getPreviousDate(checkDate)) {
      currentStreak++;
      checkDate = date;
    } else {
      break;
    }
  }

  const byProvider: Record<string, { cost_usd: number; input_tokens: number; output_tokens: number; days: number }> = {};
  const providerDays: Record<string, Set<string>> = {};
  for (const e of entries) {
    if (!byProvider[e.provider]) {
      byProvider[e.provider] = { cost_usd: 0, input_tokens: 0, output_tokens: 0, days: 0 };
      providerDays[e.provider] = new Set();
    }
    byProvider[e.provider].cost_usd += e.costUsd;
    byProvider[e.provider].input_tokens += e.inputTokens;
    byProvider[e.provider].output_tokens += e.outputTokens;
    providerDays[e.provider].add(e.date);
  }
  for (const p of Object.keys(byProvider)) {
    byProvider[p].days = providerDays[p]?.size ?? 0;
  }

  return {
    total_cost_usd: totalCostUsd,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_tokens: totalInputTokens + totalOutputTokens,
    total_days: uniqueDates.size,
    current_streak: currentStreak,
    providers_used: uniqueProviders,
    by_provider: byProvider,
  };
}

export const getPublicUser = query({
  args: { username: v.string(), authToken: v.optional(v.string()) },
  handler: async (ctx, { username, authToken }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return null;

    const auth = authToken ? await resolveBearerToken(ctx, authToken) : null;
    const isOwner = auth?.user._id === user._id;

    if (!user.isPublic && !isOwner) {
      return {
        user: serializeUserPublic(user),
        private: true,
        stats: null,
      };
    }

    const usageEntries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const achievements = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      user: serializeUserPublic(user),
      private: false,
      stats: aggregateUsage(usageEntries),
      achievements: achievements.map((a) => a.slug),
    };
  },
});

export const getPublicUserUsage = query({
  args: {
    username: v.string(),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    provider: v.optional(v.string()),
    authToken: v.optional(v.string()),
  },
  handler: async (ctx, { username, from, to, provider, authToken }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return null;

    const auth = authToken ? await resolveBearerToken(ctx, authToken) : null;
    const isOwner = auth?.user._id === user._id;
    if (!user.isPublic && !isOwner) return { error: "private_profile" };

    let entries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (from) entries = entries.filter((e) => e.date >= from);
    if (to) entries = entries.filter((e) => e.date <= to);
    if (provider && isValidProvider(provider)) {
      entries = entries.filter((e) => e.provider === provider);
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));

    return {
      username: user.username,
      entries: entries.map((e) => ({
        date: e.date,
        provider: e.provider,
        cost_usd: e.costUsd,
        input_tokens: e.inputTokens,
        output_tokens: e.outputTokens,
        cache_creation_tokens: e.cacheCreationTokens ?? 0,
        cache_read_tokens: e.cacheReadTokens ?? 0,
        models: e.models,
        cost_source: e.costSource ?? "real",
        meta: e.rawData ? safeParseJson(e.rawData) : null,
      })),
      count: entries.length,
    };
  },
});

export const getAuthenticatedMe = query({
  args: { authToken: v.string() },
  handler: async (ctx, { authToken }) => {
    const auth = await requireBearerAuth(ctx, authToken);
    if (auth.method === "api_key" && !authHasScope(auth, "read")) {
      throw new Error(scopeErrorMessage("read"));
    }
    const usageEntries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", auth.user._id))
      .collect();

    return {
      user: serializeUserPublic(auth.user),
      auth_method: auth.method,
      stats: aggregateUsage(usageEntries),
    };
  },
});

export const getPublicLeaderboard = query({
  args: {
    period: v.optional(v.string()),
    provider: v.optional(v.string()),
    limit: v.optional(v.number()),
    authToken: v.optional(v.string()),
  },
  handler: async (ctx, { period = "all_time", provider, limit = 50 }) => {
    const safeLimit = Math.min(Math.max(1, limit ?? 50), 100);
    const now = new Date();
    let startDate: string | null = null;
    if (period === "daily") startDate = now.toISOString().split("T")[0];
    else if (period === "weekly") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (period === "monthly") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    let usageEntries = startDate
      ? await ctx.db.query("daily_usage").withIndex("by_date", (q) => q.gte("date", startDate!)).collect()
      : await ctx.db.query("daily_usage").take(10000);

    if (provider && isValidProvider(provider)) {
      usageEntries = usageEntries.filter((e) => e.provider === provider);
    }

    const publicUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();
    const userMap = new Map(publicUsers.map((u) => [String(u._id), u]));
    const totals = new Map<string, { cost: number; tokens: number }>();

    for (const u of publicUsers) {
      totals.set(String(u._id), { cost: 0, tokens: 0 });
    }

    for (const e of usageEntries) {
      const uid = String(e.userId);
      if (!totals.has(uid)) continue;
      const t = totals.get(uid)!;
      t.cost += e.costUsd;
      t.tokens += e.inputTokens + e.outputTokens;
    }

    const ranked = [...totals.entries()]
      .filter(([, t]) => t.cost > 0 || t.tokens > 0)
      .sort((a, b) => b[1].cost - a[1].cost || b[1].tokens - a[1].tokens)
      .slice(0, safeLimit)
      .map(([uid, t], i) => {
        const u = userMap.get(uid)!;
        return {
          rank: i + 1,
          username: u.username,
          display_name: u.displayName ?? u.username,
          avatar_url: u.avatarUrl ?? null,
          cost_usd: t.cost,
          tokens: t.tokens,
        };
      });

    return { period, provider: provider ?? "all", entries: ranked };
  },
});

export const touchApiKeyLastUsed = internalMutation({
  args: { apiKeyId: v.id("api_keys") },
  handler: async (ctx, { apiKeyId }) => {
    await ctx.db.patch(apiKeyId, { lastUsedAt: Date.now() });
  },
});

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
