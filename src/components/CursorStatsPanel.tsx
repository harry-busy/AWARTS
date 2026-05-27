import { Component, type ReactNode } from 'react';
import { useCursorDetails } from '@/hooks/use-api';
import { formatCost, formatTokens } from '@/lib/format';
import { PROVIDERS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import type { ElementType } from 'react';
import { Zap, Cpu, Bot, CreditCard, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/** Error boundary that silently hides the Cursor panel on crash */
class CursorPanelBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function CursorStatsPanel() {
  return (
    <CursorPanelBoundary>
      <CursorStatsPanelInner />
    </CursorPanelBoundary>
  );
}

function CursorStatsPanelInner() {
  const { data, isLoading } = useCursorDetails();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const accent = PROVIDERS.cursor?.color ?? '#06B6D4';

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="text-sm font-semibold text-foreground">Cursor IDE</h2>
        {data.subscription && (
          <span className="text-[10px] uppercase tracking-wider rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {data.subscription}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Zap} label="Today" value={formatTokens(data.today.tokens)} sub={formatCost(data.today.cost)} />
        <MiniStat icon={Activity} label="This week" value={formatTokens(data.week.tokens)} sub={formatCost(data.week.cost)} />
        <MiniStat icon={Cpu} label="All time" value={formatTokens(data.allTime.tokens)} sub={`${data.activeDays}d active`} />
        <MiniStat
          icon={CreditCard}
          label="Plan"
          value={data.plan_amount_usd != null ? `$${data.plan_amount_usd}/mo` : '—'}
          sub="estimated"
        />
      </div>

      {data.dailyTrend.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">7-day tokens</p>
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={data.dailyTrend}>
              <Area
                type="monotone"
                dataKey="tokens"
                stroke={accent}
                fill={accent}
                fillOpacity={0.12}
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.models.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" /> Models
          </p>
          <ul className="space-y-1">
            {data.models.slice(0, 6).map((m) => (
              <li key={m.model} className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono truncate max-w-[60%]">{m.model}</span>
                <span className="text-foreground font-mono">{formatTokens(m.tokens)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.agents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" /> Agents & modes
          </p>
          <div className="flex flex-wrap gap-2">
            {data.agents.map((a) => (
              <span
                key={a.name}
                className="text-xs rounded-full border border-border px-2.5 py-1 bg-muted/40 font-mono"
              >
                {a.name} · {a.runs}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Sync Cursor via{' '}
        <code className="bg-muted px-1 rounded">npx awarts sync</code>, the Cursor extension, or MCP{' '}
        <code className="bg-muted px-1 rounded">awarts_submit_usage</code>.
      </p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="font-mono text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

