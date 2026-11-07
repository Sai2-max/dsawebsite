import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  ListChecks,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { getDueReviews, getReviewStats, getUpcomingReviews } from '../lib/stats';
import { getProblem } from '../lib/dataset';
import {
  addDays,
  formatDateKey,
  formatDateLong,
  formatMonthLabel,
  getMonthGrid,
  getWeekdayLabels,
  parseDateKey,
  relativeDueLabel,
  toDateKey,
} from '../lib/dates';
import { effectiveDueOn, getOpenStage, REVISION_STAGE_LABELS } from '../lib/revision';
import { PageHeader } from '../components/ProblemBits';
import { ReviewCard } from '../components/ProblemCard';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/Progress';
import { cn } from '../lib/utils';
import type { DueReview, Problem, ReviewCycle, ReviewStage } from '../types';

interface CompletedEntry {
  key: string;
  problem: Problem;
  cycle: ReviewCycle;
  stage: ReviewStage;
}

interface DaySchedule {
  due: DueReview[];
  completed: CompletedEntry[];
}

function monthKeyOf(key: string): string {
  return key.slice(0, 7);
}

function shiftMonth(key: string, delta: number): string {
  const date = parseDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + delta, 1, 12));
}

export default function CalendarPage() {
  const { state } = useStore();
  const today = useToday();
  const [monthStart, setMonthStart] = useState(() => `${today.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(today);

  const stats = getReviewStats(state, today);
  const dueReviews = useMemo(() => getDueReviews(state, today), [state, today]);
  const upcoming = getUpcomingReviews(state, today, 8);

  const schedule = useMemo(() => {
    const map = new Map<string, DaySchedule>();
    const ensure = (date: string): DaySchedule => {
      const existing = map.get(date);
      if (existing) return existing;
      const entry: DaySchedule = { due: [], completed: [] };
      map.set(date, entry);
      return entry;
    };

    for (const progress of Object.values(state.progress)) {
      const problem = getProblem(progress.problemId);
      if (!problem) continue;
      const activeCycle = [...progress.cycles].reverse().find((cycle) => !cycle.archivedOn);

      if (activeCycle) {
        const openStage = getOpenStage(activeCycle);
        if (openStage) {
          const dueOn = effectiveDueOn(openStage);
          ensure(dueOn).due.push({
            problemId: progress.problemId,
            cycle: activeCycle,
            stage: openStage,
            dueOn,
            overdueDays: Math.max(0, Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${dueOn}T12:00:00`)) / 86_400_000)),
            urgency: dueOn < today ? 'overdue' : dueOn === today ? 'today' : 'upcoming',
          });
        }
      }

      for (const cycle of progress.cycles) {
        for (const stage of cycle.stages) {
          if (!stage.completedOn) continue;
          ensure(stage.completedOn).completed.push({
            key: `${cycle.id}-${stage.stage}-${problem.id}`,
            problem,
            cycle,
            stage,
          });
        }
      }
    }
    return map;
  }, [state.progress, today]);

  const grid = useMemo(
    () => getMonthGrid(parseDateKey(monthStart).getFullYear(), parseDateKey(monthStart).getMonth(), state.settings.weekStartsOn),
    [monthStart, state.settings.weekStartsOn],
  );

  const monthStats = useMemo(() => {
    let due = 0;
    let overdue = 0;
    let completed = 0;
    for (const [date, day] of schedule) {
      if (!date.startsWith(monthKeyOf(monthStart))) continue;
      due += day.due.length;
      completed += day.completed.length;
      overdue += day.due.filter((review) => review.urgency === 'overdue').length;
    }
    return { due, overdue, completed };
  }, [schedule, monthStart]);

  const selectedDay = schedule.get(selected) ?? { due: [], completed: [] };
  const selectedDate = parseDateKey(selected);
  const canGoBack = monthStart > '2000-01-01';

  const goToMonth = (delta: number) => {
    const next = shiftMonth(monthStart, delta);
    setMonthStart(next);
    const currentMonth = today.slice(0, 7);
    setSelected(next.slice(0, 7) === currentMonth ? today : next);
  };

  const jumpToToday = () => {
    setMonthStart(`${today.slice(0, 7)}-01`);
    setSelected(today);
  };

  const selectDate = (date: string) => {
    setSelected(date);
    if (monthKeyOf(date) !== monthKeyOf(monthStart)) setMonthStart(`${monthKeyOf(date)}-01`);
  };

  const monthDays = grid.filter((date) => monthKeyOf(date) === monthKeyOf(monthStart));
  const leadingDays = grid.indexOf(monthDays[0] ?? grid[0]);
  const nextDue = dueReviews[0] ?? upcoming[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Fixed intervals · local calendar dates"
        title="Revision Calendar"
        description="Every solve opens fixed Day 1, Day 3, Day 7 and Day 30 checkpoints. A missed review remains overdue until you complete it or explicitly snooze it. Completing a review never shifts the later dates."
        actions={
          <>
            <Badge tone={stats.overdue ? 'bad' : stats.dueToday ? 'warn' : 'good'} dot>
              {stats.overdue ? `${stats.overdue} overdue` : stats.dueToday ? `${stats.dueToday} due today` : 'Nothing overdue'}
            </Badge>
            <Button variant="secondary" onClick={jumpToToday} icon={<CalendarDays className="h-4 w-4" />}>
              Today
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CalendarStat label="Due now" value={stats.due} sub={`${stats.overdue} overdue · ${stats.dueToday} today`} tone={stats.overdue ? 'bad' : 'warn'} icon={<Clock3 className="h-4 w-4" />} />
        <CalendarStat label="Upcoming" value={stats.upcoming} sub="Scheduled after today" tone="brand" icon={<CalendarClock className="h-4 w-4" />} />
        <CalendarStat label="Stages complete" value={stats.completed} sub={`${stats.completionRate}% of reached stages`} tone="good" icon={<CheckCircle2 className="h-4 w-4" />} />
        <CalendarStat label="This month" value={monthStats.due} sub={`${monthStats.completed} completed · ${monthStats.overdue} overdue`} tone="violet" icon={<History className="h-4 w-4" />} />
      </section>

      {dueReviews.length ? (
        <section className="rounded-xl2 border border-warn/25 bg-warn/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
                <CircleAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {stats.overdue ? `${stats.overdue} overdue review${stats.overdue === 1 ? '' : 's'}` : `${stats.dueToday} review${stats.dueToday === 1 ? '' : 's'} due today`}
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted">
                  {nextDue ? `Next: #${getProblem(nextDue.problemId)?.number ?? '?'} ${getProblem(nextDue.problemId)?.title ?? ''} · ${relativeDueLabel(nextDue.dueOn, today)}.` : 'Complete or snooze the items below.'}
                </p>
              </div>
            </div>
            <Link to="/today" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80">
              Open today's plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {dueReviews.slice(0, 4).map((review) => (
              <ReviewCard key={`${review.problemId}-${review.cycle.id}-${review.stage.stage}`} review={review} />
            ))}
          </div>
          {dueReviews.length > 4 ? (
            <p className="mt-3 text-[10.5px] text-faint">Plus {dueReviews.length - 4} more due review{dueReviews.length - 4 === 1 ? '' : 's'}. The selected day and today's plan show the rest.</p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div>
              <p className="eyebrow">Month view</p>
              <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-ink">
                {formatMonthLabel(selectedDate.getFullYear(), selectedDate.getMonth())}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <IconButton label="Previous month" onClick={() => goToMonth(-1)} disabled={!canGoBack}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <Button variant="secondary" size="sm" onClick={jumpToToday}>Today</Button>
              <IconButton label="Next month" onClick={() => goToMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          <div className="px-3 pb-4 pt-3 sm:px-4">
            <div className="mb-1.5 grid grid-cols-7 gap-1">
              {getWeekdayLabels(state.settings.weekStartsOn).map((label) => (
                <div key={label} className="py-1 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-faint">
                  {label.slice(0, 2)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingDays }, (_, index) => (
                <div key={`lead-${index}`} className="aspect-square rounded-lg bg-canvas/20" />
              ))}
              {monthDays.map((date) => {
                const day = schedule.get(date);
                const dueCount = day?.due.length ?? 0;
                const doneCount = day?.completed.length ?? 0;
                const isToday = date === today;
                const isSelected = date === selected;
                const hasOverdue = (day?.due ?? []).some((review) => review.urgency === 'overdue');
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={cn(
                      'group relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition sm:aspect-auto sm:min-h-[74px] sm:items-stretch sm:justify-start sm:p-2',
                      isSelected
                        ? 'border-brand/60 bg-brand/10 ring-1 ring-brand/25'
                        : 'border-transparent bg-elevated/35 hover:border-line hover:bg-elevated/70',
                      isToday && !isSelected && 'border-brand/30 bg-brand/[0.04]',
                    )}
                    aria-pressed={isSelected}
                    aria-label={`${formatDateLong(date)}${dueCount ? `, ${dueCount} due` : ''}${doneCount ? `, ${doneCount} completed` : ''}`}
                  >
                    <span className={cn('text-[11px] font-semibold tabular-nums sm:self-start sm:text-[10px]', isToday ? 'text-brand' : 'text-muted')}>
                      {Number(date.slice(8, 10))}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5 sm:mt-auto sm:justify-start">
                      {dueCount ? (
                        <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold sm:px-1.5 sm:text-[9px]', hasOverdue ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn')}>
                          <Clock3 className="h-2 w-2" />{dueCount}
                        </span>
                      ) : null}
                      {doneCount ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-good/15 px-1 py-0.5 text-[8px] font-bold text-good sm:px-1.5 sm:text-[9px]">
                          <CheckCircle2 className="h-2 w-2" />{doneCount}
                        </span>
                      ) : null}
                      {isToday ? <span className="hidden text-[8px] font-bold uppercase tracking-wider text-brand sm:inline">today</span> : null}
                    </span>
                  </button>
                );
              })}
              {Array.from({ length: Math.max(0, 42 - leadingDays - monthDays.length) }, (_, index) => (
                <div key={`trail-${index}`} className="aspect-square rounded-lg bg-canvas/20" />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line/60 pt-3 text-[9.5px] text-faint">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" /> Review due</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" /> Overdue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good" /> Completed</span>
              <span className="ml-auto hidden sm:inline">Click a date to inspect it</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Selected day</p>
                <h2 className="mt-0.5 font-display text-base font-semibold text-ink">{formatDateKey(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              </div>
              <Badge tone={selected === today ? 'brand' : 'neutral'}>{selected === today ? 'Today' : selected < today ? 'Past' : 'Ahead'}</Badge>
            </div>

            {selectedDay.due.length || selectedDay.completed.length ? (
              <div className="mt-4 space-y-3">
                {selectedDay.due.length ? (
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-warn"><ListChecks className="h-3.5 w-3.5" /> Due {selectedDay.due.length}</p>
                    <div className="mt-2 grid gap-3">
                      {selectedDay.due.map((review) => (
                        <ReviewCard key={`${review.problemId}-${review.cycle.id}-${review.stage.stage}-selected`} review={review} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedDay.completed.length ? (
                  <div className={cn(selectedDay.due.length && 'border-t border-line/60 pt-3')}>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-good"><CheckCircle2 className="h-3.5 w-3.5" /> Completed {selectedDay.completed.length}</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedDay.completed.map((entry) => (
                        <Link key={entry.key} to={`/problem/${entry.problem.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-elevated/40 px-2.5 py-2 text-[11px] text-ink transition hover:border-good/30">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-good" />
                          <span className="min-w-0 flex-1 truncate">#{entry.problem.number} {entry.problem.title}</span>
                          <span className="shrink-0 text-[9px] text-faint">{REVISION_STAGE_LABELS[entry.stage.stage - 1]} · C{entry.cycle.cycleNumber}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3">
                <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nothing scheduled" description={selected === today ? 'No revisions due today. Solve a problem to schedule the next checkpoint.' : 'No due or completed reviews on this date.'} className="py-7" />
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Next checkpoints</p>
                <h2 className="mt-0.5 font-display text-base font-semibold text-ink">Upcoming</h2>
              </div>
              <Badge tone="brand">{upcoming.length}</Badge>
            </div>
            {upcoming.length ? (
              <div className="mt-3 space-y-1.5">
                {upcoming.slice(0, 6).map((review) => {
                  const problem = getProblem(review.problemId);
                  if (!problem) return null;
                  return (
                    <Link key={`${review.problemId}-${review.stage.stage}-upcoming`} to={`/problem/${problem.id}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-elevated/35 px-2.5 py-2 text-[11px] transition hover:border-brand/30">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-[9px] font-bold text-brand">{review.stage.stage}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">#{problem.number} {problem.title}</span>
                        <span className="block text-[9px] text-faint">{REVISION_STAGE_LABELS[review.stage.stage - 1]} · {relativeDueLabel(review.dueOn, today)}</span>
                      </span>
                      <ChevronRight className="h-3 w-3 shrink-0 text-faint" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-5 text-center text-[10.5px] leading-5 text-faint">
                No upcoming reviews. Solving starts a cycle with Day 1 due tomorrow.
              </p>
            )}
          </div>

          <div className="card p-5">
            <p className="eyebrow">Stage completion</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-display text-2xl font-semibold tabular-nums text-ink">{stats.completionRate}%</span>
              <span className="text-[10px] text-faint">{stats.completed}/{stats.reached || 0} reached</span>
            </div>
            <ProgressBar value={stats.completed} max={Math.max(1, stats.reached)} className="mt-2" tone="good" />
            <p className="mt-3 text-[10px] leading-5 text-faint">
              Only stages whose due date has arrived are counted in the denominator. Future checkpoints do not reduce your completion rate.
            </p>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Next open stage per active cycle</p>
            <h2 className="mt-0.5 font-display text-base font-semibold text-ink">How the calendar reads</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => selectDate(nextDue?.dueOn ?? addDays(today, 1))} disabled={!nextDue} icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Next checkpoint
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-[10.5px] leading-5 text-faint sm:grid-cols-3">
          <p className="rounded-lg border border-line bg-canvas/30 p-3"><span className="font-semibold text-ink">One active stage.</span> Each solve cycle shows its next incomplete stage. Completed stages remain in history.</p>
          <p className="rounded-lg border border-line bg-canvas/30 p-3"><span className="font-semibold text-ink">Dates never drift.</span> Day 1/3/7/30 are fixed from the solve date. A late review does not move later checkpoints.</p>
          <p className="rounded-lg border border-line bg-canvas/30 p-3"><span className="font-semibold text-ink">Snooze is explicit.</span> Moving a review writes a snooze record and a new effective date; the original due date stays visible.</p>
        </div>
      </section>
    </div>
  );
}

function CalendarStat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  tone: 'brand' | 'good' | 'warn' | 'bad' | 'violet';
  icon: React.ReactNode;
}) {
  const toneClasses = {
    brand: 'border-brand/20 bg-brand/10 text-brand',
    good: 'border-good/20 bg-good/10 text-good',
    warn: 'border-warn/20 bg-warn/10 text-warn',
    bad: 'border-bad/20 bg-bad/10 text-bad',
    violet: 'border-violet/20 bg-violet/10 text-violet',
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', toneClasses[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-ink">{value}</p>
        <p className="mt-1.5 text-[10px] text-muted">{sub}</p>
      </div>
    </div>
  );
}
