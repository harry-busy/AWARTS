/**
 * `awarts push` -- Read local usage data and submit to the AWARTS API.
 *
 * Flags:
 *   --provider <name>   Only push data from a specific provider
 *   --dry-run           Show what would be pushed without actually submitting
 */

import chalk from 'chalk';
import { post } from '../lib/api.js';
import { loadAuth } from '../lib/auth-store.js';
import { ALL_ADAPTERS } from '../lib/detect.js';
import { hashEntries } from '../lib/hash.js';
import * as out from '../lib/output.js';
import type { UsageEntry, SubmitResponse, ProviderKey } from '../types.js';

export interface PushOptions {
  provider?: string;
  dryRun?: boolean;
  note?: string;
}

const VALID_PROVIDERS = new Set<string>(['claude', 'codex', 'gemini', 'antigravity']);

export async function pushCommand(opts: PushOptions): Promise<void> {
  out.banner();

  // ── Auth check ────────────────────────────────────────────────────────
  const auth = await loadAuth();
  if (!auth) {
    out.error('Not logged in. Run  awarts login  first.');
    return;
  }

  // ── Validate --provider flag ──────────────────────────────────────────
  if (opts.provider && !VALID_PROVIDERS.has(opts.provider)) {
    out.error(`Unknown provider "${opts.provider}". Valid: claude, codex, gemini, antigravity, cursor`);
    return;
  }

  // ── Select adapters ──────────────────────────────────────────────────
  const adapters = opts.provider
    ? ALL_ADAPTERS.filter((a) => a.name === opts.provider)
    : ALL_ADAPTERS;

  // ── Read usage data ──────────────────────────────────────────────────
  const allEntries: UsageEntry[] = [];

  for (const adapter of adapters) {
    const spin = out.spinner(`Reading ${adapter.displayName} usage data...`);
    spin.start();

    let detected = false;
    try {
      detected = await adapter.detect();
    } catch {
      // not detected
    }

    if (!detected) {
      spin.info(chalk.dim(`${adapter.displayName} -- not detected, skipping`));
      continue;
    }

    try {
      const entries = await adapter.read();
      if (entries.length === 0) {
        spin.info(chalk.dim(`${adapter.displayName} -- no usage data found`));
      } else {
        allEntries.push(...entries);
        spin.succeed(
          `${out.providerLabel(adapter.name)} -- ${chalk.bold(String(entries.length))} ${entries.length === 1 ? 'entry' : 'entries'} found`,
        );
      }
    } catch (err) {
      spin.fail(`${adapter.displayName} -- error reading data`);
      out.error(err instanceof Error ? err.message : String(err));
    }
  }

  console.log();

  if (allEntries.length === 0) {
    out.warn('No usage data found to push.');
    out.dim('Make sure you have used at least one supported AI coding tool.');
    console.log();
    return;
  }

  // ── Summary table ────────────────────────────────────────────────────
  const byProvider = new Map<string, { count: number; cost: number; tokens: number }>();
  for (const entry of allEntries) {
    const existing = byProvider.get(entry.provider) ?? { count: 0, cost: 0, tokens: 0 };
    existing.count += 1;
    existing.cost += entry.cost_usd;
    existing.tokens += entry.input_tokens + entry.output_tokens;
    byProvider.set(entry.provider, existing);
  }

  out.table(
    [
      { header: 'Provider', key: 'provider', color: (v) => out.providerLabel(v.trim()) },
      { header: 'Entries', key: 'entries', align: 'right' },
      { header: 'Cost', key: 'cost', align: 'right', color: chalk.yellow },
      { header: 'Tokens', key: 'tokens', align: 'right', color: chalk.cyan },
    ],
    Array.from(byProvider.entries()).map(([provider, stats]) => ({
      provider,
      entries: String(stats.count),
      cost: out.usd(stats.cost),
      tokens: out.tokens(stats.tokens),
    })),
  );

  console.log();

  const totalCost = allEntries.reduce((s, e) => s + e.cost_usd, 0);
  const totalTokens = allEntries.reduce((s, e) => s + e.input_tokens + e.output_tokens, 0);
  out.kv('Total entries', allEntries.length);
  out.kv('Total cost', out.usd(totalCost));
  out.kv('Total tokens', out.tokens(totalTokens));
  console.log();

  // ── Dry run ──────────────────────────────────────────────────────────
  if (opts.dryRun) {
    out.info(chalk.yellow('Dry run -- nothing was submitted.'));
    console.log();
    return;
  }

  // ── Submit ───────────────────────────────────────────────────────────
  const hash = hashEntries(allEntries);
  const spin = out.spinner('Submitting usage data...');
  spin.start();

  // Strip fields the backend may not accept yet
  const cleanEntries = allEntries.map(({ cost_source, ...rest }) => rest);

  try {
    const res = await post<SubmitResponse>('/api/usage/submit', {
      entries: cleanEntries,
      source: 'cli',
      hash,
      ...(opts.note && { note: opts.note }),
    });

    if (!res.ok) {
      spin.fail('Submission failed.');
      if (res.status === 401) {
        out.error('Authentication expired. Run  awarts login  to re-authenticate.');
      } else {
        out.error(`Server returned status ${res.status}`);
        const errorData = res.data as unknown as Record<string, unknown>;
        if (errorData?.error) out.error(String(errorData.error));
      }
      return;
    }

    const { processed, posts_created, errors } = res.data;

    if (errors && errors.length > 0) {
      spin.warn(chalk.yellow(`Submitted with ${errors.length} error(s).`));
      for (const e of errors) {
        out.error(`  ${e.date} / ${e.provider}: ${e.error}`);
      }
    } else {
      spin.succeed(chalk.green('Usage data submitted successfully!'));
    }

    console.log();
    out.kv('Entries processed', processed);
    out.kv('Posts created', posts_created);
    console.log();
  } catch (err) {
    spin.fail('Could not reach the AWARTS server.');
    out.error(err instanceof Error ? err.message : String(err));
    out.dim('Is the backend running? Check AWARTS_API_URL or ~/.awarts/config.json');
  }
}
