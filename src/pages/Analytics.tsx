import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Coffee,
  Download,
  Flame,
  Gauge,
  Layers3,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { dataset, uniqueProblemCount } from '../lib/dataset';
import {
  getAverageDifficulty,
  getCompanyStats,
  getDifficultyCounts,
  getReviewStats,
  getSolvedRows,
  getSolvedUniqueCount,
  getStatusCounts,
  getStreak,
  getStudySeconds,
  getTopicStats,
  getWeeklyActivity,
} from '../lib/stats';
import { addDays, formatMinutes } from '../lib/dates';
import { downloadProblemsCsv } from '../lib/export';
import { ActivityHeatmap, SparkBars, StatCard, StatusDonut } from '../components/charts/Charts';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Progress';
import { cn, percent } from '../lib/utils';

const difficultyLabels: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very hard',
};

export default function AnalyticsPage() {
  const { state } = useStore();
  const { toast } = useToast();
  const today = useToday();

  const status = getStatusCounts(state);
  const solvedUnique = getSolvedUniqueCount(state);
  const solvedRows = getSolvedRows(state);
  const reviews = getReviewStats(state, today);
  const streak = getStreak(state, today);
  const totalMinutes = getStudySeconds(state) / 60;
  const topicStats = useMemo(() => getTopicStats(state, today), [state, today]);
  const companyStats = useMemo(() => getCompanyStats(state, today), [state, today]);
  const difficulty = getDifficultyCounts(state);
  const averageDifficulty = getAverageDifficulty(state);
  const weekly = getWeeklyActivity(state, today, 14);
  const weekStart = addDays(today, -6);

  const attempts = state.progress
    ? Object.values(state.progress).reduce((total, progress) => total + progress.attempts.length, 0)
    : 0;
  const solvesThisWeek = state.events.filter((event) => event.type === 'solve' && event.date >= weekStart).length;
  const reviewsThisWeek = state.events.filter((event) => event.type === 'review' && event.date >= weekStart).length;
  const activeDays = new Set(state.events.filter((event) => event.date >= weekStart).map((event) => event.date)).size;
  const ratedCount = difficulty.filter((item) => item.value !== 'unrated').reduce((total, item) => total + item.count, 0);
  const unratedCount = difficulty.find((item) => item.value === 'unrated')?.count ?? 0;
  const topCompanies = [...companyStats]
    .sort((a, b) => b.solvedUnique - a.solvedUnique || b.progressPercent - a.progressPercent)
    .slice(0, 8);
  const maxWeekly = Math.max(1, ...weekly.map((day) => day.count));

  const exportCsv = () => {
    downloadProblemsCsv(state);
    toast('Progress CSV exported.', 'success');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Local metrics · unique and row-level"
        title="Analytics"
        description="A single view of coverage, revision health, time and topic balance. Unique counts deduplicate the seven repeated problems; row counts preserve all 211 PDF entries."
        actions={
          <>
            <Badge tone="violet">{dataset.meta.totalProblems} rows · {uniqueProblemCount} unique</Badge>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export CSV</Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BookOpenCheck className="h-4 w-4" />}
          label="Unique solved"
          value={solvedUnique}
          sub={`${percent(solvedUnique, uniqueProblemCount)}% of ${uniqueProblemCount} · ${solvedRows} rows solved`}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Review completion"
          value={`${reviews.completionRate}%`}
          sub={`${reviews.completed} completed · ${reviews.overdue} overdue`}
          tone={reviews.overdue ? 'warn' : 'good'}
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Focused time"
          value={formatMinutes(totalMinutes)}
          sub={`${attempts} attempt${attempts === 1 ? '' : 's'} logged`}
          tone="violet"
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current streak"
          value={`${streak.current}d`}
          sub={`Longest ${streak.longest}d · ${streak.activeToday ? 'active today' : 'today open'}`}
          tone="warn"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">52 weeks</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">Consistency map</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-faint">
              <Badge tone="good">{streak.current} day streak</Badge>
              <Badge tone="brand">{activeDays}/7 active this week</Badge>
            </div>
          </div>
          <ActivityHeatmap state={state} weeks={52} className="mt-5" />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-4 sm:grid-cols-4">
            <SmallStat label="Solves this week" value={String(solvesThisWeek)} tone="good" />
            <SmallStat label="Reviews this week" value={String(reviewsThisWeek)} tone="violet" />
            <SmallStat label="Study time" value={formatMinutes(totalMinutes)} tone="brand" />
            <SmallStat label="Last active" value={streak.lastActive ?? '—'} tone="warn" />
          </div>
        </div>

        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Row status</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Outcome mix</h2>
            </div>
            <Badge tone="brand">{dataset.meta.totalProblems} rows</Badge>
          </div>
          <StatusDonut
            className="mt-5"
            segments={[
              { label: 'New', value: status.new, color: 'rgb(var(--line))' },
              { label: 'Attempted', value: status.attempted, color: 'rgb(var(--brand))' },
              { label: 'Solved', value: status.solved, color: 'rgb(var(--good))' },
              { label: 'Practice', value: status.needs_practice, color: 'rgb(var(--warn))' },
              { label: 'Skipped', value: status.skipped, color: 'rgb(var(--faint))' },
            ]}
            centerValue={solvedUnique}
            centerLabel="unique solved"
          />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-[10px]">
            <span className="flex items-center gap-1.5 text-muted"><CircleSlash className="h-3 w-3 text-faint" /> {status.skipped} skipped</span>
            <span className="flex items-center gap-1.5 text-muted"><Coffee className="h-3 w-3 text-warn" /> {status.needs_practice} practice</span>
            <span className="flex items-center gap-1.5 text-muted"><RotateCcw className="h-3 w-3 text-brand" /> {attempts} attempts</span>
            <span className="flex items-center gap-1.5 text-muted"><CheckCircle2 className="h-3 w-3 text-good" /> {status.solvedEver} rows solved ever</span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Last 14 days</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Daily activity</h2>
            </div>
            <span className="text-[10px] text-faint">Solves, attempts and reviews</span>
          </div>
          <SparkBars state={state} days={14} className="mt-4" />
          <div className="mt-4 grid gap-1.5">
            {weekly.map((day) => (
              <div key={day.date} className={cn('flex items-center gap-2 text-[10px]', day.date === today && 'text-ink')}>
                <span className={cn('w-10 shrink-0 font-mono', day.date === today ? 'text-brand' : 'text-faint')}>{day.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/40">
                  <div className="h-full rounded-full bg-brand/70" style={{ width: `${(day.count / maxWeekly) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[9px] text-faint">{day.count} act · {formatMinutes(day.minutes)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Self-rating</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Difficulty mix</h2>
              </div>
              <Badge tone="violet">{averageDifficulty ? `${averageDifficulty.toFixed(1)}/5` : 'unrated'}</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {difficulty.map((item) => (
                <div key={String(item.value)} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[10px] text-muted">
                    {item.value === 'unrated' ? 'Unrated' : difficultyLabels[item.value]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/40">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item.value === 'unrated' ? 'bg-faint/50' : item.value <= 2 ? 'bg-good' : item.value === 3 ? 'bg-warn' : 'bg-bad',
                      )}
                      style={{ width: `${ratedCount + unratedCount > 0 ? (item.count / (ratedCount + unratedCount)) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[10px] text-faint">{item.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9.5px] text-faint">{ratedCount} rated · {unratedCount} touched but unrated. Difficulty is your own 1–5 rating, not a platform label.</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Review health</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Pipeline</h2>
              </div>
              <Badge tone={reviews.overdue ? 'bad' : reviews.dueToday ? 'warn' : 'good'} dot>
                {reviews.due} due
              </Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              <PipelineRow label="Overdue" value={reviews.overdue} max={Math.max(1, reviews.due)} tone="bad" />
              <PipelineRow label="Due today" value={reviews.dueToday} max={Math.max(1, reviews.due)} tone="warn" />
              <PipelineRow label="Upcoming" value={reviews.upcoming} max={Math.max(1, reviews.upcoming)} tone="brand" />
              <PipelineRow label="Completed stages" value={reviews.completed} max={Math.max(1, reviews.reached)} tone="good" />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[10px]">
              <span className="text-faint">Reached-stage completion</span>
              <span className="font-mono text-muted">{reviews.completionRate}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
            <div>
              <p className="eyebrow">Unique coverage by source section</p>
              <h2 className="mt-0.5 font-display text-lg font-semibold text-ink">Topic performance</h2>
            </div>
            <Link to="/topics" className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand">All topics <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-line/60">
            {topicStats.map((topic) => (
              <div key={topic.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-7 shrink-0 font-mono text-[9px] text-faint">{topic.sourceNumber}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/library?topic=${topic.id}`} className="truncate text-[11.5px] font-medium text-ink hover:text-brand">{topic.name}</Link>
                    <span className="shrink-0 font-mono text-[9.5px] text-faint">{topic.solvedUnique}/{topic.uniqueRows}</span>
                  </div>
                  <ProgressBar value={topic.solvedUnique} max={Math.max(1, topic.uniqueRows)} height="h-1" className="mt-1" tone={topic.progressPercent === 100 ? 'good' : topic.overdueCount ? 'bad' : 'brand'} />
                </div>
                <span className="w-20 shrink-0 text-right text-[9px] text-faint">{formatMinutes(topic.minutes)} · {topic.dueCount} due</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Source associations</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Company coverage</h2>
            </div>
            <Building2 className="h-4 w-4 text-brand" />
          </div>
          <div className="mt-4 space-y-2.5">
            {topCompanies.map((company) => (
              <Link key={company.name} to={`/library?company=${encodeURIComponent(company.name)}`} className="block">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate text-muted">{company.name}</span>
                  <span className="shrink-0 font-mono text-faint">{company.solvedUnique}/{company.uniqueRows}</span>
                </div>
                <ProgressBar value={company.solvedUnique} max={Math.max(1, company.uniqueRows)} height="h-1" className="mt-1" tone={company.overdueCount ? 'warn' : 'cyan'} />
              </Link>
            ))}
          </div>
          <p className="mt-4 border-t border-line/60 pt-3 text-[9.5px] leading-4 text-faint">
            Logo associations only. Counts are not an interview-frequency signal.
          </p>
          <Link to="/companies" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand">All companies <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={<Target className="h-4 w-4" />} label="New today" value={`${state.settings.dailyTarget}`} sub="Configurable daily target" />
        <InsightCard icon={<Gauge className="h-4 w-4" />} label="Rated problems" value={`${ratedCount}`} sub={`${unratedCount} touched, unrated`} />
        <InsightCard icon={<TrendingUp className="h-4 w-4" />} label="Reviews completed" value={`${reviews.completed}`} sub={`${reviews.reached} stages reached`} />
        <InsightCard icon={<Layers3 className="h-4 w-4" />} label="Company links" value={`${companyStats.length}`} sub={`${dataset.meta.topicCount} source topics`} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
        <p>All metrics are derived from this browser's local state. Nothing is sent to a server.</p>
        <Link to="/report" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">Dataset evidence</Link>
      </div>
    </div>
  );
}

function SmallStat({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'good' | 'warn' | 'violet' }) {
  const tones = { brand: 'text-brand', good: 'text-good', warn: 'text-warn', violet: 'text-violet' };
  return (
    <div className="rounded-lg border border-line bg-canvas/35 px-2.5 py-2">
      <p className={cn('truncate font-display text-sm font-semibold tabular-nums', tones[tone])}>{value}</p>
      <p className="mt-0.5 text-[8.5px] uppercase tracking-[0.08em] text-faint">{label}</p>
    </div>
  );
}

function PipelineRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'bad' | 'warn' | 'brand' | 'good' }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-faint">{value}</span>
      </div>
      <ProgressBar value={value} max={max} height="h-1.5" className="mt-1" tone={tone} />
    </div>
  );
}

function InsightCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-elevated text-brand">{icon}</div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-ink">{value}</p>
        <p className="text-[9.5px] text-faint">{sub}</p>
      </div>
    </div>
  );
}
