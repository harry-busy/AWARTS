/**
 * Pretty terminal output helpers -- colours, tables, banners, formatting.
 *
 * Every piece of user-facing text flows through this module so the rest of
 * the codebase stays free of chalk/ora imports.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

// ── Provider colour map ────────────────────────────────────────────────
const providerColors: Record<string, (t: string) => string> = {
  claude: chalk.hex('#E87A35'),
  codex: chalk.hex('#22C55E'),
  gemini: chalk.hex('#3B82F6'),
  antigravity: chalk.hex('#A855F7'),
  cursor: chalk.hex('#06B6D4'),
};

export function providerLabel(provider: string): string {
  const colorFn = providerColors[provider] ?? chalk.white;
  return colorFn(provider.charAt(0).toUpperCase() + provider.slice(1));
}

// ── Banners ────────────────────────────────────────────────────────────
export function banner(): void {
  const logo = chalk.bold.hex('#E87A35')('AWARTS');
  const v = chalk.dim('v0.3.3');
  const tagline = chalk.dim('Track your AI coding spend');
  console.log();
  console.log(`  ${logo} ${v}  ${tagline}`);
  console.log();
}

// ── Spinners ───────────────────────────────────────────────────────────
export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan', spinner: 'dots' });
}

// ── Status lines ───────────────────────────────────────────────────────
export function success(msg: string): void {
  console.log(`  ${chalk.green('+')} ${msg}`);
}

export function info(msg: string): void {
  console.log(`  ${chalk.cyan('i')} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`  ${chalk.yellow('!')} ${msg}`);
}

export function error(msg: string): void {
  console.log(`  ${chalk.red('x')} ${msg}`);
}

export function dim(msg: string): void {
  console.log(`  ${chalk.dim(msg)}`);
}

// ── Key-value pair ─────────────────────────────────────────────────────
export function kv(key: string, value: string | number): void {
  console.log(`  ${chalk.dim(key + ':')} ${chalk.white(String(value))}`);
}

// ── Tables ─────────────────────────────────────────────────────────────
export interface Column {
  header: string;
  key: string;
  align?: 'left' | 'right';
  color?: (v: string) => string;
}

export function table(columns: Column[], rows: Record<string, string | number>[]): void {
  if (rows.length === 0) {
    dim('No data to display.');
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const values = rows.map((r) => String(r[col.key] ?? ''));
    return Math.max(col.header.length, ...values.map((v) => v.length));
  });

  // Header
  const headerLine = columns
    .map((col, i) => {
      const padded = col.align === 'right'
        ? col.header.padStart(widths[i])
        : col.header.padEnd(widths[i]);
      return chalk.bold.underline(padded);
    })
    .join('  ');
  console.log(`  ${headerLine}`);

  // Rows
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const raw = String(row[col.key] ?? '');
        const padded = col.align === 'right'
          ? raw.padStart(widths[i])
          : raw.padEnd(widths[i]);
        return col.color ? col.color(padded) : padded;
      })
      .join('  ');
    console.log(`  ${line}`);
  }
}

// ── Formatting helpers ─────────────────────────────────────────────────
export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function tokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function divider(): void {
  console.log(`  ${chalk.dim('─'.repeat(50))}`);
}
