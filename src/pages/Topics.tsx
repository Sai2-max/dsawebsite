import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Layers3,
  RotateCcw,
  Search,
  Target,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { getStatusCounts, getTopicStats, getSolvedUniqueCount, getSolvedRows } from '../lib/stats';
import { dataset, uniqueProblemCount } from '../lib/dataset';
import { formatMinutes, pluralize } from '../lib/dates';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, percent } from '../lib/utils';

type TopicFilter = 'all' | 'in_progress' | 'not_started' | 'complete';

export default function TopicsPage() {
  const { state } = useStore();
  const today = useToday();
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [query, setQuery] = useState('');

  const stats = useMemo(() => getTopicStats(state, today), [state, today]);
  const status = getStatusCounts(state);
  const solvedUnique = getSolvedUniqueCount(state);
  const solvedRows = getSolvedRows(state);
  const totalMinutes = stats.reduce((total, topic) => total + topic.minutes, 0);
  const totalDue = stats.reduce((total, topic) => total + topic.dueCount, 0);

  const filtered = stats.filter((topic) => {
    const needle = query.trim().toLowerCase();
    if (needle && !`${topic.name} ${topic.subtopics.join(' ')}`.toLowerCase().includes(needle)) return false;
    if (filter === 'complete') return topic.progressPercent === 100;
    if (filter === 'not_started') return topic.solvedRows === 0 && topic.attemptedRows === 0 && topic.needsPracticeRows === 0;
    if (filter === 'in_progress') return topic.progressPercent > 0 && topic.progressPercent < 100;
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow={`${dataset.meta.topicCount} source sections · repeated topic numbers preserved`}
        title="Topics"
        description="The PDF's topic order and section numbering are kept exactly as printed. Each card separates source rows from unique problems so duplicate rows never inflate coverage."
        actions={
          <>
            <Badge tone="brand">{dataset.meta.topicCount} sections</Badge>
            <Link to="/library" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40">
              <Layers3 className="h-3.5 w-3.5 text-brand" /> Browse library
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={solvedUnique} max={uniqueProblemCount} size={132} stroke={8}>
              <span className="font-display text-2xl font-semibold tabular-nums text-ink">{percent(solvedUnique, uniqueProblemCount)}%</span>
              <span className="text-[8.5px] uppercase tracking-[0.12em] text-faint">unique solved</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Coverage</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
                {solvedUnique} of {uniqueProblemCount} unique problems
              </h2>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">
                {solvedRows} of {dataset.meta.totalProblems} source rows are marked solved ever. Duplicate twins count once toward unique coverage.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniMetric label="Attempted" value={status.attempted} tone="brand" />
                <MiniMetric label="Practice" value={status.needs_practice} tone="warn" />
                <MiniMetric label="Reviews due" value={totalDue} tone="violet" />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Time & consistency</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">Study signal</h2>
            </div>
            <Badge tone="cyan">{formatMinutes(totalMinutes)}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            <SignalRow label="Unique solved" value={solvedUnique} max={uniqueProblemCount} tone="good" />
            <SignalRow label="Rows touched" value={status.touchedRows} max={dataset.meta.totalProblems} tone="brand" />
            <SignalRow label="Needs practice" value={status.needs_practice} max={dataset.meta.totalProblems} tone="warn" />
            <SignalRow label="Skipped rows" value={status.skipped} max={dataset.meta.totalProblems} tone="violet" />
          </div>
          <p className="mt-4 border-t border-line/60 pt-3 text-[10px] leading-5 text-faint">
            {pluralize(dataset.meta.totalProblems, 'source row')} across {dataset.meta.topicCount} sections. Study time comes from logged attempts and timers.
          </p>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a topic or subtopic…"
              className="input pl-10"
              aria-label="Search topics"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {([
              ['all', 'All'],
              ['in_progress', 'In progress'],
              ['not_started', 'Not started'],
              ['complete', 'Complete'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                  filter === value ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-elevated hover:text-ink',
                )}
                aria-pressed={filter === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filtered.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((topic) => (
            <article key={topic.id} className="card card-hover flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 px-1.5 font-mono text-[10px] font-semibold text-brand">
                    {topic.sourceNumber}
                  </span>
                  <div className="min-w-0">
                    <Link to={`/library?topic=${topic.id}`} className="font-display text-[15px] font-semibold leading-snug text-ink transition hover:text-brand">
                      {topic.name}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {topic.uniqueRows} unique · {topic.totalRows} rows{topic.totalRows !== topic.uniqueRows ? ' (duplicates preserved)' : ''}
                    </p>
                  </div>
                </div>
                <Badge tone={topic.progressPercent === 100 ? 'good' : topic.dueCount ? 'warn' : 'neutral'}>
                  {topic.progressPercent}%
                </Badge>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted">{topic.solvedUnique}/{topic.uniqueRows} unique solved</span>
                  <span className="text-faint">{topic.solvedRows}/{topic.totalRows} rows</span>
                </div>
                <ProgressBar value={topic.solvedUnique} max={Math.max(1, topic.uniqueRows)} height="h-1.5" className="mt-1.5" tone={topic.progressPercent === 100 ? 'good' : topic.overdueCount ? 'bad' : 'brand'} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {topic.attemptedRows ? <Badge tone="brand">{topic.attemptedRows} attempted</Badge> : null}
                {topic.needsPracticeRows ? <Badge tone="warn">{topic.needsPracticeRows} practice</Badge> : null}
                {topic.dueCount ? <Badge tone={topic.overdueCount ? 'bad' : 'warn'} dot>{topic.dueCount} due</Badge> : null}
                {!topic.attemptedRows && !topic.needsPracticeRows && !topic.dueCount ? <Badge tone="neutral">No active work</Badge> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {topic.subtopics.slice(0, 4).map((subtopic) => (
                  <span key={subtopic} className="truncate rounded-md border border-line bg-elevated/50 px-1.5 py-0.5 text-[9.5px] text-faint" title={subtopic}>
                    {subtopic}
                  </span>
                ))}
                {topic.subtopics.length > 4 ? <span className="text-[9.5px] text-faint">+{topic.subtopics.length - 4}</span> : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3">
                <TopicMetric icon={<Target className="h-3 w-3" />} label="Companies" value={String(topic.companyCount)} />
                <TopicMetric icon={<RotateCcw className="h-3 w-3" />} label="Reviews" value={String(topic.reviewsCompleted)} />
                <TopicMetric icon={<Clock3 className="h-3 w-3" />} label="Focused" value={formatMinutes(topic.minutes)} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[9.5px] text-faint">
                  {topic.overdueCount ? <><CircleDashed className="h-3 w-3 text-bad" /> {topic.overdueCount} overdue</> : topic.dueCount ? <><CalendarClock className="h-3 w-3 text-warn" /> next review waiting</> : topic.progressPercent === 100 ? <><CheckCircle2 className="h-3 w-3 text-good" /> complete</> : <><CircleDashed className="h-3 w-3" /> no review due</>}
                </span>
                <Link to={`/library?topic=${topic.id}`} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand transition hover:text-brand/80">
                  Open rows <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matching topics"
            description="Try a different word or switch back to all sections."
            action={<Button variant="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</Button>}
            className="py-14"
          />
        </div>
      )}

      <p className="text-center text-[10px] leading-5 text-faint">
        Topic numbering follows the PDF, including repeated printed numbers such as 07, 10, and 11. The order is not “fixed” or renumbered.
      </p>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'warn' | 'violet' }) {
  const classes = { brand: 'text-brand', warn: 'text-warn', violet: 'text-violet' };
  return (
    <div className="rounded-lg border border-line bg-canvas/35 px-2.5 py-2">
      <p className={cn('font-display text-base font-semibold tabular-nums', classes[tone])}>{value}</p>
      <p className="text-[8.5px] uppercase tracking-[0.08em] text-faint">{label}</p>
    </div>
  );
}

function SignalRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'brand' | 'good' | 'warn' | 'violet' }) {
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

function TopicMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.06em] text-faint">{icon}<span className="truncate">{label}</span></p>
      <p className="mt-0.5 font-mono text-[11px] text-muted">{value}</p>
    </div>
  );
}
