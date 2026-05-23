import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

interface CursorMeta {
  agents?: Record<string, number>;
  subscription?: string;
  plan_amount_usd?: number;
  fast_requests?: number;
  slow_requests?: number;
}

function parseCursorMeta(rawData?: string): CursorMeta | null {
  if (!rawData) return null;
  try {
    const parsed = JSON.parse(rawData) as CursorMeta;
    return parsed;
  } catch {
    return null;
  }
}

/** Cursor-specific breakdown: models, agents, subscription hints. */
export const getCursorDetails = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return null;

    const entries = await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const cursorEntries = entries.filter((e) => e.provider === "cursor");
    if (cursorEntries.length === 0) return null;

    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];
    const weekAgoStr = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const todayEntries = cursorEntries.filter((e) => e.date === todayStr);
    const weekEntries = cursorEntries.filter((e) => e.date >= weekAgoStr);

    const sum = (list: typeof cursorEntries) => ({
      tokens: list.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0),
      cost: list.reduce((s, e) => s + e.costUsd, 0),
      input: list.reduce((s, e) => s + e.inputTokens, 0),
      output: list.reduce((s, e) => s + e.outputTokens, 0),
    });

    const modelTotals: Record<string, { tokens: number; cost: number; days: number }> = {};
    const modelDays: Record<string, Set<string>> = {};
    const agentTotals: Record<string, number> = {};
    let latestSubscription: string | null = null;
    let planAmountUsd: number | null = null;

    for (const e of cursorEntries) {
      for (const model of e.models ?? []) {
        if (!modelTotals[model]) {
          modelTotals[model] = { tokens: 0, cost: 0, days: 0 };
          modelDays[model] = new Set();
        }
        modelTotals[model].tokens += e.inputTokens + e.outputTokens;
        modelTotals[model].cost += e.costUsd;
        modelDays[model].add(e.date);
      }
      const meta = parseCursorMeta(e.rawData);
      if (meta?.agents) {
        for (const [agent, count] of Object.entries(meta.agents)) {
          agentTotals[agent] = (agentTotals[agent] ?? 0) + count;
        }
      }
      if (meta?.subscription) latestSubscription = meta.subscription;
      if (meta?.plan_amount_usd != null) planAmountUsd = meta.plan_amount_usd;
    }

    for (const m of Object.keys(modelTotals)) {
      modelTotals[m].days = modelDays[m]?.size ?? 0;
    }

    const models = Object.entries(modelTotals)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.tokens - a.tokens);

    const agents = Object.entries(agentTotals)
      .map(([name, runs]) => ({ name, runs }))
      .sort((a, b) => b.runs - a.runs);

    const dailyTrend: { date: string; tokens: number; cost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const day = cursorEntries.filter((e) => e.date === d);
      dailyTrend.push({
        date: d,
        tokens: day.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0),
        cost: day.reduce((s, e) => s + e.costUsd, 0),
      });
    }

    return {
      today: sum(todayEntries),
      week: sum(weekEntries),
      allTime: sum(cursorEntries),
      models,
      agents,
      subscription: latestSubscription,
      plan_amount_usd: planAmountUsd,
      dailyTrend,
      activeDays: new Set(cursorEntries.map((e) => e.date)).size,
    };
  },
});
