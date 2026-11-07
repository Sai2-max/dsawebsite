import type { AppState } from '../../types';
import { useStore, useToday } from '../../store/StoreContext';
import { getHeatmap, getWeeklyActivity } from '../../lib/stats';
import { cn } from '../../lib/utils';
import { formatDateKey, formatMinutes, getWeekdayLabels } from '../../lib/dates';

const levelClasses = [
  'bg-line/35',
  'bg-brand/25',
  'bg-brand/45',
  'bg-brand/70',
  'bg-brand',
];

export function ActivityHeatmap({
  state,
  weeks = 26,
  className,
}: {
  state: AppState;
  weeks?: number;
  className?: string;
}) {
  const today = useToday();
  const cells = getHeatmap(state, today, weeks, state.settings.weekStartsOn);
  const weekChunks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  const weekdayLabels = getWeekdayLabels(state.settings.weekStartsOn);
  const monthLabels = weekChunks.map((week, index) => {
    const first = week[0];
    const previous = index > 0 ? weekChunks[index - 1][0] : undefined;
    const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${first.date}T12:00:00`));
    const previousMonth = previous
      ? new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${previous.date}T12:00:00`))
      : '';
    return month !== previousMonth ? month : '';
  });

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="w-full max-w-full overflow-x-auto pb-1 scrollbar-none">
        <div className="min-w-[660px]">
          <div className="mb-1.5 flex pl-7">
            {monthLabels.map((label, index) => (
              <div key={index} className="w-[17px] shrink-0 text-[9px] font-medium text-faint">
                {label}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <div className="flex w-5 shrink-0 flex-col gap-[3px] pt-0.5">
              {weekdayLabels.map((label, index) => (
                <div key={`${label}-${index}`} className="flex h-[14px] items-center text-[8px] font-medium text-faint">
                  {index % 2 === 1 ? label.slice(0, 1) : ''}
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weekChunks.map((week, weekIndex) => (
                <div key={week[0]?.date ?? weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      className={cn(
                        'h-[14px] w-[14px] rounded-[3px] transition hover:ring-1 hover:ring-brand/60',
                        cell.future ? 'bg-line/10' : levelClasses[cell.level],
                      )}
                      title={`${formatDateKey(cell.date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${cell.count} ${cell.count === 1 ? 'activity' : 'activities'}${cell.minutes ? ` · ${formatMinutes(cell.minutes)}` : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-faint">
        <span>Less</span>
        {levelClasses.map((level, index) => (
          <span key={index} className={cn('h-[10px] w-[10px] rounded-[2px]', level)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function SparkBars({
  state,
  days = 14,
  className,
}: {
  state: AppState;
  days?: number;
  className?: string;
}) {
  const today = useToday();
  const data = getWeeklyActivity(state, today, days);
  const max = Math.max(1, ...data.map((day) => day.count));
  return (
    <div className={cn('flex h-36 items-end gap-1.5 sm:gap-2', className)}>
      {data.map((day) => (
        <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="relative flex h-28 w-full items-end justify-center">
            <div
              className={cn(
                'w-full max-w-7 rounded-t-md transition-all duration-500',
                day.count === 0
                  ? 'h-1 bg-line/50'
                  : day.count >= max
                    ? 'bg-gradient-to-t from-brand to-cyan'
                    : 'bg-gradient-to-t from-brand/70 to-brand/35 group-hover:from-brand group-hover:to-cyan',
              )}
              style={{ height: day.count === 0 ? 4 : `${Math.max(10, (day.count / max) * 100)}%` }}
              title={`${formatDateKey(day.date, { month: 'short', day: 'numeric' })} · ${day.count} activities · ${formatMinutes(day.minutes)}`}
            />
            {day.count > 0 ? (
              <span className="absolute -top-4 text-[9px] font-semibold text-muted">{day.count}</span>
            ) : null}
          </div>
          <span className="text-[9px] font-medium text-faint">{day.label.slice(0, 2)}</span>
        </div>
      ))}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function StatusDonut({
  segments,
  centerValue,
  centerLabel,
  className,
}: {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = cursor;
      cursor += (segment.value / total) * 100;
      return `${segment.color} ${start}% ${cursor}%`;
    });
  const background = total === 0 ? 'rgb(var(--line))' : `conic-gradient(${stops.join(', ')})`;
  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row', className)}>
      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background }}>
        <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full border border-line bg-surface">
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">{centerValue}</span>
          <span className="px-2 text-center text-[9px] uppercase tracking-[0.12em] text-faint">{centerLabel}</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="flex-1 text-muted">{segment.label}</span>
            <span className="font-mono text-[10px] text-faint">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'brand',
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'brand' | 'good' | 'warn' | 'violet' | 'cyan';
  className?: string;
}) {
  const toneClasses = {
    brand: 'border-brand/20 bg-brand/10 text-brand',
    good: 'border-good/20 bg-good/10 text-good',
    warn: 'border-warn/20 bg-warn/10 text-warn',
    violet: 'border-violet/20 bg-violet/10 text-violet',
    cyan: 'border-cyan/20 bg-cyan/10 text-cyan',
  };
  return (
    <div className={cn('card flex items-start gap-3 p-4 sm:p-5', className)}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', toneClasses[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-none tracking-tight text-ink">{value}</p>
        {sub ? <p className="mt-1.5 text-[10.5px] text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

export function useDashboardData() {
  const { state } = useStore();
  const today = useToday();
  return { state, today };
}
