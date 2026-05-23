import { v } from "convex/values";
import { query } from "./_generated/server";

export const searchUsers = query({
  args: {
    q: v.string(),
    limit: v.optional(v.number()),
    provider: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, { q, limit = 20, provider, country }) => {
    if (!q || q.length < 1) return [];

    const safeLimit = Math.min(Math.max(1, limit), 50);
    const term = q.toLowerCase().slice(0, 100);

    const allUsers = await ctx.db.query("users").take(500);

    let matched = allUsers.filter(
      (u) =>
        u.isPublic &&
        (u.username.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term) ||
          u.bio?.toLowerCase().includes(term))
    );

    // Filter by country
    if (country) {
      matched = matched.filter((u) => u.country === country);
    }

    const results = matched.slice(0, safeLimit);

    // If provider filter, check usage data (single indexed query per user)
    if (provider) {
      const validProviders = ["claude", "codex", "gemini", "antigravity", "cursor"];
      if (validProviders.includes(provider)) {
        const filtered = [];
        for (const user of results) {
          const hasProvider = await ctx.db
            .query("daily_usage")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("provider"), provider))
            .first();
          if (hasProvider) filtered.push(user);
        }
        return filtered.map((u) => ({
          _id: u._id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          bio: u.bio,
          country: u.country,
        }));
      }
    }

    return results.map((u) => ({
      _id: u._id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      country: u.country,
    }));
  },
});
