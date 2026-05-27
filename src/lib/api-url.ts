/** Public REST API base URL (proxied to Convex on production). */
export const AWARTS_API_BASE =
  (import.meta.env.VITE_AWARTS_API_URL as string | undefined)?.replace(/\/+$/, '') ??
  'https://awarts.club';

export const AWARTS_API_V1 = `${AWARTS_API_BASE}/api/v1`;
