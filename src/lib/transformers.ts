/**
 * Transform Convex API responses to frontend types.
 * Handles both camelCase (Convex) and snake_case (legacy) field names.
 */
import type { Post, User, Comment, Notification, LeaderboardEntry, Provider, HeatmapDay, Achievement } from './types';

// ─── Feed Post Transformer ────────────────────────────────────────────
export function transformFeedPost(raw: any): Post {
  // Support both Convex format (usage array of objects) and legacy format
  const usage = raw.usage ?? raw.daily_usage ?? [];
  const totalCost = usage.reduce((sum: number, u: any) => sum + Number(u.costUsd ?? u.cost_usd ?? 0), 0);
  const totalInput = usage.reduce((sum: number, u: any) => sum + Number(u.inputTokens ?? u.input_tokens ?? 0), 0);
  const totalOutput = usage.reduce((sum: number, u: any) => sum + Number(u.outputTokens ?? u.output_tokens ?? 0), 0);

  const providerBreakdown = usage.map((u: any) => ({
    provider: u.provider as Provider,
    cost: Number(u.costUsd ?? u.cost_usd ?? 0),
    inputTokens: Number(u.inputTokens ?? u.input_tokens ?? 0),
    outputTokens: Number(u.outputTokens ?? u.output_tokens ?? 0),
    sessions: 1,
  }));

  // Check if any usage entry has estimated cost
  const hasEstimated = usage.some((u: any) => (u.costSource ?? u.cost_source) === 'estimated');

  // Handle author object from Convex (nested under "author") or legacy "user"
  const authorRaw = raw.author ?? raw.user;

  return {
    id: raw._id ?? raw.id,
    user: transformUser(authorRaw),
    title: raw.title ?? '',
    description: raw.description ?? '',
    providers: (raw.providers ?? []) as Provider[],
    providerBreakdown,
    stats: {
      cost: totalCost,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      sessions: usage.length,
      isEstimated: hasEstimated,
    },
    images: raw.images ?? [],
    kudosCount: raw.kudosCount ?? raw.kudos_count ?? 0,
    commentCount: raw.commentCount ?? raw.comment_count ?? raw.comments_count ?? 0,
    hasKudosed: raw.hasGivenKudos ?? raw.user_has_kudosed ?? false,
    createdAt: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : raw.created_at ?? new Date().toISOString(),
  };
}

// ─── User Transformer ─────────────────────────────────────────────────
export function transformUser(raw: any): User {
  if (!raw) {
    return {
      id: '',
      username: 'unknown',
      displayName: 'Unknown',
      avatar: '',
      bio: '',
      location: '',
      country: '',
      countryCode: '',
      joinDate: '',
      followers: 0,
      following: 0,
      isVerified: false,
      isFollowing: false,
      providers: [],
      streak: 0,
      totalSpend: 0,
      totalTokens: 0,
    };
  }

  return {
    id: raw._id ?? raw.id ?? '',
    username: raw.username ?? 'unknown',
    displayName: raw.displayName ?? raw.display_name ?? raw.username ?? '',
    avatar: raw.avatarUrl ?? raw.avatar_url ?? raw.avatar ?? '',
    bio: raw.bio ?? '',
    location: raw.country ?? raw.location ?? '',
    country: raw.country ?? '',
    countryCode: raw.country ?? '',
    joinDate: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : raw.created_at ?? raw.joinDate ?? '',
    followers: raw.stats?.followers ?? raw.followers_count ?? raw.followers ?? 0,
    following: raw.stats?.following ?? raw.following_count ?? raw.following ?? 0,
    isVerified: raw.is_verified ?? false,
    isFollowing: raw.isFollowing ?? raw.is_following ?? false,
    providers: (raw.providers_used ?? raw.providers ?? []) as Provider[],
    streak: raw.stats?.current_streak ?? raw.streak ?? 0,
    totalSpend: raw.stats?.total_cost_usd ?? raw.totalSpend ?? 0,
    totalTokens: raw.stats?.total_input_tokens
      ? raw.stats.total_input_tokens + (raw.stats.total_output_tokens ?? 0)
      : raw.totalTokens ?? 0,
  };
}

// ─── Comment Transformer ──────────────────────────────────────────────
export function transformComment(raw: any): Comment {
  // Convex format: author is nested as "author" object
  const authorRaw = raw.author ?? raw.user;

  return {
    id: raw._id ?? raw.id,
    user: transformUser(authorRaw),
    content: raw.content,
    createdAt: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : raw.created_at ?? new Date().toISOString(),
  };
}

// ─── Notification Transformer ─────────────────────────────────────────
export function transformNotification(raw: any): Notification {
  // Convex format: sender is the actor
  const actorRaw = raw.sender ?? raw.actor;

  return {
    id: raw._id ?? raw.id,
    type: raw.type,
    actor: transformUser(actorRaw),
    post: raw.post ? transformFeedPost(raw.post) : undefined,
    read: raw.isRead ?? raw.is_read ?? false,
    createdAt: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : raw.created_at ?? new Date().toISOString(),
  };
}

// ─── Leaderboard Transformer ──────────────────────────────────────────
export function transformLeaderboardEntry(raw: any, rank: number): LeaderboardEntry {
  // Convex format: user is nested, totals are at top level
  const userRaw = raw.user ?? raw;

  return {
    rank: raw.rank ?? rank,
    user: transformUser(userRaw),
    spend: Number(raw.costUsd ?? raw.total_cost ?? 0),
    tokens: Number(raw.totalTokens ?? raw.total_tokens ?? 0),
    streak: Number(raw.activeDays ?? raw.current_streak ?? 0),
    providers: (userRaw.providers ?? []) as Provider[],
  };
}

// ─── Heatmap Transformer ──────────────────────────────────────────────
export function transformHeatmap(heatmapData: Record<string, any>): HeatmapDay[] {
  // Support both formats:
  // New: { date: { cost: number, provider: string | null } }
  // Legacy: { date: number }
  const entries = Object.entries(heatmapData).map(([date, val]) => {
    const isNew = typeof val === 'object' && val !== null && 'cost' in val;
    const spend = isNew ? val.cost : Number(val);
    const provider = isNew ? (val.provider as Provider | null) : null;
    return { date, spend, provider };
  });

  const maxSpend = Math.max(...entries.map((e) => e.spend), 1);
  return entries.map(({ date, spend, provider }) => {
    const ratio = spend / maxSpend;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (ratio > 0.75) intensity = 4;
    else if (ratio > 0.5) intensity = 3;
    else if (ratio > 0.25) intensity = 2;
    else if (ratio > 0) intensity = 1;

    return {
      date,
      spend,
      dominantProvider: spend > 0 ? provider : null,
      intensity,
    };
  });
}

// ─── Achievement Transformer ──────────────────────────────────────────
const ACHIEVEMENT_META: Record<string, { name: string; emoji: string; description: string }> = {
  'first-submit': { name: 'First Sync', emoji: '🚀', description: 'Push your first session' },
  'week-warrior': { name: 'Week Warrior', emoji: '⚔️', description: '7-day streak' },
  'month-master': { name: 'Power User', emoji: '💪', description: '30-day streak' },
  'hundred-days': { name: '100 Days', emoji: '💯', description: '100-day streak' },
  'big-spender-10': { name: 'Spender $10', emoji: '💵', description: 'Spend $10 total' },
  'big-spender-100': { name: 'Big Spender', emoji: '💸', description: 'Spend $100 total' },
  'big-spender-1000': { name: 'Whale', emoji: '🐳', description: 'Spend $1000 total' },
  'multi-provider': { name: 'Polyglot Coder', emoji: '🌐', description: 'Use 2+ providers' },
  'all-providers': { name: 'Full Stack AI', emoji: '🤖', description: 'Use all 5 providers' },
};

export function transformAchievement(raw: any): Achievement {
  const slug = typeof raw === 'string' ? raw : raw.slug;
  const meta = ACHIEVEMENT_META[slug] ?? { name: slug, emoji: '🏆', description: '' };
  return {
    id: slug,
    name: meta.name,
    emoji: meta.emoji,
    description: meta.description,
    earned: true,
    earnedAt: raw.awarded_at ?? '',
  };
}
