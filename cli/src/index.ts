#!/usr/bin/env node

/**
 * AWARTS CLI -- track your AI coding spend across providers.
 *
 * Usage:
 *   npx awarts login            Authenticate with your AWARTS account
 *   npx awarts push             Push local usage data to AWARTS
 *   npx awarts sync             Auto-detect providers and push everything
 *   npx awarts status           Show auth status and detected providers
 *   npx awarts doctor           Check requirements and get setup guide
 *   npx awarts logout           Clear stored credentials
 *   npx awarts daemon start     Start background auto-sync
 *   npx awarts daemon stop      Stop the daemon
 *   npx awarts daemon status    Check daemon health
 *   npx awarts daemon logs      View daemon output
 */

import { Command } from 'commander';
import { loginCommand, loginForceCommand } from './commands/login.js';
import { pushCommand } from './commands/push.js';
import { statusCommand } from './commands/status.js';
import { syncCommand } from './commands/sync.js';
import { seedCommand } from './commands/seed.js';
import { cleanupCommand } from './commands/cleanup.js';
import {
  daemonStartCommand,
  daemonStopCommand,
  daemonStatusCommand,
  daemonLogsCommand,
  daemonRunLoop,
} from './commands/daemon.js';
import { doctorCommand } from './commands/doctor.js';
import { clearAuth } from './lib/auth-store.js';
import { DEFAULT_INTERVAL_MS } from './lib/daemon.js';
import { setKey, removeKey, listKeys, type ProviderKeyName } from './lib/keys.js';
import * as out from './lib/output.js';
import { checkForUpdates } from './lib/version-check.js';

const program = new Command();

program
  .name('awarts')
  .description('Track your AI coding spend across Claude, Codex, Gemini & Antigravity')
  .version('0.3.1')
  .hook('preAction', () => {
    // Skip version check for daemon __run (background process — no TTY, no need)
    if (process.argv.includes('__run')) return;
    return checkForUpdates();
  });

// ─── login ──────────────────────────────────────────────────────────────
program
  .command('login')
  .description('Authenticate with your AWARTS account via device auth')
  .option('--force', 'Re-authenticate even if already logged in')
  .action(async (opts: { force?: boolean }) => {
    try {
      if (opts.force) {
        await loginForceCommand();
      } else {
        await loginCommand();
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── push ───────────────────────────────────────────────────────────────
program
  .command('push')
  .description('Read local usage data and submit to AWARTS')
  .option('-p, --provider <name>', 'Only push data from a specific provider (claude, codex, gemini, antigravity, cursor)')
  .option('-n, --dry-run', 'Show what would be pushed without submitting')
  .option('--note <text>', 'Attach a note/description to today\'s post')
  .action(async (opts: { provider?: string; dryRun?: boolean; note?: string }) => {
    try {
      await pushCommand(opts);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── sync ───────────────────────────────────────────────────────────────
program
  .command('sync')
  .description('Auto-detect all providers and push usage data')
  .option('-n, --dry-run', 'Show what would be pushed without submitting')
  .option('--note <text>', 'Attach a note/description to today\'s post')
  .action(async (opts: { note?: string; dryRun?: boolean }) => {
    try {
      await syncCommand(opts);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── seed ────────────────────────────────────────────────────────────────
program
  .command('seed')
  .description('Generate sample usage data for providers with no data (Codex, Gemini, Antigravity)')
  .option('-p, --provider <name>', 'Only seed a specific provider (codex, gemini, antigravity)')
  .option('-d, --days <count>', 'Number of days of sample data to generate', '7')
  .option('--force', 'Overwrite existing usage data')
  .action(async (opts: { provider?: string; days?: string; force?: boolean }) => {
    try {
      await seedCommand({
        provider: opts.provider,
        days: Number(opts.days) || 7,
        force: opts.force,
      });
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── cleanup ────────────────────────────────────────────────────────────
program
  .command('cleanup')
  .description('Remove invalid/old usage data from AWARTS (e.g. entries with wrong dates)')
  .option('--before <date>', 'Delete entries before this date (default: 2020-01-01)', '2020-01-01')
  .option('--date <dates...>', 'Delete entries for specific dates (YYYY-MM-DD)')
  .action(async (opts: { before?: string; date?: string[] }) => {
    try {
      await cleanupCommand({
        beforeDate: opts.before,
        dates: opts.date,
      });
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── status ─────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show auth status, configuration, and detected providers')
  .action(async () => {
    try {
      await statusCommand();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── doctor ─────────────────────────────────────────────────────────────
program
  .command('doctor')
  .alias('setup')
  .description('Check system requirements and get setup guidance')
  .action(async () => {
    try {
      await doctorCommand();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── logout ─────────────────────────────────────────────────────────────
program
  .command('logout')
  .description('Clear stored credentials')
  .action(async () => {
    try {
      out.banner();
      await clearAuth();
      out.success('Logged out. Credentials removed from ~/.awarts/auth.json');
      console.log();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── daemon ──────────────────────────────────────────────────────────────
const daemon = program
  .command('daemon')
  .description('Manage the background auto-sync daemon');

daemon
  .command('start')
  .description('Start the background sync daemon')
  .option('--interval <minutes>', 'Sync interval in minutes', '60')
  .action(async (opts: { interval: string }) => {
    try {
      const minutes = Number(opts.interval);
      const intervalMs = (isNaN(minutes) || minutes < 1) ? DEFAULT_INTERVAL_MS : minutes * 60 * 1000;
      await daemonStartCommand(intervalMs);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

daemon
  .command('stop')
  .description('Stop the running daemon')
  .action(async () => {
    try {
      await daemonStopCommand();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

daemon
  .command('status')
  .description('Check if the daemon is running')
  .action(async () => {
    try {
      await daemonStatusCommand();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

daemon
  .command('logs')
  .description('Show recent daemon log output')
  .option('-n, --lines <count>', 'Number of lines to show', '50')
  .action(async (opts: { lines: string }) => {
    try {
      await daemonLogsCommand(Number(opts.lines) || 50);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// Hidden internal command -- the actual polling loop run by the daemon process
daemon
  .command('__run', { hidden: true })
  .option('--interval <ms>', 'Interval in milliseconds')
  .action(async (opts: { interval: string }) => {
    try {
      await daemonRunLoop(Number(opts.interval) || DEFAULT_INTERVAL_MS);
    } catch (err) {
      console.error(`Daemon error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ─── keys ───────────────────────────────────────────────────────────────
const keys = program
  .command('keys')
  .description('Manage API keys for provider billing (OpenAI, Google, Antigravity)');

keys
  .command('set <provider> <key>')
  .description('Store an API key for a provider (openai, google, antigravity)')
  .action(async (provider: string, key: string) => {
    try {
      const valid: ProviderKeyName[] = ['openai', 'google', 'antigravity'];
      if (!valid.includes(provider as ProviderKeyName)) {
        out.error(`Invalid provider "${provider}". Must be one of: ${valid.join(', ')}`);
        process.exit(1);
      }
      await setKey(provider as ProviderKeyName, key);
      out.success(`API key saved for ${provider} (stored in ~/.awarts/keys.json)`);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

keys
  .command('list')
  .description('List stored API keys (masked)')
  .action(async () => {
    try {
      const stored = await listKeys();
      if (stored.length === 0) {
        out.info('No API keys stored. Use `awarts keys set <provider> <key>` to add one.');
        return;
      }
      console.log();
      for (const { provider, masked } of stored) {
        console.log(`  ${provider.padEnd(14)} ${masked}`);
      }
      console.log();
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

keys
  .command('remove <provider>')
  .description('Remove a stored API key')
  .action(async (provider: string) => {
    try {
      const valid: ProviderKeyName[] = ['openai', 'google', 'antigravity'];
      if (!valid.includes(provider as ProviderKeyName)) {
        out.error(`Invalid provider "${provider}". Must be one of: ${valid.join(', ')}`);
        process.exit(1);
      }
      const removed = await removeKey(provider as ProviderKeyName);
      if (removed) {
        out.success(`API key removed for ${provider}`);
      } else {
        out.info(`No key stored for ${provider}`);
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── Parse & run ────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err) => {
  out.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
