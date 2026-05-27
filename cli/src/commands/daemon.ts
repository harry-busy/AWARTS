/**
 * `awarts daemon` -- Background sync daemon management.
 *
 * Subcommands:
 *   awarts daemon start     Spawn a background sync process
 *   awarts daemon stop      Stop the running daemon
 *   awarts daemon status    Check if daemon is running
 *   awarts daemon logs      Tail the daemon log
 *   awarts daemon __run     (internal) The actual polling loop
 */

import chalk from 'chalk';
import { loadAuth } from '../lib/auth-store.js';
import { syncCommand } from './sync.js';
import * as out from '../lib/output.js';
import {
  readPid,
  removePid,
  isProcessRunning,
  killProcess,
  spawnDaemon,
  readLogTail,
  appendLog,
  PID_FILE,
  LOG_FILE,
  DEFAULT_INTERVAL_MS,
} from '../lib/daemon.js';

export async function daemonStartCommand(intervalMs: number): Promise<void> {
  out.banner();

  // Auth check
  const auth = await loadAuth();
  if (!auth) {
    out.error('Not logged in. Run  awarts login  first.');
    return;
  }

  // Check if already running
  const existingPid = await readPid();
  if (existingPid && isProcessRunning(existingPid)) {
    out.warn(`Daemon is already running (PID ${existingPid}).`);
    out.dim('Run  awarts daemon stop  first to restart.');
    console.log();
    return;
  }

  // Clean up stale PID
  if (existingPid) {
    await removePid();
  }

  const spin = out.spinner('Starting daemon...');
  spin.start();

  try {
    const pid = await spawnDaemon(intervalMs);
    spin.succeed(chalk.green(`Daemon started (PID ${pid})`));
    console.log();
    out.kv('Sync interval', `${Math.round(intervalMs / 60000)} minutes`);
    out.kv('PID file', PID_FILE);
    out.kv('Log file', LOG_FILE);
    console.log();
    out.dim('Run  awarts daemon status  to check health.');
    out.dim('Run  awarts daemon logs    to view output.');
    out.dim('Run  awarts daemon stop    to stop.');
    console.log();
  } catch (err) {
    spin.fail('Failed to start daemon.');
    out.error(err instanceof Error ? err.message : String(err));
  }
}

export async function daemonStopCommand(): Promise<void> {
  out.banner();

  const pid = await readPid();
  if (!pid) {
    out.info('No daemon PID file found. Daemon is not running.');
    console.log();
    return;
  }

  if (!isProcessRunning(pid)) {
    out.info(`Daemon process ${pid} is not running (stale PID file).`);
    await removePid();
    out.success('Cleaned up stale PID file.');
    console.log();
    return;
  }

  const killed = killProcess(pid);
  if (killed) {
    out.success(`Daemon stopped (PID ${pid}).`);
    await removePid();
  } else {
    out.error(`Failed to stop daemon (PID ${pid}).`);
  }
  console.log();
}

export async function daemonStatusCommand(): Promise<void> {
  out.banner();

  const pid = await readPid();

  console.log(`  ${chalk.bold.underline('Daemon Status')}`);
  console.log();

  if (!pid) {
    out.warn('Daemon is not running (no PID file).');
    out.dim('Start with:  awarts daemon start');
    console.log();
    return;
  }

  if (isProcessRunning(pid)) {
    out.success(`Daemon is running (PID ${pid})`);
    out.kv('PID file', PID_FILE);
    out.kv('Log file', LOG_FILE);
  } else {
    out.warn(`Daemon is not running (stale PID ${pid}).`);
    await removePid();
    out.dim('Cleaned up stale PID file. Start with:  awarts daemon start');
  }
  console.log();
}

export async function daemonLogsCommand(lines: number): Promise<void> {
  const tail = await readLogTail(lines);
  console.log(tail);
}

/**
 * Internal command: the polling loop run by the detached daemon process.
 * Never invoked by the user directly -- spawned via `spawnDaemon()`.
 */
export async function daemonRunLoop(intervalMs: number): Promise<void> {
  await appendLog(`Daemon started. Interval: ${intervalMs}ms (${Math.round(intervalMs / 60000)} min)`);

  let consecutiveFailures = 0;

  const runSync = async (): Promise<boolean> => {
    // Check auth before each sync -- exit if user logged out
    const auth = await loadAuth();
    if (!auth) {
      await appendLog('Auth revoked (user logged out). Daemon exiting.');
      await removePid();
      return false;
    }

    await appendLog('Starting sync...');
    try {
      await syncCommand({ silent: true });
      await appendLog('Sync completed successfully.');
      consecutiveFailures = 0;
    } catch (err) {
      consecutiveFailures++;
      const msg = err instanceof Error ? err.message : String(err);
      await appendLog(`Sync failed (attempt ${consecutiveFailures}): ${msg}`);

      // After 10 consecutive failures, exit to avoid spinning forever
      if (consecutiveFailures >= 10) {
        await appendLog('Too many consecutive failures. Daemon exiting.');
        await removePid();
        return false;
      }
    }
    return true;
  };

  // Run immediately on start
  const ok = await runSync();
  if (!ok) return;

  // Then loop
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const keepRunning = await runSync();
    if (!keepRunning) return;
  }
}
