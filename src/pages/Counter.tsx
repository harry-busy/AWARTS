import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { useCounterData, useVelocityMetrics } from '@/hooks/use-api';
import { UsageBar } from '@/components/UsageBar';
import { formatTokens, formatCost } from '@/lib/format';
import { PROVIDERS } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Zap, Database, TrendingUp, Cpu, Calendar, Flame, Gauge } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { Provider } from '@/lib/types';
import { CursorStatsPanel } from '@/components/CursorStatsPanel';

export default function Counter() {
  return (
    <AuthGate>
      <CounterContent />
    </AuthGate>
  );
}

/** Context-limit for the mini bar (200k tokens) */
const CONTEXT_LIMIT = 200_000;

function CounterContent() {
  const { data, isLoading } = useCounterData();
  const velocity = useVelocityMetrics();

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-60 rounded-lg" />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <SEO title="Counter" description="Track your AI token usage in real time." noindex />
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold text-foreground">No usage data yet</h2>
          <p className="text-muted-foreground text-sm">Push sessions with the CLI to see your counter dashboard.</p>
          <code className="block text-xs font-mono text-foreground bg-muted/50 rounded px-3 py-2 max-w-xs mx-auto">npx awarts@latest sync</code>
        </div>
      </AppShell>
    );
  }

  const { today, week, allTime, providerBreakdown, dailyTrend } = data;

  // Cache efficiency — how much of total cache activity is reads (savings)
  const todayCacheTotal = today.cacheCreation + today.cacheRead;
  const todayCacheEfficiency = todayCacheTotal > 0 ? (today.cacheRead / todayCacheTotal) * 100 : 0;
  const weekCacheTotal = week.cacheCreation + week.cacheRead;
  const weekCacheEfficiency = weekCacheTotal > 0 ? (week.cacheRead / weekCacheTotal) * 100 : 0;

  // Today's token percent against the context limit (200k per conversation)
  const todayContextPercent = Math.min(100, (today.tokens / CONTEXT_LIMIT) * 100);

  // Peak provider
  const topProvider = providerBreakdown.length > 0 ? providerBreakdown[0] : null;
  const maxProviderTokens = topProvider?.tokens ?? 1;

  return (
    <AppShell>
      <SEO title="Counter" description="Track your AI token usage in real time." noindex />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Counter</h1>
        </div>

        <CursorStatsPanel />

        {/* ───── Today's Stats ───── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Today</span>
            </div>
            <span className="font-mono text-lg font-bold text-foreground">{formatTokens(today.tokens)}</span>
          </div>

          {/* Token count against 200k context */}
          <UsageBar
            percent={todayContextPercent}
            label="Context Usage"
            sublabel={`${formatTokens(today.tokens)} / ${formatTokens(CONTEXT_LIMIT)}`}
            color="hsl(var(--primary))"
            tooltip={`${today.tokens.toLocaleString()} tokens used today across all conversations (reference: 200K context window)`}
          />

          {/* Today mini stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="Input" value={formatTokens(today.input)} icon="in" />
            <StatMini label="Output" value={formatTokens(today.output)} icon="out" />
            <StatMini label="Cost" value={formatCost(today.cost)} icon="cost" />
            <StatMini label="Models" value={today.models.length > 0 ? today.models.join(', ') : 'None'} icon="model" truncate />
          </div>
        </motion.div>

        {/* ───── Weekly Stats ───── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">This Week</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{week.activeDays}/7 days</span>
              <span className="font-mono font-bold text-foreground">{formatCost(week.cost)}</span>
            </div>
          </div>

          {/* Weekly usage bar — percent of "7 active days" */}
          <UsageBar
            percent={(week.activeDays / 7) * 100}
            label="Active Days"
            sublabel={`${week.activeDays} of 7`}
            color="hsl(var(--primary))"
            tooltip={`You've coded with AI on ${week.activeDays} out of the last 7 days`}
          />

          {/* Weekly token bar — percent relative to peak day */}
          <UsageBar
            percent={week.peakTokens > 0 ? (today.tokens / week.peakTokens) * 100 : 0}
            label="Today vs Peak"
            sublabel={`${formatTokens(today.tokens)} / ${formatTokens(week.peakTokens)} peak`}
            color="hsl(217, 98%, 61%)"
            tooltip={`Peak day this week: ${week.peakDay} with ${week.peakTokens.toLocaleString()} tokens`}
          />

          {/* Sparkline */}
          {dailyTrend.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">7-Day Trend</p>
              <ResponsiveContainer width="100%" height={48}>
                <AreaChart data={dailyTrend} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Week mini stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="Total Tokens" value={formatTokens(week.tokens)} icon="in" />
            <StatMini label="Input" value={formatTokens(week.input)} icon="in" />
            <StatMini label="Output" value={formatTokens(week.output)} icon="out" />
            <StatMini label="Cost" value={formatCost(week.cost)} icon="cost" />
          </div>
        </motion.div>

        {/* ───── Cache Efficiency ───── */}
        {(todayCacheTotal > 0 || weekCacheTotal > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-lg border border-border bg-card p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Cache Efficiency</span>
            </div>

            {todayCacheTotal > 0 && (
              <UsageBar
                percent={todayCacheEfficiency}
                label="Today Cache Hit Rate"
                sublabel={`${todayCacheEfficiency.toFixed(0)}%`}
                color="#22c55e"
                warnAt={999}
                tooltip={`Cache reads: ${today.cacheRead.toLocaleString()} / Cache writes: ${today.cacheCreation.toLocaleString()} — Higher is better (more cache reuse)`}
              />
            )}

            {weekCacheTotal > 0 && (
              <UsageBar
                percent={weekCacheEfficiency}
                label="Weekly Cache Hit Rate"
                sublabel={`${weekCacheEfficiency.toFixed(0)}%`}
                color="#22c55e"
                warnAt={999}
                tooltip={`Cache reads: ${week.cacheRead.toLocaleString()} / Cache writes: ${week.cacheCreation.toLocaleString()}`}
              />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini label="Today Reads" value={formatTokens(today.cacheRead)} icon="in" />
              <StatMini label="Today Writes" value={formatTokens(today.cacheCreation)} icon="out" />
              <StatMini label="Week Reads" value={formatTokens(week.cacheRead)} icon="in" />
              <StatMini label="Week Writes" value={formatTokens(week.cacheCreation)} icon="out" />
            </div>
          </motion.div>
        )}

        {/* ───── Velocity / Pace ───── */}
        {velocity.data && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.17 }}
            className="rounded-lg border border-border bg-card p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Pace</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">vs community</span>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{velocity.data.paceMultiplier}x</p>
                <p className="text-xs text-muted-foreground">{velocity.data.paceLabel}</p>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>You: {formatTokens(velocity.data.userPace)}/day</span>
                  <span>Avg: {formatTokens(velocity.data.globalAvgPace)}/day</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${Math.min(velocity.data.percentile, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">Top {100 - velocity.data.percentile}% of users</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatMini label="Avg Tokens/Day" value={formatTokens(velocity.data.userPace)} icon="in" />
              <StatMini label="Active Days" value={String(velocity.data.userActiveDays)} icon="days" />
            </div>
          </motion.div>
        )}

        {/* ───── Provider Breakdown ───── */}
        {providerBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-lg border border-border bg-card p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Provider Usage (This Week)</span>
            </div>

            <div className="space-y-3">
              {providerBreakdown.map((p) => {
                const config = PROVIDERS[p.provider as Provider];
                const percent = (p.tokens / maxProviderTokens) * 100;
                return (
                  <UsageBar
                    key={p.provider}
                    percent={percent}
                    label={config?.name ?? p.provider}
                    sublabel={`${formatTokens(p.tokens)} tokens  ·  ${formatCost(p.cost)}`}
                    color={config?.color ?? '#888'}
                    warnAt={999}
                    tooltip={`Input: ${p.input.toLocaleString()} · Output: ${p.output.toLocaleString()} · Cache reads: ${p.cacheRead.toLocaleString()}`}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ───── All-Time Summary ───── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">All Time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="Tokens" value={formatTokens(allTime.tokens)} icon="in" />
            <StatMini label="Cost" value={formatCost(allTime.cost)} icon="cost" />
            <StatMini label="Days Active" value={String(allTime.totalDays)} icon="days" />
            <StatMini
              label="Cache Saved"
              value={formatTokens(allTime.cacheRead)}
              icon="in"
            />
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}

/* ── Tiny stat box ── */
function StatMini({ label, value, icon, truncate }: { label: string; value: string; icon: string; truncate?: boolean }) {
  const iconMap: Record<string, typeof Zap> = { in: Zap, out: Flame, cost: TrendingUp, model: Cpu, days: Calendar };
  const Icon = iconMap[icon] ?? Zap;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-md bg-muted/40 px-2.5 py-2 cursor-help">
          <div className="flex items-center gap-1">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
          <p className={`font-mono text-sm font-semibold text-foreground mt-0.5 ${truncate ? 'truncate' : ''}`}>{value}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}: {value}</TooltipContent>
    </Tooltip>
  );
}
