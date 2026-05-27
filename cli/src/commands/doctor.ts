/**
 * `awarts doctor` -- Check system requirements and guide users through setup.
 *
 * Verifies Node.js version, npm, provider tools, API keys, auth, and daemon.
 * Prints actionable install instructions with links for anything missing.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { loadAuth } from '../lib/auth-store.js';
import { loadKeys } from '../lib/keys.js';
// removed unused import
import { readPid, isProcessRunning } from '../lib/daemon.js';
import * as out from '../lib/output.js';

// ── Helpers ─────────────────────────────────────────────────────────────

interface Check {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  help?: string[];
}

function cmdExists(cmd: string): boolean {
  try {
    const where = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${where} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function cmdVersion(cmd: string): string | null {
  try {
    return execSync(`${cmd} --version`, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    return null;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function printCheck(c: Check): void {
  const icon =
    c.status === 'pass' ? chalk.green('+') :
    c.status === 'warn' ? chalk.yellow('!') :
    chalk.red('x');
  const color =
    c.status === 'pass' ? chalk.green :
    c.status === 'warn' ? chalk.yellow :
    chalk.red;

  console.log(`  ${icon} ${chalk.bold(c.label)}  ${color(c.message)}`);

  if (c.help) {
    for (const line of c.help) {
      console.log(`      ${chalk.dim(line)}`);
    }
  }
}

// ── Checks ──────────────────────────────────────────────────────────────

async function checkNode(): Promise<Check> {
  const version = process.version;          // e.g. v20.11.0
  const major = parseInt(version.slice(1)); // 20

  if (major >= 18) {
    return { label: 'Node.js', status: 'pass', message: `${version} (>= 18 required)` };
  }
  return {
    label: 'Node.js',
    status: 'fail',
    message: `${version} -- Node.js >= 18 is required`,
    help: [
      'Install or update Node.js:',
      'https://nodejs.org/en/download',
      'Or use nvm:  nvm install 20  (https://github.com/nvm-sh/nvm)',
      'Windows:     https://github.com/coreybutler/nvm-windows/releases',
    ],
  };
}

function checkNpm(): Check {
  const version = cmdVersion('npm');
  if (version) {
    return { label: 'npm', status: 'pass', message: version };
  }
  return {
    label: 'npm',
    status: 'fail',
    message: 'not found',
    help: [
      'npm comes bundled with Node.js. Install Node.js to get npm:',
      'https://nodejs.org/en/download',
    ],
  };
}

function checkNpx(): Check {
  if (cmdExists('npx')) {
    return { label: 'npx', status: 'pass', message: 'available' };
  }
  return {
    label: 'npx',
    status: 'warn',
    message: 'not found (optional -- needed for  npx awarts  usage)',
    help: [
      'npx ships with npm >= 5.2. Update npm:  npm install -g npm@latest',
    ],
  };
}

function checkGit(): Check {
  const version = cmdVersion('git');
  if (version) {
    return { label: 'Git', status: 'pass', message: version };
  }
  return {
    label: 'Git',
    status: 'warn',
    message: 'not found (optional -- needed to contribute)',
    help: [
      'https://git-scm.com/downloads',
    ],
  };
}

async function checkAuth(): Promise<Check> {
  const auth = await loadAuth();
  if (auth) {
    return { label: 'AWARTS Auth', status: 'pass', message: `logged in (user: ${auth.user_id})` };
  }
  return {
    label: 'AWARTS Auth',
    status: 'fail',
    message: 'not logged in',
    help: [
      'Run:  npx awarts login',
      'This opens your browser for device authentication.',
      'Create an account at:  https://awarts.club',
    ],
  };
}

async function checkDaemon(): Promise<Check> {
  const pid = await readPid();
  if (pid && isProcessRunning(pid)) {
    return { label: 'Daemon', status: 'pass', message: `running (PID ${pid})` };
  }
  if (pid) {
    return {
      label: 'Daemon',
      status: 'warn',
      message: `stale PID ${pid} (process not running)`,
      help: [
        'Restart with:  npx awarts daemon start',
      ],
    };
  }
  return {
    label: 'Daemon',
    status: 'warn',
    message: 'not running',
    help: [
      'Start auto-sync:  npx awarts daemon start',
      'The daemon syncs your usage every 5 minutes in the background.',
    ],
  };
}

// ── Provider checks ─────────────────────────────────────────────────────

async function checkClaude(): Promise<Check> {
  const home = os.homedir();
  const statsFile = path.join(home, '.claude', 'stats-cache.json');
  const claudeDir = path.join(home, '.claude');

  if (await fileExists(statsFile)) {
    return {
      label: 'Claude Code',
      status: 'pass',
      message: 'detected (stats-cache.json found)',
    };
  }
  if (await dirExists(claudeDir)) {
    return {
      label: 'Claude Code',
      status: 'warn',
      message: '~/.claude/ exists but no stats-cache.json yet',
      help: [
        'Use Claude Code to generate usage data. The stats file is created automatically.',
        'Install Claude Code:  npm install -g @anthropic-ai/claude-code',
        'Docs: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
      ],
    };
  }

  return {
    label: 'Claude Code',
    status: 'fail',
    message: 'not detected',
    help: [
      'Install Claude Code (official Anthropic CLI):',
      '  npm install -g @anthropic-ai/claude-code',
      '',
      'Requires an Anthropic API key or Claude Max/Pro subscription.',
      'Docs:  https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
      'Setup: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/setup',
    ],
  };
}

async function checkCodex(): Promise<Check> {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.codex'),
    path.join(home, '.openai-codex'),
  ];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    dirs.push(path.join(local, 'codex'));
  }

  const keys = await loadKeys();
  const hasKey = !!keys.openai;
  const hasDir = (await Promise.all(dirs.map(dirExists))).some(Boolean);
  const hasCli = cmdExists('codex');

  if (hasKey && (hasDir || hasCli)) {
    return { label: 'Codex (OpenAI)', status: 'pass', message: 'detected + API key set' };
  }
  if (hasDir || hasCli) {
    return {
      label: 'Codex (OpenAI)',
      status: 'warn',
      message: 'detected but no OpenAI API key (billing data unavailable)',
      help: [
        'Set your OpenAI key for billing data:',
        '  npx awarts keys set openai sk-your-key-here',
        '',
        'Get a key: https://platform.openai.com/api-keys',
        'Usage will still be tracked from local files without a key.',
      ],
    };
  }
  return {
    label: 'Codex (OpenAI)',
    status: 'fail',
    message: 'not detected',
    help: [
      'Install OpenAI Codex CLI:',
      '  npm install -g @openai/codex',
      '',
      'Then set your API key:',
      '  npx awarts keys set openai sk-your-key-here',
      '',
      'Get a key: https://platform.openai.com/api-keys',
      'Docs:      https://github.com/openai/codex',
    ],
  };
}

async function checkGemini(): Promise<Check> {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.gemini'),
    path.join(home, '.config', 'gemini'),
  ];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    dirs.push(path.join(local, 'gemini'));
  }

  const keys = await loadKeys();
  const hasKey = !!keys.google;
  const hasDir = (await Promise.all(dirs.map(dirExists))).some(Boolean);
  const hasCli = cmdExists('gemini');

  if (hasKey && (hasDir || hasCli)) {
    return { label: 'Gemini (Google)', status: 'pass', message: 'detected + API key set' };
  }
  if (hasDir || hasCli) {
    return {
      label: 'Gemini (Google)',
      status: 'warn',
      message: 'detected but no Google API key set',
      help: [
        'Set your Google API key for enhanced data:',
        '  npx awarts keys set google AIza-your-key-here',
        '',
        'Get a key: https://aistudio.google.com/apikey',
        'Usage is still tracked from local session files without a key.',
      ],
    };
  }
  return {
    label: 'Gemini (Google)',
    status: 'fail',
    message: 'not detected',
    help: [
      'Install Gemini CLI:',
      '  npm install -g @anthropic-ai/gemini-cli',
      '  Or: pip install gemini-cli',
      '',
      'Then set your API key:',
      '  npx awarts keys set google AIza-your-key-here',
      '',
      'Get a key: https://aistudio.google.com/apikey',
      'Docs:      https://github.com/google-gemini/gemini-cli',
    ],
  };
}

async function checkCursor(): Promise<Check> {
  const home = os.homedir();
  const paths = [
    path.join(home, '.awarts', 'cursor-usage.json'),
    path.join(home, '.cursor', 'awarts-usage.json'),
  ];
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) {
      paths.push(path.join(appData, 'Cursor', 'User', 'globalStorage', 'state.vscdb'));
    }
  } else if (process.platform === 'darwin') {
    paths.push(
      path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
    );
  } else {
    paths.push(path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'));
  }

  const hasData = (await Promise.all(paths.map(pathExists))).some(Boolean);
  if (hasData) {
    return { label: 'Cursor', status: 'pass', message: 'usage data or install detected' };
  }
  return {
    label: 'Cursor',
    status: 'warn',
    message: 'not detected',
    help: [
      'Add ~/.awarts/cursor-usage.json or install the AWARTS Cursor extension',
      'Docs: https://awarts.club/docs',
    ],
  };
}

async function checkAntigravity(): Promise<Check> {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.antigravity'),
    path.join(home, '.gemini', 'antigravity'),
  ];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    dirs.push(path.join(local, 'antigravity'));
  }

  const keys = await loadKeys();
  const hasKey = !!keys.antigravity;
  const hasDir = (await Promise.all(dirs.map(dirExists))).some(Boolean);

  if (hasKey && hasDir) {
    return { label: 'Antigravity', status: 'pass', message: 'detected + API key set' };
  }
  if (hasDir) {
    return {
      label: 'Antigravity',
      status: 'warn',
      message: 'detected but no API key set',
      help: [
        'Set your Antigravity API key:',
        '  npx awarts keys set antigravity your-key-here',
      ],
    };
  }
  return {
    label: 'Antigravity',
    status: 'fail',
    message: 'not detected',
    help: [
      'Antigravity is auto-detected if usage files exist in:',
      '  ~/.antigravity/usage/*.json',
      '',
      'Set your API key:',
      '  npx awarts keys set antigravity your-key-here',
    ],
  };
}

// ── Main command ─────────────────────────────────────────────────────────

export async function doctorCommand(): Promise<void> {
  out.banner();

  console.log(`  ${chalk.bold.underline('System Requirements')}`);
  console.log();

  const sysChecks: Check[] = [
    await checkNode(),
    checkNpm(),
    checkNpx(),
    checkGit(),
  ];
  for (const c of sysChecks) printCheck(c);

  console.log();
  console.log(`  ${chalk.bold.underline('AWARTS Account')}`);
  console.log();

  const authCheck = await checkAuth();
  printCheck(authCheck);

  console.log();
  console.log(`  ${chalk.bold.underline('AI Coding Tools')}`);
  console.log(`  ${chalk.dim('AWARTS tracks usage from these providers. Install at least one:')}`);
  console.log();

  const providerChecks: Check[] = [
    await checkClaude(),
    await checkCodex(),
    await checkGemini(),
    await checkAntigravity(),
    await checkCursor(),
  ];
  for (const c of providerChecks) printCheck(c);

  const detectedProviders = providerChecks.filter((c) => c.status !== 'fail').length;

  console.log();
  console.log(`  ${chalk.bold.underline('Background Sync')}`);
  console.log();

  const daemonCheck = await checkDaemon();
  printCheck(daemonCheck);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log();
  out.divider();
  console.log();

  const allChecks = [...sysChecks, authCheck, ...providerChecks, daemonCheck];
  const fails = allChecks.filter((c) => c.status === 'fail');
  const warns = allChecks.filter((c) => c.status === 'warn');

  if (fails.length === 0 && warns.length === 0) {
    out.success(chalk.bold('All checks passed! You\'re all set.'));
  } else if (fails.length === 0) {
    out.success(`All requirements met. ${warns.length} optional improvement(s) above.`);
  } else {
    out.error(`${fails.length} required check(s) failed. Fix them to get started.`);
    if (warns.length > 0) {
      out.warn(`${warns.length} optional improvement(s) noted above.`);
    }
  }

  // Quick-start guide if not logged in or no providers
  if (authCheck.status === 'fail' || detectedProviders === 0) {
    console.log();
    console.log(`  ${chalk.bold.underline('Quick Start')}`);
    console.log();
    console.log(`  ${chalk.cyan('1.')} Install at least one AI coding tool (see above)`);
    console.log(`  ${chalk.cyan('2.')} Create an account: ${chalk.underline('https://awarts.club')}`);
    console.log(`  ${chalk.cyan('3.')} Login:   ${chalk.bold('npx awarts login')}`);
    console.log(`  ${chalk.cyan('4.')} Sync:    ${chalk.bold('npx awarts sync')}`);
    console.log(`  ${chalk.cyan('5.')} Auto:    ${chalk.bold('npx awarts daemon start')}`);
    console.log();
    out.dim('Full docs: https://awarts.club/docs');
  }

  console.log();
}
