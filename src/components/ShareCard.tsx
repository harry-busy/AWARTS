import { forwardRef } from 'react';
import { formatCost, formatTokens } from '@/lib/format';
import type { Provider, HeatmapDay } from '@/lib/types';
import { PROVIDERS } from '@/lib/constants';

export type ShareTheme = 'midnight' | 'frost' | 'neon';

export interface GradientConfig {
  id: string;
  label: string;
  style: string;
  dark: boolean;
}

interface ShareCardProps {
  username: string;
  avatarUrl: string;
  period: string;
  totalCost: number;
  outputTokens: number;
  streak: number;
  daysActive: number;
  providers: Provider[];
  heatmap: HeatmapDay[];
  theme?: ShareTheme;
  gradient?: GradientConfig;
  sessions?: number;
}

function getPeriodLabel(period: string, providerName: string): string {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `My Week in ${providerName} \u00B7 ${fmt(start)}\u2013${fmt(end)}, ${now.getFullYear()}`;
  }
  if (period === 'month') {
    return `My Month in ${providerName} \u00B7 ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  return `All Time in ${providerName}`;
}

function getDaysInPeriod(period: string): number {
  return period === 'week' ? 7 : period === 'month' ? 30 : 365;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ username, avatarUrl, period, totalCost, outputTokens, streak, daysActive, providers, heatmap, theme, gradient, sessions = 0 }, ref) => {
    const isDark = gradient ? gradient.dark : theme !== 'frost';
    const textColor = isDark ? '#ffffff' : '#1a1a2e';
    const mutedColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    const brandBg = isDark ? '#ffffff' : '#1a1a2e';
    const periodDays = getDaysInPeriod(period);

    // Determine background
    let bgStyle: React.CSSProperties = {};
    if (gradient) {
      bgStyle = { background: gradient.style };
    } else if (theme === 'frost') {
      bgStyle = { background: '#ffffff' };
    } else if (theme === 'neon') {
      bgStyle = { background: 'linear-gradient(135deg, #1a0533, #0d1b3e, #0a2540)' };
    } else {
      bgStyle = { background: 'linear-gradient(135deg, #0f1219, #1a1f2e)' };
    }

    // Find primary provider
    const primaryProvider = providers.length > 0 ? providers[0] : null;
    const primaryProviderName = primaryProvider ? PROVIDERS[primaryProvider]?.name ?? 'AI Coding' : 'AI Coding';
    const periodLabel = getPeriodLabel(period, primaryProviderName);

    const stats = [
      { label: 'OUTPUT', value: formatTokens(outputTokens), emoji: '' },
      { label: 'ACTIVE', value: `${daysActive}/${periodDays}`, unit: 'days', emoji: '' },
      { label: 'SESSIONS', value: String(sessions), emoji: '' },
      { label: 'STREAK', value: String(streak), unit: 'days', emoji: '\uD83D\uDD25' },
    ];

    return (
      <div
        ref={ref}
        className="w-[480px] rounded-2xl p-6 space-y-5"
        style={{
          ...bgStyle,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{
                height: 20,
                width: 12,
                backgroundColor: brandBg,
                clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
              }}
            />
            <span style={{ color: textColor, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>AWARTS</span>
          </div>
          <span style={{ color: mutedColor, fontSize: 10, fontWeight: 500 }}>{periodLabel}</span>
        </div>

        {/* Large spend figure */}
        <div className="text-center space-y-1 py-2">
          <p style={{ color: textColor, fontFamily: 'monospace', fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
            {formatCost(totalCost)}
          </p>
          <p style={{ color: mutedColor, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Total Spend
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center rounded-lg px-2 py-2"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <p style={{ color: mutedColor, fontSize: 9, fontWeight: 600, letterSpacing: '0.08em' }}>{stat.label}</p>
              <p style={{ color: textColor, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {stat.emoji && <span style={{ marginRight: 2 }}>{stat.emoji}</span>}
                {stat.value}
                {stat.unit && <span style={{ color: mutedColor, fontSize: 10, fontWeight: 500, marginLeft: 3 }}>{stat.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Provider color bar */}
        {providers.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              {providers.map((p) => (
                <div
                  key={p}
                  className="h-full"
                  style={{ backgroundColor: PROVIDERS[p]?.color ?? '#888', flex: 1 }}
                />
              ))}
            </div>
            <div className="flex justify-center gap-3">
              {providers.map((p) => (
                <div key={p} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDERS[p]?.color }} />
                  <span style={{ color: mutedColor, fontSize: 9, fontWeight: 500 }}>{PROVIDERS[p]?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, paddingTop: 12 }}>
          <div className="space-y-0.5">
            <span style={{ color: mutedColor, fontSize: 9, fontWeight: 500 }}>Powered by {primaryProviderName}</span>
            <p style={{ color: textColor, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>@{username}</p>
          </div>
          <span style={{ color: mutedColor, fontFamily: 'monospace', fontSize: 10 }}>awarts.club</span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = 'ShareCard';
