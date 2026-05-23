/**
 * Auto-detect which AI coding tools are installed on this machine.
 *
 * Each adapter is probed via its `detect()` method; this module simply
 * aggregates the results and returns the list of available providers.
 */

import type { Adapter } from '../types.js';
import { claudeAdapter } from '../adapters/claude.js';
import { codexAdapter } from '../adapters/codex.js';
import { geminiAdapter } from '../adapters/gemini.js';
import { antigravityAdapter } from '../adapters/antigravity.js';
import { cursorAdapter } from '../adapters/cursor.js';

export const ALL_ADAPTERS: Adapter[] = [
  claudeAdapter,
  codexAdapter,
  geminiAdapter,
  antigravityAdapter,
  cursorAdapter,
];

export interface DetectionResult {
  adapter: Adapter;
  detected: boolean;
}

/**
 * Probe every known adapter and return the results.
 */
export async function detectAll(): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];

  for (const adapter of ALL_ADAPTERS) {
    let detected = false;
    try {
      detected = await adapter.detect();
    } catch {
      // Swallow -- treat as not detected.
    }
    results.push({ adapter, detected });
  }

  return results;
}

/**
 * Return only the adapters that are present on this machine.
 */
export async function detectInstalled(): Promise<Adapter[]> {
  const all = await detectAll();
  return all.filter((r) => r.detected).map((r) => r.adapter);
}

/**
 * Look up a single adapter by its provider key.
 */
export function getAdapter(name: string): Adapter | undefined {
  return ALL_ADAPTERS.find((a) => a.name === name);
}
