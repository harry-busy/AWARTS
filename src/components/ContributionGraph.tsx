import { HeatmapDay, Provider } from '@/lib/types';
import { PROVIDERS } from '@/lib/constants';
import { formatCost } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ContributionGraphProps {
  data: HeatmapDay[];
}

const PROVIDER_HSL: Record<Provider, string> = {
  claude: '24, 95%, 53%',
  codex: '142, 71%, 45%',
  gemini: '217, 91%, 60%',
  antigravity: '270, 91%, 65%',
  cursor: '188, 94%, 43%',
};

const INTENSITY_OPACITY: Record<number, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
};

function getCellStyle(day: HeatmapDay): React.CSSProperties {
  if (day.intensity === 0) return {};
  const hsl = day.dominantProvider ? PROVIDER_HSL[day.dominantProvider] : '18, 82%, 50%';
  const opacity = INTENSITY_OPACITY[day.intensity] ?? 0;
  return { backgroundColor: `hsl(${hsl} / ${opacity})` };
}

export function ContributionGraph({ data }: ContributionGraphProps) {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'h-3 w-3 rounded-[2px] transition-colors',
                        day.intensity === 0 && 'bg-muted/30'
                      )}
                      style={getCellStyle(day)}
                      aria-label={`${day.date}: ${day.spend ? formatCost(day.spend) : 'No activity'}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-semibold">{day.date}</p>
                    {day.spend > 0 ? (
                      <>
                        <p>{formatCost(day.spend)}</p>
                        <p className="text-muted-foreground">{day.dominantProvider && PROVIDERS[day.dominantProvider].name}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No activity</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Less</span>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: `hsl(var(--primary) / ${i * 0.2 + 0.1})` }} />
        ))}
        <span>More</span>
        <span className="ml-4">Color = dominant provider</span>
      </div>
    </div>
  );
}
