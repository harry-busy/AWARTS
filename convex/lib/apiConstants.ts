/** Canonical public API base (Vercel proxies /api/* → Convex). */
export const PRODUCTION_API_ORIGIN = "https://awarts.club";

/** Direct Convex HTTP site (fallback if proxy unavailable). */
export const CONVEX_HTTP_ORIGIN =
  process.env.CONVEX_HTTP_URL ?? "https://artful-bullfrog-640.convex.site";

export const API_VERSION = "v1";
