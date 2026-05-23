import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
// removed unused import

// Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "mod", "moderator",
  "support", "help", "awarts", "api", "www", "mail", "app",
  "settings", "login", "signup", "feed", "search", "leaderboard",
  "notifications", "onboarding", "docs", "privacy", "terms",
  "post", "profile", "cli", "null", "undefined",
]);

// Username validation
function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 30) return false;
  if (!/^[a-z0-9_]+$/.test(username)) return false;
  if (RESERVED_USERNAMES.has(username)) return false;
  if (username.startsWith("_") || username.endsWith("_")) return false;
  if (username.includes("__")) return false;
  return true;
}

// Sanitize URL to prevent javascript: protocol injection
function sanitizeUrl(url: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  // Only allow http/https URLs
  if (!/^https?:\/\//i.test(trimmed)) {
    // Prepend https:// if no protocol
    if (trimmed.includes(".") && !trimmed.includes("://")) {
      return `https://${trimmed}`;
    }
    return undefined;
  }
  return trimmed;
}

// Helper: get internal user from Clerk identity
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return user;
}

// Helper: require authenticated user (throws if not found)
async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

// Called on first login — creates a user profile from Clerk identity
export const getOrCreateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) return existing._id;

    let username =
      identity.nickname ??
      identity.email?.split("@")[0]?.replace(/[^a-z0-9_]/gi, "").toLowerCase() ??
      `user_${Date.now()}`;

    // Ensure username meets requirements
    username = username.slice(0, 30);
    if (username.length < 3) {
      username = `user_${Date.now().toString(36)}`;
    }

    // Check for username collision
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    const finalUsername = taken ? `${username.slice(0, 20)}_${Date.now().toString(36)}` : username;

    // Clerk sets nickname to the GitHub username when signing in via GitHub OAuth
    const githubUsername = identity.nickname ?? undefined;

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      username: finalUsername,
      displayName: (identity.name ?? undefined)?.slice(0, 50),
      avatarUrl: identity.pictureUrl ?? undefined,
      email: identity.email ?? undefined,
      githubUsername,
      timezone: "UTC",
      isPublic: true,
      defaultAiProvider: "claude",
      emailNotificationsEnabled: true,
    });
    return userId;
  },
});

// GET /users/me
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// PATCH /users/me
export const updateMe = mutation({
  args: {
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    externalLink: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    timezone: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    defaultAiProvider: v.optional(v.string()),
    emailNotificationsEnabled: v.optional(v.boolean()),
    referralSource: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletChainId: v.optional(v.number()),
    notifyKudos: v.optional(v.boolean()),
    notifyComments: v.optional(v.boolean()),
    notifyFollows: v.optional(v.boolean()),
    notifyMentions: v.optional(v.boolean()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate username change
    if (args.username !== undefined && args.username !== user.username) {
      if (!isValidUsername(args.username)) {
        throw new Error("Invalid username. Must be 3-30 characters, lowercase letters, numbers, and underscores only.");
      }
      // Check uniqueness — Convex mutations are transactional so this check-then-act is safe
      const taken = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .unique();
      if (taken) throw new Error("Username is already taken");
    }

    // Validate and sanitize fields
    const updates: Record<string, any> = {};

    if (args.username !== undefined) updates.username = args.username.trim();
    if (args.displayName !== undefined) updates.displayName = args.displayName.trim().slice(0, 50);
    if (args.bio !== undefined) updates.bio = args.bio.trim().slice(0, 160);
    if (args.avatarUrl !== undefined) {
      // Only allow HTTPS URLs for avatars (Convex storage URLs or legitimate CDNs)
      if (args.avatarUrl && /^https:\/\//i.test(args.avatarUrl)) {
        updates.avatarUrl = args.avatarUrl;
      }
    }
    if (args.githubUsername !== undefined) {
      // Sanitize GitHub username
      updates.githubUsername = args.githubUsername.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39);
    }
    if (args.externalLink !== undefined) {
      updates.externalLink = sanitizeUrl(args.externalLink);
    }
    if (args.country !== undefined) updates.country = args.country.trim().slice(0, 10);
    if (args.region !== undefined) updates.region = args.region.trim().slice(0, 50);
    if (args.timezone !== undefined) updates.timezone = args.timezone.trim().slice(0, 50);
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.defaultAiProvider !== undefined) {
      const validProviders = ["claude", "codex", "gemini", "antigravity", "cursor"];
      if (validProviders.includes(args.defaultAiProvider)) {
        updates.defaultAiProvider = args.defaultAiProvider;
      }
    }
    if (args.emailNotificationsEnabled !== undefined) updates.emailNotificationsEnabled = args.emailNotificationsEnabled;
    if (args.referralSource !== undefined) updates.referralSource = args.referralSource.trim().slice(0, 500);
    if (args.walletAddress !== undefined) {
      // Validate Ethereum address format (0x + 40 hex chars)
      if (args.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(args.walletAddress)) {
        updates.walletAddress = args.walletAddress.toLowerCase();
      } else if (!args.walletAddress) {
        updates.walletAddress = undefined;
      }
    }
    if (args.walletChainId !== undefined) {
      if (Number.isInteger(args.walletChainId) && args.walletChainId > 0 && args.walletChainId < 1_000_000) {
        updates.walletChainId = args.walletChainId;
      }
    }
    if (args.notifyKudos !== undefined) updates.notifyKudos = args.notifyKudos;
    if (args.notifyComments !== undefined) updates.notifyComments = args.notifyComments;
    if (args.notifyFollows !== undefined) updates.notifyFollows = args.notifyFollows;
    if (args.notifyMentions !== undefined) updates.notifyMentions = args.notifyMentions;
    if (args.webhookUrl !== undefined) {
      if (args.webhookUrl) {
        const sanitized = sanitizeUrl(args.webhookUrl);
        // Only allow known webhook platforms
        if (sanitized) {
          try {
            const parsed = new URL(sanitized);
            const allowedWebhookHosts = ["discord.com", "discordapp.com", "hooks.slack.com", "hooks.zapier.com", "maker.ifttt.com"];
            if (allowedWebhookHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
              updates.webhookUrl = sanitized;
            }
          } catch {
            // Invalid URL, skip
          }
        }
      } else {
        updates.webhookUrl = undefined;
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
    return { success: true };
  },
});

// GET /users/check-username
export const checkUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    if (!isValidUsername(username)) {
      return { available: false, reason: "Invalid username format" };
    }
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    return { available: !taken };
  },
});

// GET /users/:username — public profile with stats
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return null;

    const me = await getCurrentUser(ctx);

    // If profile is private and viewer is not the owner, return limited info
    // without loading any heavy data (usage entries, posts, follows)
    if (!user.isPublic && (!me || me._id !== user._id)) {
      const followerCount = (await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", user._id))
        .collect()).length;

      let isFollowing = false;
      if (me) {
        const followRow = await ctx.db
          .query("follows")
          .withIndex("by_pair", (q) =>
            q.eq("followerId", me._id).eq("followingId", user._id)
          )
          .unique();
        isFollowing = !!followRow;
      }

      return {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isPublic: false,
        stats: { followers: followerCount, following: 0, posts: 0 },
        achievements: [],
        isFollowing,
        isOwnProfile: false,
      };
    }

    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const achievements = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get usage stats for profile
    const usageEntries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const totalCostUsd = usageEntries.reduce((sum, e) => sum + e.costUsd, 0);
    const totalInputTokens = usageEntries.reduce((sum, e) => sum + e.inputTokens, 0);
    const totalOutputTokens = usageEntries.reduce((sum, e) => sum + e.outputTokens, 0);
    const uniqueDates = new Set(usageEntries.map((e) => e.date));
    const uniqueProviders = [...new Set(usageEntries.map((e) => e.provider))];

    // Calculate streak
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

    // Build heatmap from usage data (includes dominant provider per day)
    const heatmapCost: Record<string, number> = {};
    const heatmapProviderCost: Record<string, Record<string, number>> = {};
    for (const entry of usageEntries) {
      heatmapCost[entry.date] = (heatmapCost[entry.date] ?? 0) + entry.costUsd;
      if (!heatmapProviderCost[entry.date]) heatmapProviderCost[entry.date] = {};
      heatmapProviderCost[entry.date][entry.provider] =
        (heatmapProviderCost[entry.date][entry.provider] ?? 0) + entry.costUsd;
    }
    const heatmap: Record<string, { cost: number; provider: string | null }> = {};
    for (const [date, cost] of Object.entries(heatmapCost)) {
      const providerCosts = heatmapProviderCost[date] ?? {};
      let dominant: string | null = null;
      let maxCost = 0;
      for (const [p, c] of Object.entries(providerCosts)) {
        if (c > maxCost) { maxCost = c; dominant = p; }
      }
      heatmap[date] = { cost, provider: dominant };
    }

    // Check if current user follows this profile
    let isFollowing = false;
    if (me && me._id !== user._id) {
      const followRow = await ctx.db
        .query("follows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", me._id).eq("followingId", user._id)
        )
        .unique();
      isFollowing = !!followRow;
    }

    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      country: user.country,
      region: user.region,
      githubUsername: user.githubUsername,
      externalLink: user.externalLink,
      isPublic: user.isPublic,
      walletAddress: user.walletAddress,
      _creationTime: user._creationTime,
      stats: {
        followers: followers.length,
        following: following.length,
        posts: posts.filter((p) => p.isPublished).length,
        total_cost_usd: totalCostUsd,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_days: uniqueDates.size,
        current_streak: currentStreak,
        hasEstimatedCost: usageEntries.some((e) => e.costSource === "estimated"),
      },
      providers_used: uniqueProviders,
      achievements: achievements.map((a) => ({ slug: a.slug, awarded_at: String(a._creationTime) })),
      heatmap,
      isFollowing,
      isOwnProfile: me ? me._id === user._id : false,
    };
  },
});

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// DELETE /users/me — delete account and all associated data
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Delete all user data: usage, posts, comments, follows, kudos, notifications, achievements
    const usage = await ctx.db.query("daily_usage").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const u of usage) await ctx.db.delete(u._id);

    const posts = await ctx.db.query("posts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const p of posts) {
      // Delete post links
      const links = await ctx.db.query("post_daily_usage").withIndex("by_post", (q) => q.eq("postId", p._id)).collect();
      for (const l of links) await ctx.db.delete(l._id);
      // Delete comments on post
      const comments = await ctx.db.query("comments").withIndex("by_post", (q) => q.eq("postId", p._id)).collect();
      for (const c of comments) await ctx.db.delete(c._id);
      // Delete kudos on post
      const kudos = await ctx.db.query("kudos").withIndex("by_post", (q) => q.eq("postId", p._id)).collect();
      for (const k of kudos) await ctx.db.delete(k._id);
      await ctx.db.delete(p._id);
    }

    // Delete follows (both directions)
    const followsAsFollower = await ctx.db.query("follows").withIndex("by_follower", (q) => q.eq("followerId", user._id)).collect();
    for (const f of followsAsFollower) await ctx.db.delete(f._id);
    const followsAsFollowing = await ctx.db.query("follows").withIndex("by_following", (q) => q.eq("followingId", user._id)).collect();
    for (const f of followsAsFollowing) await ctx.db.delete(f._id);

    // Delete notifications
    const notifications = await ctx.db.query("notifications").withIndex("by_recipient", (q) => q.eq("recipientId", user._id)).collect();
    for (const n of notifications) await ctx.db.delete(n._id);

    // Delete achievements
    const achievements = await ctx.db.query("user_achievements").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const a of achievements) await ctx.db.delete(a._id);

    // Delete CLI auth tokens (use by_user index)
    const authCodes = await ctx.db
      .query("cli_auth_codes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const code of authCodes) await ctx.db.delete(code._id);

    // Delete reactions by this user
    const reactions = await ctx.db.query("reactions").withIndex("by_user_post", (q) => q.eq("userId", user._id)).collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    // Delete user badges
    const badges = await ctx.db.query("user_badges").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const b of badges) await ctx.db.delete(b._id);

    // Delete prompts by this user
    const prompts = await ctx.db.query("prompts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const p of prompts) {
      // Delete votes on user's prompts
      const votes = await ctx.db.query("prompt_votes").withIndex("by_prompt", (q) => q.eq("promptId", p._id)).collect();
      for (const v of votes) await ctx.db.delete(v._id);
      await ctx.db.delete(p._id);
    }

    // Delete prompt votes by this user (on other people's prompts)
    const myVotes = await ctx.db.query("prompt_votes").withIndex("by_user_prompt", (q) => q.eq("userId", user._id)).collect();
    for (const v of myVotes) await ctx.db.delete(v._id);

    // Delete reports submitted by this user
    const reports = await ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", user._id)).collect();
    for (const r of reports) await ctx.db.delete(r._id);

    // Delete messages and conversations involving this user
    const allConversations = await ctx.db.query("conversations").collect();
    const userConversations = allConversations.filter((c) => c.participantIds.includes(user._id));
    for (const conv of userConversations) {
      const msgs = await ctx.db.query("messages").withIndex("by_conversation", (q) => q.eq("conversationId", conv._id)).collect();
      for (const m of msgs) await ctx.db.delete(m._id);
      await ctx.db.delete(conv._id);
    }

    // Finally delete the user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

// GET /users/:username/followers
export const getFollowers = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return [];

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();

    const followers = await Promise.all(
      followRows.map(async (f) => {
        const u = await ctx.db.get(f.followerId);
        return u
          ? { _id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }
          : null;
      })
    );
    return followers.filter(Boolean);
  },
});

// GET /users/suggested — users the current user doesn't follow
export const getSuggested = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", me._id))
      .collect();
    const followingIds = new Set(following.map((f) => String(f.followingId)));
    followingIds.add(String(me._id));

    const allUsers = await ctx.db.query("users").take(200);
    const suggestions = allUsers
      .filter((u) => u.isPublic && !followingIds.has(String(u._id)))
      .slice(0, limit);

    return suggestions.map((u) => ({
      _id: u._id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
    }));
  },
});

// GET /users/:username/following
export const getFollowing = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return [];

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    const following = await Promise.all(
      followRows.map(async (f) => {
        const u = await ctx.db.get(f.followingId);
        return u
          ? { _id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }
          : null;
      })
    );
    return following.filter(Boolean);
  },
});
