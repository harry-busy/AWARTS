import { describe, it, expect } from "vitest";

/** Mirror of convex/lib/apiScopes.ts for unit tests */
type ApiScope = "read" | "write" | "mcp";
type Auth = { method: "api_key" | "cli" | "clerk"; scopes?: string[] };

function authHasScope(auth: Auth, scope: ApiScope): boolean {
  if (auth.method === "cli" || auth.method === "clerk") return true;
  const scopes = auth.scopes ?? [];
  if (scopes.includes("admin")) return true;
  switch (scope) {
    case "read":
      return scopes.includes("read") || scopes.includes("write");
    case "write":
      return scopes.includes("write");
    case "mcp":
      return scopes.includes("mcp") || scopes.includes("write");
    default:
      return false;
  }
}

describe("API key scopes", () => {
  it("grants read with read scope", () => {
    expect(authHasScope({ method: "api_key", scopes: ["read"] }, "read")).toBe(true);
  });

  it("denies write without write scope", () => {
    expect(authHasScope({ method: "api_key", scopes: ["read"] }, "write")).toBe(false);
  });

  it("grants mcp with mcp scope", () => {
    expect(authHasScope({ method: "api_key", scopes: ["mcp"] }, "mcp")).toBe(true);
  });

  it("CLI has full access", () => {
    expect(authHasScope({ method: "cli" }, "write")).toBe(true);
  });

  it("write scope implies read", () => {
    expect(authHasScope({ method: "api_key", scopes: ["write"] }, "read")).toBe(true);
  });
});
