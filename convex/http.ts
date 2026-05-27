import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { API_VERSION } from "./lib/apiConstants";

const http = httpRouter();

// Allowed origins for CORS — production only
const ALLOWED_ORIGINS = [
  "https://awarts.com",
  "https://www.awarts.com",
  "https://awarts.club",
  "chrome-extension://ocfdlilejljfjcnpjkadccegnaloeolk",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("Origin") ?? "";
  const isExtension = origin.startsWith("chrome-extension://");
  const allowedOrigin = (ALLOWED_ORIGINS.includes(origin) || isExtension) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  };
}

// Preflight OPTIONS handler for CORS
const preflightHandler = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
});

// CSRF protection: reject browser requests from unknown origins
function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // CLI requests don't send Origin
  // Allow all Chrome Extensions (auth is handled via API Key/Token)
  if (origin.startsWith("chrome-extension://")) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function apiHeaders(request?: Request, extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...getCorsHeaders(request),
    "X-API-Version": API_VERSION,
    ...extra,
  };
}

function jsonResponse(data: unknown, request?: Request, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: apiHeaders(request) });
}

function errorResponse(message: string, request?: Request, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: apiHeaders(request) });
}

function getBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  return token.length >= 10 ? token : undefined;
}

function rateLimitIdentity(request: Request): string {
  const token = getBearerToken(request);
  if (token?.startsWith("aw_live_")) return `key:${token.slice(0, 24)}`;
  return `ip:${getClientIp(request)}`;
}

async function withApiRateLimit(
  ctx: ActionCtx,
  key: string,
  maxRequests: number,
  request?: Request,
): Promise<Response | null> {
  const identity = request ? rateLimitIdentity(request) : "unknown";
  const rateCheck = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
    key: `${key}:${identity}`,
    maxRequests,
    windowMs: 60_000,
  });
  if (!rateCheck.allowed) {
    const headers = {
      ...getCorsHeaders(request),
      "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
    };
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
  }
  return null;
}

type ScopeAuth = {
  ok: true;
  userId: import("./_generated/dataModel").Id<"users">;
  apiKeyId?: import("./_generated/dataModel").Id<"api_keys">;
};

async function requireHttpScope(
  ctx: ActionCtx,
  request: Request,
  token: string | undefined,
  scope: "read" | "write" | "mcp",
): Promise<{ auth?: ScopeAuth; error?: Response }> {
  if (!token) {
    return { error: errorResponse("Missing Authorization header", request, 401) };
  }
  const check = await ctx.runQuery(internal.httpAuth.verifyTokenScope, { token, scope });
  if (!check.ok) {
    return {
      error: errorResponse(check.error ?? "Forbidden", request, check.status ?? 403),
    };
  }
  return {
    auth: {
      ok: true,
      userId: check.userId,
      apiKeyId: check.apiKeyId,
    },
  };
}

async function auditRequest(
  ctx: ActionCtx,
  request: Request,
  status: number,
  startedAt: number,
  auth?: ScopeAuth,
  errMsg?: string,
) {
  try {
    await ctx.runMutation(internal.httpAuth.logApiRequest, {
      method: request.method,
      path: new URL(request.url).pathname,
      status,
      userId: auth?.userId,
      apiKeyId: auth?.apiKeyId,
      ip: getClientIp(request),
      durationMs: Date.now() - startedAt,
      error: errMsg,
    });
  } catch {
    // Non-fatal
  }
}

// ─── CLI Auth: Init (rate-limited) ──────────────────────────────────
http.route({
  path: "/api/auth/cli/init",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateOrigin(request)) {
      return errorResponse("Forbidden", request, 403);
    }

    // Rate limit: 10 requests per minute per IP
    const ip = getClientIp(request);
    const rateCheck = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: `cli_init:${ip}`,
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!rateCheck.allowed) {
      const headers = {
        ...getCorsHeaders(request),
        "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
      };
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    }

    try {
      const result = await ctx.runMutation(api.cliAuth.initCLIAuth);
      return jsonResponse(result, request);
    } catch {
      return errorResponse("Auth initialization failed", request, 500);
    }
  }),
});

// ─── CLI Auth: Poll ─────────────────────────────────────────────────
http.route({
  path: "/api/auth/cli/poll",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateOrigin(request)) {
      return errorResponse("Forbidden", request, 403);
    }

    // Rate limit: 30 requests per minute per IP
    const pollIp = getClientIp(request);
    const pollRateCheck = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: `cli_poll:${pollIp}`,
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!pollRateCheck.allowed) {
      const headers = {
        ...getCorsHeaders(request),
        "Retry-After": String(Math.ceil(pollRateCheck.retryAfterMs / 1000)),
      };
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", request);
    }

    const deviceToken = body.device_token;
    if (!deviceToken || typeof deviceToken !== "string" || deviceToken.length > 100) {
      return errorResponse("Invalid device_token", request);
    }

    try {
      const result = await ctx.runQuery(api.cliAuth.pollCLIAuth, { deviceToken });
      return jsonResponse(result, request);
    } catch {
      return errorResponse("Auth polling failed", request, 500);
    }
  }),
});

// ─── Usage Submit (requires CLI auth token) ─────────────────────────
http.route({
  path: "/api/usage/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateOrigin(request)) {
      return errorResponse("Forbidden", request, 403);
    }

    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(request);
    const rateCheck = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: `usage_submit:${ip}`,
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateCheck.allowed) {
      const headers = {
        ...getCorsHeaders(request),
        "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
      };
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    }

    // Validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Missing or invalid Authorization header", request, 401);
    }
    const token = authHeader.slice(7);
    if (!token || token.length < 10) {
      return errorResponse("Invalid token", request, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", request);
    }

    // Validate entries array exists and is reasonable size
    if (!Array.isArray(body.entries)) {
      return errorResponse("entries must be an array", request);
    }
    if (body.entries.length > 500) {
      return errorResponse("Too many entries (max 500)", request);
    }

    try {
      // Validate source parameter
      const validSources = ["cli", "web", "api"];
      const source = validSources.includes(body.source) ? body.source : "cli";

      const result = await ctx.runMutation(api.usage.submitUsage, {
        entries: body.entries,
        source,
        hash: body.hash,
        authToken: token,
        note: typeof body.note === "string" ? body.note.slice(0, 2000) : undefined,
      });
      return jsonResponse(result, request);
    } catch (err: any) {
      const isAuthError = err.message?.includes("Not authenticated") || err.message?.includes("Token expired");
      const status = isAuthError ? 401 : 400;
      const message = isAuthError ? "Authentication failed" : "Usage submission failed";
      return errorResponse(message, request, status);
    }
  }),
});

// ─── Usage Cleanup (delete old/wrong entries) ────────────────────────
http.route({
  path: "/api/usage/cleanup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateOrigin(request)) {
      return errorResponse("Forbidden", request, 403);
    }

    // Rate limit: 10 requests per minute per IP
    const cleanupIp = getClientIp(request);
    const cleanupRateCheck = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: `usage_cleanup:${cleanupIp}`,
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!cleanupRateCheck.allowed) {
      const headers = {
        ...getCorsHeaders(request),
        "Retry-After": String(Math.ceil(cleanupRateCheck.retryAfterMs / 1000)),
      };
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Missing or invalid Authorization header", request, 401);
    }
    const token = authHeader.slice(7);
    if (!token || token.length < 10) {
      return errorResponse("Invalid token", request, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", request);
    }

    try {
      const result = await ctx.runMutation(api.usage.cleanupUsage, {
        beforeDate: body.before_date,
        dates: body.dates,
        authToken: token,
      });
      return jsonResponse(result, request);
    } catch (err: any) {
      const isAuthError = err.message?.includes("Not authenticated") || err.message?.includes("Token expired");
      return errorResponse(
        isAuthError ? "Authentication failed" : "Cleanup failed",
        request,
        isAuthError ? 401 : 400,
      );
    }
  }),
});

// ─── Embeddable SVG Scorecard ────────────────────────────────────────

/** Escape XML special characters to prevent SVG injection */
function escapeSvg(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

http.route({
  path: "/api/embed",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const rawUsername = url.searchParams.get("username");
    const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
    const compact = url.searchParams.get("compact") === "1";

    if (!rawUsername) {
      return new Response("Missing username param", { status: 400 });
    }

    // Validate username format to prevent injection (alphanumeric + underscore only)
    if (!/^[a-z0-9_]{1,30}$/.test(rawUsername)) {
      return new Response("Invalid username", { status: 400 });
    }

    const username = escapeSvg(rawUsername);

    // Fetch user stats
    const stats = await ctx.runQuery(api.users.getByUsername, { username: rawUsername });

    const bg = theme === "dark" ? "#0d1117" : "#ffffff";
    const fg = theme === "dark" ? "#e6edf3" : "#1f2328";
    const muted = theme === "dark" ? "#7d8590" : "#656d76";
    const accent = "#E87A35";
    const border = theme === "dark" ? "#30363d" : "#d0d7de";

    const totalCost = stats?.stats?.total_cost_usd ?? 0;
    const streak = stats?.stats?.current_streak ?? 0;
    const totalDays = stats?.stats?.total_days ?? 0;
    const displayName = escapeSvg(stats?.displayName || stats?.username || rawUsername);

    // Streak level
    let level = 1;
    if (totalDays >= 365) level = 8;
    else if (totalDays >= 200) level = 7;
    else if (totalDays >= 100) level = 6;
    else if (totalDays >= 60) level = 5;
    else if (totalDays >= 30) level = 4;
    else if (totalDays >= 14) level = 3;
    else if (totalDays >= 7) level = 2;

    const costStr = totalCost >= 1000 ? `$${(totalCost / 1000).toFixed(1)}k` : `$${totalCost.toFixed(2)}`;

    let svg: string;
    if (compact) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="28" viewBox="0 0 340 28">
  <rect width="340" height="28" rx="4" fill="${bg}" stroke="${border}" stroke-width="1"/>
  <text x="8" y="18" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${accent}" font-weight="600">AWARTS</text>
  <text x="60" y="18" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${fg}">@${username}</text>
  <text x="150" y="18" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${muted}">L${level} · ${costStr} · ${streak}d streak · ${totalDays}d active</text>
</svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
  <rect width="400" height="120" rx="8" fill="${bg}" stroke="${border}" stroke-width="1"/>
  <text x="16" y="28" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="13" fill="${accent}" font-weight="700">▰ AWARTS</text>
  <text x="16" y="50" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="16" fill="${fg}" font-weight="600">@${username}</text>
  <rect x="${16 + (username.length + 1) * 9 + 8}" y="38" width="28" height="18" rx="4" fill="${accent}"/>
  <text x="${16 + (username.length + 1) * 9 + 22}" y="51" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="#fff" font-weight="700" text-anchor="middle">L${level}</text>
  <text x="16" y="80" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="20" fill="${fg}" font-weight="700">${costStr}</text>
  <text x="16" y="96" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${muted}">total spend</text>
  <text x="140" y="80" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="20" fill="${fg}" font-weight="700">${streak}d</text>
  <text x="140" y="96" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${muted}">streak</text>
  <text x="250" y="80" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="20" fill="${fg}" font-weight="700">${totalDays}</text>
  <text x="250" y="96" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${muted}">active days</text>
  <text x="340" y="80" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="20" fill="${fg}" font-weight="700">${displayName !== username ? displayName.charAt(0) : ''}L${level}</text>
  <text x="340" y="96" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${muted}">level</text>
</svg>`;
    }

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ─── Public REST API v1 ───────────────────────────────────────────────

http.route({
  path: "/api/v1/health",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return jsonResponse(
      {
        status: "ok",
        version: API_VERSION,
        timestamp: new Date().toISOString(),
      },
      request,
    );
  }),
});

http.route({
  path: "/api/v1/open-stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_open_stats", 120, request);
    if (limited) return limited;
    try {
      const stats = await ctx.runQuery(api.openStats.getOpenStats, {});
      await auditRequest(ctx, request, 200, started);
      return jsonResponse({ data: stats }, request);
    } catch {
      await auditRequest(ctx, request, 500, started, undefined, "open_stats_failed");
      return errorResponse("Failed to load open stats", request, 500);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/users/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_users", 180, request);
    if (limited) return limited;

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/v1\/users\//, "");
    const parts = path.split("/").filter(Boolean);
    const username = parts[0];
    if (!username || !/^[a-z0-9_]{1,30}$/.test(username)) {
      return errorResponse("Invalid username", request);
    }

    const token = getBearerToken(request);
    if (token) {
      const scopeCheck = await requireHttpScope(ctx, request, token, "read");
      if (scopeCheck.error) return scopeCheck.error;
    }

    try {
      if (parts[1] === "usage") {
        const data = await ctx.runQuery(api.publicApi.getPublicUserUsage, {
          username,
          from: url.searchParams.get("from") ?? undefined,
          to: url.searchParams.get("to") ?? undefined,
          provider: url.searchParams.get("provider") ?? undefined,
          authToken: token,
        });
        if (!data) {
          await auditRequest(ctx, request, 404, started);
          return errorResponse("User not found", request, 404);
        }
        if ("error" in data && data.error === "private_profile") {
          await auditRequest(ctx, request, 403, started);
          return errorResponse("Profile is private", request, 403);
        }
        await auditRequest(ctx, request, 200, started);
        return jsonResponse({ data }, request);
      }

      if (parts.length > 1) {
        return errorResponse("Not found", request, 404);
      }

      const data = await ctx.runQuery(api.publicApi.getPublicUser, {
        username,
        authToken: token,
      });
      if (!data) {
        await auditRequest(ctx, request, 404, started);
        return errorResponse("User not found", request, 404);
      }
      await auditRequest(ctx, request, 200, started);
      return jsonResponse({ data }, request);
    } catch (err: any) {
      await auditRequest(ctx, request, 500, started, undefined, err.message);
      return errorResponse("Request failed", request, 500);
    }
  }),
});

http.route({
  path: "/api/v1/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_me", 120, request);
    if (limited) return limited;
    const token = getBearerToken(request);
    const scopeCheck = await requireHttpScope(ctx, request, token, "read");
    if (scopeCheck.error) return scopeCheck.error;
    try {
      const data = await ctx.runQuery(api.publicApi.getAuthenticatedMe, { authToken: token! });
      await auditRequest(ctx, request, 200, started, scopeCheck.auth);
      return jsonResponse({ data }, request);
    } catch (err: any) {
      const status = err.message?.includes("scope") ? 403 : 401;
      await auditRequest(ctx, request, status, started, scopeCheck.auth, err.message);
      return errorResponse(
        status === 403 ? err.message : "Authentication failed",
        request,
        status,
      );
    }
  }),
});

http.route({
  path: "/api/v1/leaderboard",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_leaderboard", 120, request);
    if (limited) return limited;
    const url = new URL(request.url);
    const data = await ctx.runQuery(api.publicApi.getPublicLeaderboard, {
      period: url.searchParams.get("period") ?? "all_time",
      provider: url.searchParams.get("provider") ?? undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    });
    await auditRequest(ctx, request, 200, started);
    return jsonResponse({ data }, request);
  }),
});

http.route({
  path: "/api/v1/usage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_usage_submit", 60, request);
    if (limited) return limited;

    const token = getBearerToken(request);
    const scopeCheck = await requireHttpScope(ctx, request, token, "write");
    if (scopeCheck.error) return scopeCheck.error;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", request);
    }
    if (!Array.isArray(body.entries)) {
      return errorResponse("entries must be an array", request);
    }
    if (body.entries.length > 500) {
      return errorResponse("Too many entries (max 500)", request);
    }

    const validSources = ["cli", "web", "api", "mcp"];
    const source = validSources.includes(body.source) ? body.source : "api";

    try {
      const result = await ctx.runMutation(api.usage.submitUsage, {
        entries: body.entries,
        source,
        hash: body.hash,
        authToken: token!,
        note: typeof body.note === "string" ? body.note.slice(0, 2000) : undefined,
      });
      await auditRequest(ctx, request, 200, started, scopeCheck.auth);
      return jsonResponse({ data: result }, request);
    } catch (err: any) {
      const isAuth =
        err.message?.includes("Not authenticated") ||
        err.message?.includes("Token expired") ||
        err.message?.includes("scope");
      const status = err.message?.includes("scope") ? 403 : isAuth ? 401 : 400;
      await auditRequest(ctx, request, status, started, scopeCheck.auth, err.message);
      return errorResponse(
        isAuth || status === 403 ? err.message : "Usage submission failed",
        request,
        status,
      );
    }
  }),
});

http.route({
  path: "/api/v1/mcp/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_mcp_log", 180, request);
    if (limited) return limited;
    const token = getBearerToken(request);
    const scopeCheck = await requireHttpScope(ctx, request, token, "mcp");
    if (scopeCheck.error) return scopeCheck.error;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", request);
    }
    if (!body.tool_name || typeof body.tool_name !== "string") {
      return errorResponse("tool_name is required", request);
    }

    try {
      const result = await ctx.runMutation(api.mcpUsage.logToolCall, {
        authToken: token!,
        toolName: body.tool_name,
        success: body.success !== false,
        durationMs: typeof body.duration_ms === "number" ? body.duration_ms : undefined,
        tokensEstimate: typeof body.tokens_estimate === "number" ? body.tokens_estimate : undefined,
        metadata: typeof body.metadata === "string" ? body.metadata : undefined,
        source: body.source ?? "mcp",
      });
      await auditRequest(ctx, request, 200, started, scopeCheck.auth);
      return jsonResponse({ data: result }, request);
    } catch (err: any) {
      const status = err.message?.includes("scope") ? 403 : 401;
      await auditRequest(ctx, request, status, started, scopeCheck.auth, err.message);
      return errorResponse(err.message ?? "Authentication failed", request, status);
    }
  }),
});

http.route({
  path: "/api/v1/mcp/logs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const started = Date.now();
    const limited = await withApiRateLimit(ctx, "v1_mcp_logs", 120, request);
    if (limited) return limited;
    const token = getBearerToken(request);
    const scopeCheck = await requireHttpScope(ctx, request, token, "read");
    if (scopeCheck.error) return scopeCheck.error;
    const url = new URL(request.url);
    try {
      const data = await ctx.runQuery(api.mcpUsage.getMyLogs, {
        authToken: token!,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      });
      await auditRequest(ctx, request, 200, started, scopeCheck.auth);
      return jsonResponse({ data }, request);
    } catch (err: any) {
      const status = err.message?.includes("scope") ? 403 : 401;
      await auditRequest(ctx, request, status, started, scopeCheck.auth, err.message);
      return errorResponse(err.message ?? "Authentication failed", request, status);
    }
  }),
});

// ─── CORS Preflight ──────────────────────────────────────────────────
http.route({ path: "/api/auth/cli/init", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/auth/cli/poll", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/usage/submit", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/usage/cleanup", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/embed", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/health", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/open-stats", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/me", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/leaderboard", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/usage", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/mcp/log", method: "OPTIONS", handler: preflightHandler });
http.route({ path: "/api/v1/mcp/logs", method: "OPTIONS", handler: preflightHandler });
http.route({ pathPrefix: "/api/v1/users/", method: "OPTIONS", handler: preflightHandler });

export default http;
