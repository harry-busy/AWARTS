const DEFAULT_API_URL = "https://awarts.club";

export function getApiBase(): string {
  return (process.env.AWARTS_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

export function getApiKey(): string {
  const key = process.env.AWARTS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "AWARTS_API_KEY is required. Create one at https://awarts.club/settings → API Keys",
    );
  }
  return key;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}

export async function logMcpTool(
  toolName: string,
  success: boolean,
  durationMs: number,
  tokensEstimate?: number,
): Promise<void> {
  try {
    await apiPost("/api/v1/mcp/log", {
      tool_name: toolName,
      success,
      duration_ms: durationMs,
      tokens_estimate: tokensEstimate,
      source: "mcp",
    });
  } catch {
    // Non-fatal — don't block tool results if logging fails
  }
}
