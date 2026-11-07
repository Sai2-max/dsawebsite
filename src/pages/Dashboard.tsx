import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Layers3,
  ListTodo,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import {
  getRecentActivity,
  getReviewStats,
  getSolvedRows,
  getSolvedUniqueCount,
  getStatusCounts,
  getStreak,
  getStudySeconds,
  getTodayPlan,
  getTopicStats,
  getUpcomingReviews,
} from '../lib/stats';
import { dataset, getProblem } from '../lib/dataset';
import { formatDateKey, formatMinutes, relativeDueLabel } from '../lib/dates';
import { ActivityHeatmap, SparkBars, StatCard, StatusDonut } from '../components/charts/Charts';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { TimerControls } from '../components/Timer';
import { SolvedCheckbox } from '../components/SolvedCheckbox';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const today = useToday();
  const plan = getTodayPlan(state, today);
  const status = getStatusCounts(state);
  const solvedUnique = getSolvedUniqueCount(state);
  const solvedRows = getSolvedRows(state);
  const reviewStats = getReviewStats(state, today);
  const streak = getStreak(state, today);
  const studyMinutes = getStudySeconds(state) / 60;
  const topicStats = getTopicStats(state, today);
  const recent = getRecentActivity(state, 6);
  const upcoming = getUpcomingReviews(state, today, 2);
  const focusReviews = plan.reviewsDue.slice(0, 2);
  const focusNew = plan.newQueue.slice(0, 2);
  const focusContinue = plan.inProgress.slice(0, 1);
  const remainingTopics = topicStats.filter((topic) => topic.progressPercent < 100).slice(0, 5);
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
  const name = state.settings.studyName?.trim();

  const markReviewed = (problemId: string, cycleId: string, stage: 1 | 2 | 3 | 4) => {
    dispatch({ type: 'COMPLETE_REVIEW', problemId, cycleId, stage });
    toast('Review completed. Next stage is queued.', 'success');
  };

  const hasFocus = focusReviews.length + focusNew.length + focusContinue.length > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="card relative overflow-hidden p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-24 h-72 w-72 rounded-full bg-violet/10 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{formatDateKey(today, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="h-1 w-1 rounded-full bg-faint" />
              <span className="flex items-center gap-1 text-[10px] font-semibold text-warn">
                <Flame className="h-3 w-3" /> {streak.current} day streak
              </span>
            </div>
            <h1 className="mt-3 max-w-2xl text-balance font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-4xl">
              {greeting}{name ? `, ${name}` : ''}. <span className="text-muted">Keep the loop tight.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Today's queue is generated from the PDF order, your overdue revisions, and anything marked for practice.
              Every date is your local calendar date.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to="/today"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand/60 bg-brand px-4 text-sm font-semibold text-canvas shadow-[0_10px_30px_-14px_rgb(var(--brand)/0.9)] transition hover:bg-brand/90"
              >
                <Play className="h-3.5 w-3.5" />
                {hasFocus ? "Open today's plan" : 'Plan the next problem'}
              </Link>
              <Link
                to="/calendar"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-elevated/70 px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
              >
                <CalendarClock className="h-4 w-4 text-brand" />
                {reviewStats.due} review{reviewStats.due === 1 ? '' : 's'} due
              </Link>
              {reviewStats.overdue > 0 ? (
                <Badge tone="bad" dot className="h-7">
                  {reviewStats.overdue} overdue
                </Badge>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-faint">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good" /> Saved in this browser</span>
              <span>{dataset.meta.totalProblems} rows · {dataset.meta.uniqueProblems} unique</span>
              <Link to="/report" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">
                Import evidence
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:flex-col">
            <ProgressRing value={plan.introduced} max={plan.target} size={156} stroke={9}>
              <span className="font-display text-3xl font-semibold tabular-nums text-ink">
                {plan.introduced}
                <span className="text-base text-faint">/{plan.target}</span>
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">new introduced</span>
            </ProgressRing>
            <div className="text-center">
              <p className="text-xs font-medium text-ink">
                {plan.targetMet ? 'Daily new target complete' : `${plan.slotsRemaining} new slot${plan.slotsRemaining === 1 ? '' : 's'} left`}
              </p>
              <p className="mt-1 text-[10.5px] text-faint">Target is configurable in Settings</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BookOpenCheck className="h-4 w-4" />}
          label="Unique solved"
          value={`${solvedUnique}`}
          sub={`of ${dataset.meta.uniqueProblems} unique · ${solvedRows}/211 rows`}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Reviews due"
          value={reviewStats.due}
          sub={reviewStats.due ? `${reviewStats.overdue} overdue · ${reviewStats.dueToday} today` : 'Nothing waiting'}
          tone={reviewStats.overdue ? 'warn' : 'good'}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current streak"
          value={`${streak.current}d`}
          sub={`Longest ${streak.longest} days · ${streak.activeToday ? 'active today' : 'study today to extend'}`}
          tone="warn"
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Focused time"
          value={formatMinutes(studyMinutes)}
          sub={`${status.touchedRows} problems touched`}
          tone="violet"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Today's focus</h2>
            </div>
            <Link to="/today" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80">
              Full plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!hasFocus ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="Queue clear"
              description={upcoming.length ? `Next review is ${relativeDueLabel(upcoming[0].dueOn, today).toLowerCase()}. Add a problem from the library if you want to go further.` : 'Nothing due today. Open the library to pick a problem or start a new solve.'}
              action={
                <Link to="/library" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-elevated px-3 text-xs font-semibold text-ink hover:border-brand/40">
                  Browse library <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
              className="py-8"
            />
          ) : (
            <div className="mt-4 space-y-2">
              {focusReviews.map((review) => (
                <FocusReviewRow
                  key={`${review.problemId}-${review.stage.stage}`}
                  problemId={review.problemId}
                  title={reviewTitle(review.problemId)}
                  meta={`${review.urgency === 'overdue' ? `${review.overdueDays}d overdue` : 'Due today'} · Day ${[1, 3, 7, 30][review.stage.stage - 1]} revision`}
                  overdue={review.urgency === 'overdue'}
                  onComplete={() => markReviewed(review.problemId, review.cycle.id, review.stage.stage)}
                />
              ))}
              {focusNew.map((problem) => (
                <FocusNewRow key={problem.id} problemId={problem.id} title={problem.title} number={problem.number} topic={problem.topic} />
              ))}
              {focusContinue.map((problem) => (
                <FocusContinueRow
                  key={problem.id}
                  problemId={problem.id}
                  title={problem.title}
                  number={problem.number}
                  status={state.progress[problem.id]?.status ?? 'attempted'}
                />
              ))}
              {plan.slotsRemaining > 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-line bg-canvas/30 px-4 py-3">
                  <p className="text-[11px] text-faint">
                    {plan.slotsRemaining} new slot{plan.slotsRemaining === 1 ? '' : 's'} still open in today's target.
                  </p>
                  <Link to="/today" className="text-[11px] font-semibold text-brand">Add from plan</Link>
                </div>
              ) : null}
            </div>
          )}

          {plan.reviewsDue.length > 0 || plan.newQueue.length > 0 || plan.inProgress.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/70 pt-3 text-[10px] text-faint">
              <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3 text-warn" /> {plan.reviewsDue.length} reviews</span>
              <span className="flex items-center gap-1"><Target className="h-3 w-3 text-brand" /> {plan.newQueue.length} new</span>
              <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3 text-violet" /> {plan.inProgress.length} in progress</span>
              <Link to="/today" className="ml-auto text-muted hover:text-ink">See the full queue</Link>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Review pipeline</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Spaced recall</h2>
              </div>
              <Badge tone={reviewStats.completionRate >= 80 ? 'good' : 'brand'}>{reviewStats.completionRate}%</Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              <PipelineRow label="Overdue" value={reviewStats.overdue} tone="bad" />
              <PipelineRow label="Due today" value={reviewStats.dueToday} tone="warn" />
              <PipelineRow label="Upcoming" value={reviewStats.upcoming} tone="brand" />
              <PipelineRow label="Completed stages" value={reviewStats.completed} tone="good" />
            </div>
            <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3">
              <div className="flex items-center justify-between text-[10px] text-faint">
                <span>Reached-stage completion</span>
                <span className="font-mono text-muted">{reviewStats.completed}/{reviewStats.reached || 0}</span>
              </div>
              <ProgressBar value={reviewStats.completionRate} height="h-1.5" className="mt-2" tone="good" />
            </div>
            <Link to="/calendar" className="mt-4 flex items-center justify-between rounded-xl border border-line bg-elevated/60 px-3 py-2.5 text-xs font-semibold text-ink transition hover:border-brand/40">
              Open revision calendar <ChevronRight className="h-3.5 w-3.5 text-brand" />
            </Link>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Consistency</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Study rhythm</h2>
              </div>
              <Badge tone="violet">{streak.longest}d best</Badge>
            </div>
            <SparkBars state={state} days={14} className="mt-4" />
            <p className="mt-3 text-[10.5px] leading-5 text-faint">
              Activity is based on attempted, solved and reviewed problems. Notes alone do not count.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">26-week view</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Consistency map</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-faint">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-good" /> {streak.activeToday ? 'Active today' : 'Today open'}</span>
              <span>·</span>
              <span>{streak.current} day streak</span>
            </div>
          </div>
          <ActivityHeatmap state={state} weeks={26} className="mt-5" />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/70 pt-4">
            <MiniStat label="Study time" value={formatMinutes(studyMinutes)} />
            <MiniStat label="Problems touched" value={String(status.touchedRows)} />
            <MiniStat label="Reviews completed" value={String(reviewStats.completed)} />
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Coverage</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Topic signal</h2>
            </div>
            <Link to="/topics" className="text-xs font-semibold text-brand">All topics</Link>
          </div>
          <div className="mt-4 space-y-3.5">
            {remainingTopics.map((topic) => (
              <Link key={topic.id} to={`/library?topic=${topic.id}`} className="group block">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-medium text-ink group-hover:text-brand">{topic.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-faint">{topic.solvedUnique}/{topic.uniqueRows}</span>
                </div>
                <ProgressBar value={topic.solvedUnique} max={topic.uniqueRows} height="h-1.5" className="mt-1.5" tone={topic.overdueCount ? 'warn' : 'brand'} />
              </Link>
            ))}
          </div>
          <div className="mt-5">
            <StatusDonut
              segments={[
                { label: 'New', value: status.new, color: 'rgb(var(--line))' },
                { label: 'Attempted', value: status.attempted, color: 'rgb(var(--brand))' },
                { label: 'Solved', value: status.solved, color: 'rgb(var(--good))' },
                { label: 'Practice', value: status.needs_practice, color: 'rgb(var(--warn))' },
                { label: 'Skipped', value: status.skipped, color: 'rgb(var(--faint))' },
              ]}
              centerValue={solvedUnique}
              centerLabel="unique solved"
              className="scale-[0.92]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Feed</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Recent activity</h2>
            </div>
            <Link to="/analytics" className="text-xs font-semibold text-brand">Analytics</Link>
          </div>          {recent.length ? (
            <div className="mt-4 divide-y divide-line/60">
              {recent.map(({ event, problem }) => (
                <div key={event.id} className="flex items-center gap-3 py-2.5">
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                    event.type === 'solve' ? 'border-good/25 bg-good/10 text-good' :
                    event.type === 'review' ? 'border-violet/25 bg-violet/10 text-violet' :
                    event.type === 'attempt' ? 'border-brand/25 bg-brand/10 text-brand' :
                    'border-line bg-elevated text-faint',
                  )}>
                    {event.type === 'solve' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                     event.type === 'review' ? <CalendarClock className="h-3.5 w-3.5" /> :
                     event.type === 'attempt' ? <RotateCcw className="h-3.5 w-3.5" /> :
                     <ListTodo className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink">
                      {problem ? <Link to={`/problem/${problem.id}`} className="hover:text-brand">#{problem.number} {problem.title}</Link> : event.detail ?? 'Workspace event'}
                    </p>
                    <p className="text-[10px] text-faint">
                      {labelForEvent(event.type)} · {formatDateKey(event.date, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {typeof event.minutes === 'number' && event.minutes > 0 ? (
                    <span className="shrink-0 font-mono text-[10px] text-faint">{formatMinutes(event.minutes)}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Clock3 className="h-5 w-5" />} title="No activity yet" description="Solve or attempt a problem and it will show up here." className="py-8" />
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <p className="eyebrow">Next up</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Coming around the bend</h2>
          <div className="mt-4 space-y-2">
            {upcoming.length ? upcoming.map((review) => (
              <Link key={`${review.problemId}-${review.stage.stage}`} to={`/problem/${review.problemId}`} className="flex items-center gap-3 rounded-xl border border-line bg-elevated/50 p-3 transition hover:border-brand/35">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{reviewTitle(review.problemId)}</p>
                  <p className="text-[10px] text-faint">Day {[1, 3, 7, 30][review.stage.stage - 1]} · {relativeDueLabel(review.dueOn, today)}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-faint" />
              </Link>
            )) : (
              <p className="rounded-xl border border-dashed border-line p-4 text-xs leading-5 text-faint">
                Solve a problem to start a Day 1 / 3 / 7 / 30 review cycle. Upcoming reviews appear here.
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3.5">
            <p className="flex items-center gap-2 text-[11px] font-semibold text-ink"><Layers3 className="h-3.5 w-3.5 text-violet" /> Source-faithful library</p>
            <p className="mt-1.5 text-[10.5px] leading-5 text-faint">
              All 211 numbered rows, 15 topics, duplicate titles and repeated topic numbers are preserved.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="brand">{dataset.meta.totalProblems} rows</Badge>
              <Badge tone="good">{dataset.meta.uniqueProblems} unique</Badge>
              <Badge tone="violet">{dataset.meta.topicCount} topics</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function reviewTitle(problemId: string): string {
  const problem = getProblem(problemId);
  return problem ? `#${problem.number} · ${problem.title}` : 'Unknown problem';
}

function labelForEvent(type: string): string {
  switch (type) {
    case 'solve': return 'Solved';
    case 'attempt': return 'Attempted';
    case 'needs_practice': return 'Marked for practice';
    case 'uncheck': return 'Unchecked';
    case 'review': return 'Revision completed';
    case 'snooze': return 'Review snoozed';
    case 'skip': return 'Skipped';
    case 'restore': return 'Restored';
    case 'note': return 'Notes updated';
    case 'star': return 'Starred';
    default: return 'Activity';
  }
}

function FocusReviewRow({ problemId, title, meta, overdue, onComplete }: { problemId: string; title: string; meta: string; overdue: boolean; onComplete: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated/45 p-3 sm:flex-row sm:items-center">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', overdue ? 'border-bad/30 bg-bad/10 text-bad' : 'border-warn/30 bg-warn/10 text-warn')}>
        <CalendarClock className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <Link to={`/problem/${problemId}`} className="block truncate text-xs font-semibold text-ink hover:text-brand">{title}</Link>
        <p className={cn('mt-0.5 text-[10px]', overdue ? 'text-bad' : 'text-warn')}>{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="success" onClick={onComplete} icon={<Check className="h-3.5 w-3.5" />}>Reviewed</Button>
        <Link to={`/problem/${problemId}`} className="text-[11px] font-semibold text-muted hover:text-ink">Open</Link>
      </div>
    </div>
  );
}

function FocusNewRow({ problemId, title, number, topic }: { problemId: string; title: string; number: number; topic: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated/45 p-3 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center gap-2">
        <SolvedCheckbox problemId={problemId} title={title} size="sm" />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 font-mono text-[10px] font-semibold text-brand">
          {String(number).padStart(2, '0')}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <Link to={`/problem/${problemId}`} className="block truncate text-xs font-semibold text-ink hover:text-brand">{title}</Link>
        <p className="mt-0.5 text-[10px] text-faint">{topic} · next in PDF order</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TimerControls problemId={problemId} compact />
        <Link to={`/problem/${problemId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">Open <ChevronRight className="h-3 w-3" /></Link>
      </div>
    </div>
  );
}

function FocusContinueRow({ problemId, title, number, status }: { problemId: string; title: string; number: number; status: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated/45 p-3">
      <SolvedCheckbox problemId={problemId} title={title} size="sm" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet"><RotateCcw className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <Link to={`/problem/${problemId}`} className="block truncate text-xs font-semibold text-ink hover:text-brand">#{number} {title}</Link>
        <p className="mt-0.5 text-[10px] text-violet">{status === 'needs_practice' ? 'Needs another pass' : 'Attempt in progress'}</p>
      </div>
      <Link to={`/problem/${problemId}`} className="text-[11px] font-semibold text-muted hover:text-ink">Continue</Link>
    </div>
  );
}

function PipelineRow({ label, value, tone }: { label: string; value: number; tone: 'bad' | 'warn' | 'brand' | 'good' }) {
  const colors = { bad: 'bg-bad', warn: 'bg-warn', brand: 'bg-brand', good: 'bg-good' };
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', colors[tone])} />
      <span className="flex-1 text-[11px] text-muted">{label}</span>
      <span className="font-mono text-[11px] text-ink">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-base font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-faint">{label}</p>
    </div>
  );
}
