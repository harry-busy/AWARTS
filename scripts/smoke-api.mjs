#!/usr/bin/env node
/**
 * Production API smoke test — run after deploy:
 *   node scripts/smoke-api.mjs
 *   AWARTS_API_BASE=https://awarts.club node scripts/smoke-api.mjs
 *   AWARTS_API_KEY=aw_live_... node scripts/smoke-api.mjs
 */

const BASE = (process.env.AWARTS_API_BASE ?? "https://awarts.club").replace(/\/+$/, "");
const API_KEY = process.env.AWARTS_API_KEY;

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}:`, err instanceof Error ? err.message : err);
  }
}

async function get(path, auth = false) {
  const headers = { Accept: "application/json" };
  if (auth && API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body.error ?? JSON.stringify(body)}`);
  return body;
}

await check("GET /api/v1/health", async () => {
  const body = await get("/api/v1/health");
  if (body.status !== "ok") throw new Error("health not ok");
  if (!body.version) throw new Error("missing version");
});

await check("GET /api/v1/open-stats", async () => {
  const body = await get("/api/v1/open-stats");
  if (!body.data) throw new Error("missing data");
});

await check("GET /api/v1/leaderboard", async () => {
  const body = await get("/api/v1/leaderboard?limit=5");
  if (!body.data?.entries) throw new Error("missing entries");
});

if (API_KEY) {
  await check("GET /api/v1/me (authenticated)", async () => {
    const body = await get("/api/v1/me", true);
    if (!body.data?.user?.username) throw new Error("missing user");
  });
} else {
  console.log("○ Skipping authenticated tests (set AWARTS_API_KEY)");
}

console.log(failed === 0 ? "\nAll smoke checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
