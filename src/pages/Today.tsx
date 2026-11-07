import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Minus,
  Plus,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { getStreak, getTodayPlan } from '../lib/stats';
import { dataset, getProblem, problems } from '../lib/dataset';
import { formatDateLong, formatMinutes } from '../lib/dates';
import { ProblemCard, ReviewCard } from '../components/ProblemCard';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

export default function TodayPage() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const today = useToday();
  const plan = getTodayPlan(state, today);
  const streak = getStreak(state, today);
  const solvedToday = plan.solvedToday;
  const reviewEvents = state.events.filter((event) => event.type === 'review' && event.date === today);
  const onDeck = plan.onDeck.slice(0, 3);

  const changeTarget = (delta: number) => {
    const next = Math.min(15, Math.max(1, state.settings.dailyTarget + delta));
    if (next === state.settings.dailyTarget) return;
    dispatch({ type: 'UPDATE_SETTINGS', patch: { dailyTarget: next } });
    toast(`Daily new target set to ${next}.`, 'success');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow={formatDateLong(today)}
        title="Today's plan"
        description="Overdue revisions first, then the next unique problems in PDF order. Your target is a floor, not a race."
        actions={
          <>
            <Badge tone={streak.activeToday ? 'good' : 'neutral'} dot>{streak.current} day streak</Badge>
            <Link
              to="/calendar"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
            >
              <CalendarClock className="h-3.5 w-3.5 text-brand" /> Calendar
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="card relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow">Daily target</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-display text-4xl font-semibold leading-none tabular-nums text-ink">{plan.rowsSolvedToday}</span>
                <span className="pb-1 text-sm text-faint">/ {plan.target} solved today</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {plan.rowsSolvedToday >= plan.target
                  ? 'Daily target complete. Keep the reviews moving or go beyond the target.'
                  : `${plan.introduced} of ${plan.target} introduced · ${plan.newQueue.length} still unchecked on the plan. Rows pull in PDF order; duplicate twins share one slot, and unchecking a row puts it back on the plan.`}
              </p>
              <div className="mt-4 inline-flex items-center rounded-xl border border-line bg-canvas/40 p-1">
                <button
                  type="button"
                  onClick={() => changeTarget(-1)}
                  disabled={state.settings.dailyTarget <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink disabled:opacity-30"
                  aria-label="Decrease daily target"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-20 text-center text-[11px] font-semibold text-ink">{state.settings.dailyTarget} per day</span>
                <button
                  type="button"
                  onClick={() => changeTarget(1)}
                  disabled={state.settings.dailyTarget >= 15}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink disabled:opacity-30"
                  aria-label="Increase daily target"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <ProgressRing value={plan.rowsSolvedToday} max={plan.target} size={104} stroke={7}>
                <span className="font-display text-xl font-semibold tabular-nums text-ink">{plan.progressPercent}%</span>
                <span className="text-[8px] uppercase tracking-[0.12em] text-faint">of target</span>
              </ProgressRing>
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-line/70 pt-4 sm:grid-cols-4">
            <TodayMetric label="Reviews due" value={String(plan.reviewsDue.length)} tone={plan.overdueReviews.length ? 'warn' : 'brand'} />
            <TodayMetric label="In progress" value={String(plan.inProgress.length)} tone="violet" />
            <TodayMetric label="Focused today" value={formatMinutes(plan.studyMinutes)} tone="cyan" />
            <TodayMetric label="Solved today" value={String(plan.rowsSolvedToday)} tone="good" />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Signal</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink">Queue health</h2>
            </div>
            <Badge tone={plan.overdueReviews.length ? 'bad' : plan.reviewsDue.length ? 'warn' : 'good'} dot>
              {plan.overdueReviews.length ? 'Needs attention' : plan.reviewsDue.length ? 'Reviews ready' : 'Stable'}
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            <HealthRow label="Overdue" value={plan.overdueReviews.length} max={Math.max(1, plan.reviewsDue.length)} tone="bad" />
            <HealthRow label="Due today" value={plan.reviewsDue.length - plan.overdueReviews.length} max={Math.max(1, plan.reviewsDue.length)} tone="warn" />
            <HealthRow label="New slots open" value={plan.slotsRemaining} max={Math.max(1, state.settings.dailyTarget)} tone="brand" />
            <HealthRow label="Practice queue" value={plan.needsPractice.length} max={Math.max(1, plan.inProgress.length)} tone="violet" />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3 text-[10.5px] leading-5 text-faint">
            <span className="flex items-center gap-1.5 font-semibold text-muted"><Target className="h-3.5 w-3.5 text-brand" /> PDF order, unique first</span>
            <p className="mt-1">Duplicate titles/URLs remain in the library for fidelity, but the daily queue does not count them twice.</p>
          </div>
        </div>
      </section>

      {plan.overdueReviews.length ? (
        <section className="rounded-xl2 border border-bad/25 bg-bad/5 p-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bad/25 bg-bad/10 text-bad">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{plan.overdueReviews.length} overdue revision{plan.overdueReviews.length === 1 ? '' : 's'} still waiting</p>
              <p className="mt-0.5 text-[11px] leading-5 text-muted">Overdue items stay overdue until you mark them reviewed or explicitly snooze them. They are not rolled into today automatically.</p>
            </div>
          </div>
          <Link to="/calendar" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-bad sm:mt-0">Open calendar <ArrowRight className="h-3.5 w-3.5" /></Link>
        </section>
      ) : null}

      {plan.reviewsDue.length ? (
        <section>
          <SectionHeading
            eyebrow="Revisions"
            title={`Due now (${plan.reviewsDue.length})`}
            description="Mark reviewed to advance to the next fixed stage. Snooze only if you need a different date."
            action={<Badge tone={plan.overdueReviews.length ? 'bad' : 'warn'} dot>{plan.overdueReviews.length ? `${plan.overdueReviews.length} overdue` : 'Due today'}</Badge>}
          />
          <div className="mt-3 grid gap-3">
            {plan.reviewsDue.map((review) => <ReviewCard key={`${review.problemId}-${review.cycle.id}-${review.stage.stage}`} review={review} />)}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading
          eyebrow="PDF order"
          title={`New problems (${plan.newQueue.length})`}
          description="The next untouched unique rows in PDF order. Solving starts a Day 1 / 3 / 7 / 30 revision cycle; unchecking a row you ticked today puts it right back here."
          action={plan.rowsSolvedToday >= plan.target ? <Badge tone="good" dot>Target complete</Badge> : <Badge tone="brand" dot>{Math.max(0, plan.target - plan.rowsSolvedToday)} to go</Badge>}
        />
        {plan.newQueue.length ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {plan.newQueue.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
          </div>
        ) : (
          <div className="mt-3 card">
            <EmptyState
              icon={plan.targetMet ? <CheckCircle2 className="h-5 w-5 text-good" /> : <Sparkles className="h-5 w-5" />}
              title={plan.targetMet ? 'Daily new target complete' : 'No new problems in the queue'}
              description={plan.targetMet ? 'You can stop here, continue a practice problem, or start the next row if you want more. The target is configurable above.' : 'All new rows are introduced, skipped, or the queue is empty. Browse the library to choose intentionally.'}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link to="/library" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-elevated px-3 text-xs font-semibold text-ink hover:border-brand/40">Open library <ChevronRight className="h-3.5 w-3.5" /></Link>
                  {plan.onDeck.length ? <span className="text-[11px] text-faint">Next: #{plan.onDeck[0].number} {plan.onDeck[0].title}</span> : null}
                </div>
              }
              className="py-9"
            />
          </div>
        )}
      </section>

      {plan.inProgress.length ? (
        <section>
          <SectionHeading
            eyebrow="Continue"
            title={`In progress (${plan.inProgress.length})`}
            description="Attempted and needs-practice problems from other days that you haven't solved yet. Rows you log or uncheck today are shown in the plan above."
            action={<Badge tone="violet" dot>{plan.needsPractice.length} need practice</Badge>}
          />
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {plan.inProgress.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} compact={false} showCompanies={false} />
            ))}
          </div>
        </section>
      ) : null}

      {(plan.targetMet && onDeck.length) || (!plan.newQueue.length && onDeck.length) ? (
        <section>
          <SectionHeading eyebrow="On deck" title="Next unique rows" description="A preview of what the queue will surface next. Starting one early is fine." />
          <div className="mt-3 card divide-y divide-line/60">
            {onDeck.map((problem) => (
              <Link key={problem.id} to={`/problem/${problem.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-elevated/40">
                <span className="font-mono text-[10px] text-faint">{problem.numberText}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{problem.title}</p>
                  <p className="text-[10px] text-faint">{problem.topic} / {problem.subtopic}</p>
                </div>
                <Badge>{problem.platform}</Badge>
                <ChevronRight className="h-3.5 w-3.5 text-faint" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Completed today</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink">Wins log</h2>
            </div>
            <Badge tone="good">{solvedToday.length + reviewEvents.length}</Badge>
          </div>
          {solvedToday.length || reviewEvents.length ? (
            <div className="mt-3 space-y-2">
              {solvedToday.map((problem) => (
                <Link key={problem.id} to={`/problem/${problem.id}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-elevated/40 px-3 py-2 text-xs text-ink transition hover:border-good/30">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-good" />
                  <span className="min-w-0 flex-1 truncate">#{problem.number} {problem.title}</span>
                  <span className="text-[10px] text-good">solved</span>
                </Link>
              ))}
              {reviewEvents.map((event) => {
                const problem = event.problemId ? getProblem(event.problemId) : undefined;
                return problem ? (
                  <div key={event.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-elevated/40 px-3 py-2 text-xs text-ink">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-violet" />
                    <span className="min-w-0 flex-1 truncate">#{problem.number} {problem.title}</span>
                    <span className="text-[10px] text-violet">reviewed</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11px] text-faint">No solves or completed reviews yet today. The first one is the hardest.</p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Watchlist</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink">Needs another pass</h2>
            </div>
            <Link to="/library?status=needs_practice" className="text-[11px] font-semibold text-brand">Library filter</Link>
          </div>
          {plan.needsPractice.length ? (
            <div className="mt-3 space-y-2">
              {plan.needsPractice.slice(0, 4).map((problem) => (
                <Link key={problem.id} to={`/problem/${problem.id}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-elevated/40 px-3 py-2 text-xs text-ink transition hover:border-warn/30">
                  <CircleDashed className="h-3.5 w-3.5 shrink-0 text-warn" />
                  <span className="min-w-0 flex-1 truncate">#{problem.number} {problem.title}</span>
                  <span className="text-[10px] text-warn">practice</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11px] text-faint">Nothing flagged. Use “Practice” on a card when a solution does not stick.</p>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-canvas/40 px-3 py-2.5 text-[10.5px] text-faint">
            <Timer className="h-3.5 w-3.5 text-brand" />
            Timers log elapsed time into your attempt history and analytics.
          </div>
        </div>
      </section>

      <p className="text-center text-[10px] text-faint">
        {dataset.meta.totalProblems} source rows · {dataset.meta.uniqueProblems} unique problems · {problems.length} library records
      </p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-[11px] leading-5 text-faint">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function TodayMetric({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'warn' | 'violet' | 'cyan' | 'good' }) {
  const colors = {
    brand: 'text-brand',
    warn: 'text-warn',
    violet: 'text-violet',
    cyan: 'text-cyan',
    good: 'text-good',
  };
  return (
    <div>
      <p className={cn('font-display text-lg font-semibold tabular-nums', colors[tone])}>{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-faint">{label}</p>
    </div>
  );
}

function HealthRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'bad' | 'warn' | 'brand' | 'violet' }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-faint">{value}</span>
      </div>
      <ProgressBar value={value} max={max} height="h-1" className="mt-1" tone={tone} />
    </div>
  );
}
