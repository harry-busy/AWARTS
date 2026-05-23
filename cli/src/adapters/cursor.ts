/**
 * Cursor adapter — reads local Cursor usage snapshots for AWARTS sync.
 *
 * Sources (first match wins):
 * 1. ~/.awarts/cursor-usage.json  (written by AWARTS Cursor extension or manual export)
 * 2. ~/.cursor/awarts-usage.json
 * 3. Latest Cursor usage CSV in ~/Downloads matching *cursor*usage*
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Adapter, UsageEntry } from '../types.js';

const AWARTS_CURSOR_FILE = path.join(os.homedir(), '.awarts', 'cursor-usage.json');
const CURSOR_AWARTS_FILE = path.join(os.homedir(), '.cursor', 'awarts-usage.json');

interface CursorDailyRow {
  date: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  models?: string[];
  agents?: Record<string, number>;
  subscription?: string;
  plan_amount_usd?: number;
}

interface CursorUsageFile {
  version?: number;
  daily?: CursorDailyRow[];
  entries?: CursorDailyRow[];
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function rowToEntry(row: CursorDailyRow): UsageEntry | null {
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  const input = Number(row.input_tokens) || 0;
  const output = Number(row.output_tokens) || 0;
  const cost = Number(row.cost_usd) || 0;
  const models = Array.isArray(row.models) ? row.models.filter(Boolean) : ['cursor-auto'];

  const meta: Record<string, unknown> = {};
  if (row.agents && Object.keys(row.agents).length > 0) meta.agents = row.agents;
  if (row.subscription) meta.subscription = row.subscription;
  if (row.plan_amount_usd != null) meta.plan_amount_usd = row.plan_amount_usd;

  return {
    date: row.date,
    provider: 'cursor',
    cost_usd: cost,
    input_tokens: input,
    output_tokens: output,
    models,
    cost_source: cost > 0 ? 'real' : 'estimated',
    raw_data: Object.keys(meta).length > 0 ? JSON.stringify(meta) : undefined,
  };
}

async function readJsonFile(filePath: string): Promise<UsageEntry[]> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as CursorUsageFile;
  const rows = parsed.daily ?? parsed.entries ?? [];
  const entries: UsageEntry[] = [];
  for (const row of rows) {
    const e = rowToEntry(row);
    if (e) entries.push(e);
  }
  return entries;
}

async function findCursorCsv(): Promise<string | null> {
  const downloads = path.join(os.homedir(), 'Downloads');
  if (!(await fileExists(downloads))) return null;
  const files = await fs.readdir(downloads);
  const csvs = files
    .filter((f) => f.toLowerCase().includes('cursor') && f.toLowerCase().endsWith('.csv'))
    .sort()
    .reverse();
  if (csvs.length === 0) return null;
  return path.join(downloads, csvs[0]);
}

async function readCsvFile(filePath: string): Promise<UsageEntry[]> {
  const text = await fs.readFile(filePath, 'utf-8');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h === 'date' || h === 'day');
  const costIdx = headers.findIndex((h) => h.includes('cost') || h === 'amount');
  const inputIdx = headers.findIndex((h) => h.includes('input'));
  const outputIdx = headers.findIndex((h) => h.includes('output'));
  const modelIdx = headers.findIndex((h) => h === 'model' || h === 'models');

  const byDate = new Map<string, UsageEntry>();

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const date = dateIdx >= 0 ? cols[dateIdx]?.slice(0, 10) : '';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const existing = byDate.get(date) ?? {
      date,
      provider: 'cursor' as const,
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      models: [] as string[],
      cost_source: 'real' as const,
    };

    existing.cost_usd += costIdx >= 0 ? Number(cols[costIdx]) || 0 : 0;
    existing.input_tokens += inputIdx >= 0 ? Number(cols[inputIdx]) || 0 : 0;
    existing.output_tokens += outputIdx >= 0 ? Number(cols[outputIdx]) || 0 : 0;
    if (modelIdx >= 0 && cols[modelIdx]) {
      const m = cols[modelIdx];
      if (!existing.models.includes(m)) existing.models.push(m);
    }
    if (existing.models.length === 0) existing.models = ['cursor-auto'];

    byDate.set(date, existing);
  }

  return [...byDate.values()];
}

export const cursorAdapter: Adapter = {
  name: 'cursor',
  displayName: 'Cursor',

  async detect(): Promise<boolean> {
    if (await fileExists(AWARTS_CURSOR_FILE)) return true;
    if (await fileExists(CURSOR_AWARTS_FILE)) return true;
    const csv = await findCursorCsv();
    if (csv) return true;

    const appData = process.env.APPDATA;
    if (appData) {
      const stateDb = path.join(appData, 'Cursor', 'User', 'globalStorage', 'state.vscdb');
      if (await fileExists(stateDb)) return true;
    }
    const macDb = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    if (await fileExists(macDb)) return true;
    const linuxDb = path.join(os.homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    if (await fileExists(linuxDb)) return true;

    return false;
  },

  async read(): Promise<UsageEntry[]> {
    if (await fileExists(AWARTS_CURSOR_FILE)) {
      return readJsonFile(AWARTS_CURSOR_FILE);
    }
    if (await fileExists(CURSOR_AWARTS_FILE)) {
      return readJsonFile(CURSOR_AWARTS_FILE);
    }
    const csv = await findCursorCsv();
    if (csv) return readCsvFile(csv);
    return [];
  },
};
