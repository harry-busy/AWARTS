import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PROVIDERS } from '@/lib/constants';
import { formatCost } from '@/lib/format';

interface ProviderData {
  provider: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  days: number;
}

interface ProviderPieChartProps {
  data: ProviderData[];
}

const chartConfig: ChartConfig = {
  claude: { label: 'Claude', color: PROVIDERS.claude.color },
  codex: { label: 'Codex', color: PROVIDERS.codex.color },
  gemini: { label: 'Gemini', color: PROVIDERS.gemini.color },
  antigravity: { label: 'Antigravity', color: PROVIDERS.antigravity.color },
  cursor: { label: 'Cursor', color: PROVIDERS.cursor.color },
};

export function ProviderPieChart({ data }: ProviderPieChartProps) {
  if (data.length === 0) return null;

  const totalCost = data.reduce((s, d) => s + d.cost, 0);

  const pieData = data
    .filter((d) => d.cost > 0)
    .map((d) => ({
      name: PROVIDERS[d.provider as keyof typeof PROVIDERS]?.name ?? d.provider,
      value: d.cost,
      provider: d.provider,
      fill: PROVIDERS[d.provider as keyof typeof PROVIDERS]?.color ?? '#888',
      percent: totalCost > 0 ? ((d.cost / totalCost) * 100).toFixed(1) : '0',
    }));

  return (
    <div className="flex items-center gap-6">
      <ChartContainer config={chartConfig} className="aspect-square w-[160px] shrink-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="font-mono">{formatCost(Number(value))}</span>
                )}
              />
            }
          />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            strokeWidth={0}
          >
            {pieData.map((entry) => (
              <Cell key={entry.provider} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-2 flex-1 min-w-0">
        {pieData.map((d) => (
          <div key={d.provider} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            <span className="text-foreground font-medium truncate">{d.name}</span>
            <span className="ml-auto font-mono text-muted-foreground text-xs">
              {d.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
