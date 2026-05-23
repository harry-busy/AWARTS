import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    externalLink: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    timezone: v.string(),
    isPublic: v.boolean(),
    email: v.optional(v.string()),
    defaultAiProvider: v.string(),
    emailNotificationsEnabled: v.boolean(),
    referralSource: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletChainId: v.optional(v.number()),
    notifyKudos: v.optional(v.boolean()),
    notifyComments: v.optional(v.boolean()),
    notifyFollows: v.optional(v.boolean()),
    notifyMentions: v.optional(v.boolean()),
    webhookUrl: v.optional(v.string()),
    lastDigestSentAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"])
    .index("by_email", ["email"])
    .index("by_wallet", ["walletAddress"]),

  daily_usage: defineTable({
    userId: v.id("users"),
    date: v.string(),
    provider: v.string(),
    costUsd: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cacheCreationTokens: v.number(),
    cacheReadTokens: v.number(),
    models: v.array(v.string()),
    source: v.string(),
    dataHash: v.optional(v.string()),
    rawData: v.optional(v.string()),
    costSource: v.optional(v.string()),
  })
    .index("by_user_date_provider_source", ["userId", "date", "provider", "source"])
    .index("by_user", ["userId"])
    .index("by_date", ["date"]),

  posts: defineTable({
    userId: v.id("users"),
    usageDate: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    images: v.array(v.string()),
    providers: v.array(v.string()),
    isPublished: v.boolean(),
    captionGeneratedBy: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "usageDate"])
    .index("by_user", ["userId"]),

  post_daily_usage: defineTable({
    postId: v.id("posts"),
    dailyUsageId: v.id("daily_usage"),
  })
    .index("by_post", ["postId"])
    .index("by_usage", ["dailyUsageId"]),

  comments: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    content: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  kudos: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    senderId: v.optional(v.id("users")),
    type: v.string(),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    isRead: v.boolean(),
  }).index("by_recipient", ["recipientId"]),

  cli_auth_codes: defineTable({
    code: v.string(),
    deviceToken: v.string(),
    userId: v.optional(v.id("users")),
    status: v.string(),
    jwtToken: v.optional(v.string()),
    expiresAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    tokenExpiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_device_token", ["deviceToken"])
    .index("by_jwt", ["jwtToken"])
    .index("by_user", ["userId"]),

  user_achievements: defineTable({
    userId: v.id("users"),
    slug: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  countries_to_regions: defineTable({
    countryCode: v.string(),
    countryName: v.string(),
    region: v.string(),
  }).index("by_country_code", ["countryCode"]),

  prompts: defineTable({
    userId: v.id("users"),
    content: v.string(),
    isAnonymous: v.boolean(),
    status: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  prompt_votes: defineTable({
    userId: v.id("users"),
    promptId: v.id("prompts"),
  })
    .index("by_prompt", ["promptId"])
    .index("by_user_prompt", ["userId", "promptId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    participantKey: v.optional(v.string()), // "userId1_userId2" sorted for O(1) pair lookup
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
  })
    .index("by_lastMessage", ["lastMessageAt"])
    .index("by_participantKey", ["participantKey"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.string(), // "post" | "user"
    targetPostId: v.optional(v.id("posts")),
    targetUserId: v.optional(v.id("users")),
    reason: v.string(),
    details: v.optional(v.string()),
    status: v.string(), // "pending" | "reviewed" | "dismissed"
  })
    .index("by_reporter", ["reporterId"])
    .index("by_status", ["status"]),

  reactions: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    type: v.string(), // "fire" | "mind_blown" | "rocket" | "heart" | "clap"
  })
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  user_badges: defineTable({
    userId: v.id("users"),
    badge: v.string(), // "early_adopter" | "top_contributor" | "claude_specialist" etc.
    awardedAt: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_unread", ["conversationId", "isRead"]),

  rate_limits: defineTable({
    key: v.string(),
    timestamp: v.number(),
  })
    .index("by_key", ["key", "timestamp"]),

  api_keys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    scopes: v.array(v.string()),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"]),

  mcp_usage_logs: defineTable({
    userId: v.id("users"),
    apiKeyId: v.optional(v.id("api_keys")),
    toolName: v.string(),
    success: v.boolean(),
    durationMs: v.optional(v.number()),
    tokensEstimate: v.optional(v.number()),
    metadata: v.optional(v.string()),
    source: v.optional(v.string()),
  })
    .index("by_user_time", ["userId"]),

  token_rich_companies: defineTable({
    name: v.string(),
    url: v.string(),
    quote: v.string(),
    sourceLabel: v.string(),
    sourceUrl: v.string(),
    logoEmoji: v.optional(v.string()),
    order: v.optional(v.number()),
    addedBy: v.optional(v.id("users")),
  })
    .index("by_order", ["order"]),
});
