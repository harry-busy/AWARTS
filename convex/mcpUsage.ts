import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireBearerAuth } from "./lib/apiAuth";

export const logToolCall = mutation({
  args: {
    authToken: v.string(),
    toolName: v.string(),
    success: v.boolean(),
    durationMs: v.optional(v.number()),
    tokensEstimate: v.optional(v.number()),
    metadata: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireBearerAuth(ctx, args.authToken);

    if (auth.apiKeyId) {
      await ctx.db.patch(auth.apiKeyId, { lastUsedAt: Date.now() });
    }

    const id = await ctx.db.insert("mcp_usage_logs", {
      userId: auth.user._id,
      apiKeyId: auth.apiKeyId,
      toolName: args.toolName.slice(0, 64),
      success: args.success,
      durationMs: args.durationMs,
      tokensEstimate: args.tokensEstimate,
      metadata: args.metadata?.slice(0, 2000),
      source: args.source ?? "mcp",
    });

    return { id };
  },
});

export const getMyLogs = query({
  args: {
    authToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { authToken, limit }) => {
    const auth = await requireBearerAuth(ctx, authToken);
    const safeLimit = Math.min(Math.max(1, limit ?? 50), 200);

    const logs = await ctx.db
      .query("mcp_usage_logs")
      .withIndex("by_user_time", (q) => q.eq("userId", auth.user._id))
      .order("desc")
      .take(safeLimit);

    const totalCalls = logs.length;
    const successCalls = logs.filter((l) => l.success).length;
    const totalTokens = logs.reduce((s, l) => s + (l.tokensEstimate ?? 0), 0);

    const byTool: Record<string, number> = {};
    for (const l of logs) {
      byTool[l.toolName] = (byTool[l.toolName] ?? 0) + 1;
    }

    return {
      logs: logs.map((l) => ({
        id: l._id,
        tool_name: l.toolName,
        success: l.success,
        duration_ms: l.durationMs ?? null,
        tokens_estimate: l.tokensEstimate ?? null,
        source: l.source,
        created_at: l._creationTime,
      })),
      summary: {
        total_calls: totalCalls,
        success_rate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100,
        tokens_estimate_total: totalTokens,
        by_tool: byTool,
      },
    };
  },
});
