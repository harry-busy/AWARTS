#!/usr/bin/env node
/**
 * AWARTS MCP Server — connect any MCP-compatible client (Cursor, Claude Desktop, etc.)
 *
 * Env:
 *   AWARTS_API_KEY   — API key from https://awarts.club/settings
 *   AWARTS_API_URL   — optional Convex HTTP base (default: production)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiGet, apiPost, logMcpTool } from "./client.js";

const server = new McpServer({
  name: "awarts",
  version: "0.1.0",
});

async function withLogging<T>(
  toolName: string,
  fn: () => Promise<T>,
  tokensEstimate = 0,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await logMcpTool(toolName, true, Date.now() - start, tokensEstimate);
    return result;
  } catch (err) {
    await logMcpTool(toolName, false, Date.now() - start, tokensEstimate);
    throw err;
  }
}

server.tool(
  "awarts_get_my_stats",
  "Get your authenticated AWARTS profile and aggregate usage stats",
  {},
  async () => {
    return withLogging("awarts_get_my_stats", async () => {
      const data = await apiGet<unknown>("/api/v1/me");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    });
  },
);

server.tool(
  "awarts_get_user",
  "Get a public AWARTS user profile and stats by username",
  { username: z.string().min(1).max(30) },
  async ({ username }) => {
    return withLogging("awarts_get_user", async () => {
      const data = await apiGet<unknown>(`/api/v1/users/${encodeURIComponent(username)}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    });
  },
);

server.tool(
  "awarts_get_user_usage",
  "Get daily usage entries for a user (public profiles or your own)",
  {
    username: z.string().min(1).max(30),
    from: z.string().optional(),
    to: z.string().optional(),
    provider: z
      .enum(["claude", "codex", "gemini", "antigravity", "cursor"])
      .optional(),
  },
  async ({ username, from, to, provider }) => {
    return withLogging("awarts_get_user_usage", async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (provider) params.set("provider", provider);
      const qs = params.toString();
      const path = `/api/v1/users/${encodeURIComponent(username)}/usage${qs ? `?${qs}` : ""}`;
      const data = await apiGet<unknown>(path);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    });
  },
);

server.tool(
  "awarts_get_leaderboard",
  "Get the AWARTS spend leaderboard",
  {
    period: z.enum(["daily", "weekly", "monthly", "all_time"]).optional(),
    provider: z
      .enum(["claude", "codex", "gemini", "antigravity", "cursor"])
      .optional(),
    limit: z.number().min(1).max(100).optional(),
  },
  async ({ period, provider, limit }) => {
    return withLogging("awarts_get_leaderboard", async () => {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (provider) params.set("provider", provider);
      if (limit) params.set("limit", String(limit));
      const qs = params.toString();
      const data = await apiGet<unknown>(`/api/v1/leaderboard${qs ? `?${qs}` : ""}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    });
  },
);

server.tool(
  "awarts_get_open_stats",
  "Get global aggregate AWARTS statistics (no auth required for read)",
  {},
  async () => {
    return withLogging("awarts_get_open_stats", async () => {
      const res = await fetch(`${process.env.AWARTS_API_URL?.replace(/\/+$/, "") ?? "https://honorable-bee-242.convex.site"}/api/v1/open-stats`);
      const json = (await res.json()) as { data: unknown };
      return {
        content: [{ type: "text", text: JSON.stringify(json.data, null, 2) }],
      };
    });
  },
);

const usageEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  provider: z.enum(["claude", "codex", "gemini", "antigravity", "cursor"]),
  cost_usd: z.number().min(0),
  input_tokens: z.number().min(0),
  output_tokens: z.number().min(0),
  models: z.array(z.string()).default([]),
  cache_creation_tokens: z.number().optional(),
  cache_read_tokens: z.number().optional(),
  raw_data: z.string().optional(),
  cost_source: z.string().optional(),
});

server.tool(
  "awarts_submit_usage",
  "Submit usage entries to your AWARTS account",
  {
    entries: z.array(usageEntrySchema).min(1).max(100),
    note: z.string().max(500).optional(),
  },
  async ({ entries, note }) => {
    return withLogging(
      "awarts_submit_usage",
      async () => {
        const data = await apiPost<unknown>("/api/v1/usage", {
          entries,
          source: "mcp",
          note,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      },
      entries.reduce((s, e) => s + e.input_tokens + e.output_tokens, 0),
    );
  },
);

server.tool(
  "awarts_get_mcp_logs",
  "Get recent MCP tool call logs and token estimates for your account",
  { limit: z.number().min(1).max(200).optional() },
  async ({ limit }) => {
    return withLogging("awarts_get_mcp_logs", async () => {
      const qs = limit ? `?limit=${limit}` : "";
      const data = await apiGet<unknown>(`/api/v1/mcp/logs${qs}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AWARTS MCP server running on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
