import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { cursorAdapter } from "./cursor.js";

const FIXTURE = path.join(os.homedir(), ".awarts", "cursor-usage.json");

describe("cursorAdapter", () => {
  let backup: string | null = null;

  beforeEach(async () => {
    try {
      backup = await fs.readFile(FIXTURE, "utf-8");
    } catch {
      backup = null;
    }
    await fs.mkdir(path.dirname(FIXTURE), { recursive: true });
    await fs.writeFile(
      FIXTURE,
      JSON.stringify({
        daily: [
          {
            date: "2026-05-23",
            input_tokens: 1000,
            output_tokens: 500,
            cost_usd: 1.5,
            models: ["cursor-small"],
            agents: { composer: 2 },
          },
        ],
      }),
      "utf-8",
    );
  });

  afterEach(async () => {
    if (backup !== null) {
      await fs.writeFile(FIXTURE, backup, "utf-8");
    } else {
      try {
        await fs.unlink(FIXTURE);
      } catch {
        /* ignore */
      }
    }
  });

  it("detects cursor usage file", async () => {
    expect(await cursorAdapter.detect()).toBe(true);
  });

  it("reads daily entries", async () => {
    const entries = await cursorAdapter.read();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].provider).toBe("cursor");
    expect(entries[0].input_tokens).toBe(1000);
  });
});
