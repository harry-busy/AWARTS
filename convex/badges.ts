import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Badge definitions
const BADGE_DEFS: Record<string, { name: string; emoji: string; description: string; category: string }> = {
  early_adopter: { name: "Early Adopter", emoji: "\uD83C\uDF1F", description: "Joined AWARTS in the first month", category: "special" },
  top_contributor: { name: "Top Contributor", emoji: "\uD83C\uDFC6", description: "Reached top 10 on the leaderboard", category: "achievement" },
  claude_specialist: { name: "Claude Specialist", emoji: "\uD83E\uDDE1", description: "80%+ usage on Claude", category: "provider" },
  codex_specialist: { name: "Codex Specialist", emoji: "\uD83D\uDC9A", description: "80%+ usage on Codex", category: "provider" },
  gemini_specialist: { name: "Gemini Specialist", emoji: "\uD83D\uDC99", description: "80%+ usage on Gemini", category: "provider" },
  antigravity_specialist: { name: "Antigravity Specialist", emoji: "\uD83D\uDC9C", description: "80%+ usage on Antigravity", category: "provider" },
  cursor_specialist: { name: "Cursor Specialist", emoji: "\u26A1", description: "80%+ usage on Cursor", category: "provider" },
  social_butterfly: { name: "Social Butterfly", emoji: "\uD83E\uDD8B", description: "Follow 20+ users", category: "social" },
  popular: { name: "Popular", emoji: "\u2B50", description: "Gained 50+ followers", category: "social" },
  commentator: { name: "Commentator", emoji: "\uD83D\uDCAC", description: "Left 50+ comments", category: "social" },
  marathon_coder: { name: "Marathon Coder", emoji: "\uD83C\uDFC3", description: "365-day streak", category: "achievement" },
  whale_plus: { name: "Mega Whale", emoji: "\uD83D\uDC33", description: "Spent $5,000+ total", category: "achievement" },
  open_source: { name: "Open Source", emoji: "\uD83D\uDD13", description: "Linked a GitHub account", category: "special" },
  web3_native: { name: "Web3 Native", emoji: "\u26D3\uFE0F", description: "Connected a wallet", category: "special" },
};

// Get all badges for a user
export const getUserBadges = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return [];

    const badges = await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return badges.map((b) => ({
      badge: b.badge,
      awardedAt: b.awardedAt,
      ...(BADGE_DEFS[b.badge] ?? { name: b.badge, emoji: "\uD83C\uDFC5", description: "", category: "other" }),
    }));
  },
});

// Check and award badges for a user (called after profile updates, usage syncs, etc.)
export const checkBadges = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return;

    const awarded: string[] = [];

    // Fetch all existing badges once (avoid repeated queries)
    const existingBadges = await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const ownedBadges = new Set(existingBadges.map((b) => b.badge));

    const awardBadge = async (badge: string) => {
      if (ownedBadges.has(badge)) return;
      await ctx.db.insert("user_badges", {
        userId: me._id,
        badge,
        awardedAt: Date.now(),
      });
      ownedBadges.add(badge);
      awarded.push(badge);
    };

    // Early adopter: account created within first 30 days of launch (Jan 2026)
    const launchDate = new Date("2026-01-01").getTime();
    const thirtyDaysAfter = launchDate + 30 * 24 * 60 * 60 * 1000;
    if (me._creationTime <= thirtyDaysAfter) {
      await awardBadge("early_adopter");
    }

    // Open Source: linked GitHub
    if (me.githubUsername) {
      await awardBadge("open_source");
    }

    // Web3 Native: connected wallet
    if ((me as any).walletAddress) {
      await awardBadge("web3_native");
    }

    // Provider specialist badges
    const usage = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    if (usage.length > 0) {
      const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);
      const providerCosts: Record<string, number> = {};
      for (const u of usage) {
        providerCosts[u.provider] = (providerCosts[u.provider] ?? 0) + u.costUsd;
      }

      // Check specialist badges (80%+ on one provider)
      for (const [provider, cost] of Object.entries(providerCosts)) {
        if (totalCost > 0 && cost / totalCost >= 0.8) {
          await awardBadge(`${provider}_specialist`);
        }
      }

      // Mega Whale: $5000+
      if (totalCost >= 5000) {
        await awardBadge("whale_plus");
      }

      // Marathon Coder: 365+ unique dates
      const uniqueDates = new Set(usage.map((u) => u.date));
      if (uniqueDates.size >= 365) {
        await awardBadge("marathon_coder");
      }
    }

    // Social badges
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", me._id))
      .collect();
    if (followers.length >= 50) {
      await awardBadge("popular");
    }

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", me._id))
      .collect();
    if (following.length >= 20) {
      await awardBadge("social_butterfly");
    }

    // Commentator: check comment count (using by_user index)
    const myComments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .take(50);
    if (myComments.length >= 50) {
      await awardBadge("commentator");
    }

    return { awarded };
  },
});

// Get badge definitions (for UI display)
export const getBadgeDefs = query({
  args: {},
  handler: async () => {
    return Object.entries(BADGE_DEFS).map(([id, def]) => ({ id, ...def }));
  },
});
