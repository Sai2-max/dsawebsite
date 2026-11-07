import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Library,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { companies, dataset, getCompany, getTopic, problems, topics } from '../lib/dataset';
import { useStore, useToday } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { getNextDueReview, isReviewDue } from '../lib/revision';
import { formatDateKey, relativeDueLabel } from '../lib/dates';
import { downloadProblemsCsv } from '../lib/export';
import { PageHeader, CompanyChips, DuplicateBadge, PlatformBadge, StatusBadge } from '../components/ProblemBits';
import { Badge, DifficultyDots } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SolvedCheckbox } from '../components/SolvedCheckbox';
import { cn } from '../lib/utils';
import type { Problem } from '../types';

const PAGE_SIZE = 30;

type StatusFilter = 'all' | 'new' | 'attempted' | 'solved' | 'needs_practice' | 'skipped' | 'solved_ever' | 'due' | 'starred';
type SortKey = 'pdf' | 'recent' | 'title' | 'difficulty' | 'due';

const statusLabels: Record<StatusFilter, string> = {
  all: 'All statuses',
  new: 'Not started',
  attempted: 'Attempted',
  solved: 'Currently solved',
  needs_practice: 'Needs practice',
  skipped: 'Skipped',
  solved_ever: 'Solved ever',
  due: 'Review due',
  starred: 'Starred',
};

function isStatusFilter(value: string | null): value is StatusFilter {
  return Boolean(value && value in statusLabels);
}

export default function LibraryPage() {
  const { state } = useStore();
  const { toast } = useToast();
  const today = useToday();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [platform, setPlatform] = useState<'all' | 'LeetCode' | 'GeeksforGeeks'>('all');
  const [sort, setSort] = useState<SortKey>('pdf');

  const q = searchParams.get('q') ?? '';
  const topicId = searchParams.get('topic') ?? '';
  const companyName = searchParams.get('company') ?? '';
  const statusParam = searchParams.get('status');
  const status: StatusFilter = isStatusFilter(statusParam) ? statusParam : 'all';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setPlatform('all');
    setSort('pdf');
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [q, topicId, companyName, status, platform, sort]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = problems.filter((problem) => {
      if (topicId && problem.topicId !== topicId) return false;
      if (companyName && !problem.companies.some((company) => company.name === companyName)) return false;
      if (platform !== 'all' && problem.platform !== platform) return false;
      const progress = state.progress[problem.id];
      if (status === 'new' && (progress?.status ?? 'new') !== 'new') return false;
      if (status === 'attempted' && progress?.status !== 'attempted') return false;
      if (status === 'solved' && progress?.status !== 'solved') return false;
      if (status === 'needs_practice' && progress?.status !== 'needs_practice') return false;
      if (status === 'skipped' && progress?.status !== 'skipped') return false;
      if (status === 'solved_ever' && !progress?.solvedEver) return false;
      if (status === 'starred' && !progress?.starred) return false;
      if (status === 'due' && !(progress && isReviewDue(progress, today))) return false;
      if (needle) {
        const haystack = [
          problem.number,
          String(problem.number),
          problem.title,
          problem.sourceTitle,
          problem.topic,
          problem.subtopic,
          problem.platform,
          ...problem.companies.map((company) => company.name),
        ].join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'recent') {
        const aTime = state.progress[a.id]?.lastActivityAt ?? '';
        const bTime = state.progress[b.id]?.lastActivityAt ?? '';
        return bTime.localeCompare(aTime) || a.number - b.number;
      }
      if (sort === 'difficulty') {
        const aDiff = state.progress[a.id]?.difficulty ?? 0;
        const bDiff = state.progress[b.id]?.difficulty ?? 0;
        return bDiff - aDiff || a.number - b.number;
      }
      if (sort === 'due') {
        const aDue = state.progress[a.id] ? getNextDueReview(state.progress[a.id], today)?.dueOn ?? '9999-12-31' : '9999-12-31';
        const bDue = state.progress[b.id] ? getNextDueReview(state.progress[b.id], today)?.dueOn ?? '9999-12-31' : '9999-12-31';
        return aDue.localeCompare(bDue) || a.number - b.number;
      }
      return a.number - b.number;
    });
  }, [q, topicId, companyName, status, platform, sort, state.progress, today]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = Boolean(q || topicId || companyName || status !== 'all' || platform !== 'all');
  const topic = topicId ? getTopic(topicId) : undefined;
  const company = companyName ? getCompany(companyName) : undefined;

  const exportCsv = () => {
    downloadProblemsCsv(state);
    toast('Progress CSV exported.', 'success');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="211 source rows · 204 unique"
        title="Problem Library"
        description="Every numbered row from the PDF in source order. Duplicates are preserved and labelled. Filter by topic, company, status, or the words in a title."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>CSV</Button>
            <Link to="/report" className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-muted transition hover:text-ink">Verified links</Link>
          </>
        }
      />

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Search title, number, topic, subtopic, company…"
              className="input pl-10 pr-10"
              aria-label="Search problems"
            />
            {q ? (
              <button type="button" onClick={() => setParam('q', '')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setFiltersOpen((open) => !open)}
              icon={<SlidersHorizontal className="h-4 w-4" />}
              className="md:hidden"
            >
              Filters
            </Button>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="input h-10 w-auto min-w-[140px] py-0 text-xs" aria-label="Sort problems">
              <option value="pdf">PDF order</option>
              <option value="recent">Recent activity</option>
              <option value="title">Title A–Z</option>
              <option value="difficulty">My difficulty</option>
              <option value="due">Next review</option>
            </select>
            {hasFilters ? (
              <Button variant="ghost" size="md" onClick={clearFilters} icon={<X className="h-3.5 w-3.5" />} className="hidden sm:inline-flex">
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className={cn('mt-3 grid gap-2 border-t border-line/60 pt-3 sm:grid-cols-2 lg:grid-cols-4', filtersOpen ? 'grid' : 'hidden md:grid')}>
          <select value={topicId} onChange={(event) => setParam('topic', event.target.value)} className="input h-9 py-0 text-xs" aria-label="Filter by topic">
            <option value="">All topics</option>
            {topics.map((item) => (
              <option key={item.id} value={item.id}>{item.sourceNumber} · {item.name} ({item.problemCount})</option>
            ))}
          </select>
          <select value={companyName} onChange={(event) => setParam('company', event.target.value)} className="input h-9 py-0 text-xs" aria-label="Filter by company">
            <option value="">All companies</option>
            {companies.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.problemCount})</option>)}
          </select>
          <select value={status} onChange={(event) => setParam('status', event.target.value === 'all' ? '' : event.target.value)} className="input h-9 py-0 text-xs" aria-label="Filter by status">
            {(Object.keys(statusLabels) as StatusFilter[]).map((key) => <option key={key} value={key}>{statusLabels[key]}</option>)}
          </select>
          <select value={platform} onChange={(event) => setPlatform(event.target.value as typeof platform)} className="input h-9 py-0 text-xs" aria-label="Filter by platform">
            <option value="all">Both platforms</option>
            <option value="LeetCode">LeetCode only</option>
            <option value="GeeksforGeeks">GeeksforGeeks only</option>
          </select>
        </div>

        {hasFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-faint"><Filter className="h-3 w-3" /> Active:</span>
            {q ? <FilterChip label={`“${q}”`} onRemove={() => setParam('q', '')} /> : null}
            {topic ? <FilterChip label={topic.name} onRemove={() => setParam('topic', '')} /> : null}
            {company ? <FilterChip label={company.name} onRemove={() => setParam('company', '')} /> : null}
            {status !== 'all' ? <FilterChip label={statusLabels[status]} onRemove={() => setParam('status', '')} /> : null}
            {platform !== 'all' ? <FilterChip label={platform} onRemove={() => setPlatform('all')} /> : null}
            <button type="button" onClick={clearFilters} className="ml-1 text-[10px] font-semibold text-brand hover:text-brand/80">Clear all</button>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl2 border border-line bg-surface/80 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] text-faint">
            <Library className="h-3.5 w-3.5 text-brand" />
            <span><span className="font-semibold text-ink">{filtered.length}</span> of {problems.length} rows</span>
            {filtered.length !== problems.length ? <span className="hidden sm:inline">· filtered view</span> : null}
            <span className="hidden text-line sm:inline">/</span>
            <span className="hidden sm:inline">{dataset.meta.uniqueProblems} unique overall</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-faint">
            <span className="hidden sm:inline">Tick the circle to mark solved · open a row for notes & revisions</span>
            <Badge tone="good">{state.progress ? Object.values(state.progress).filter((p) => p.solvedEver).length : 0} solved rows</Badge>
          </div>
        </div>

        <div className="hidden border-b border-line bg-elevated/30 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-faint xl:grid xl:grid-cols-[64px_minmax(0,1fr)_180px_160px_120px_70px] xl:items-center xl:gap-3">
          <span className="flex items-center gap-2" title="Solved checkbox">
            <Check className="h-3 w-3" />
            <span>#</span>
          </span>
          <span>Problem</span>
          <span>Section</span>
          <span>Companies</span>
          <span>Status / review</span>
          <span className="text-right">Actions</span>
        </div>

        {visible.length ? (
          <div className="divide-y divide-line/60">
            {visible.map((problem) => (
              <LibraryRow key={problem.id} problem={problem} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No rows match"
            description="Try a broader search or clear one of the filters. The full library always preserves all 211 source rows."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            className="py-16"
          />
        )}

        {totalPages > 1 ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-elevated/25 px-4 py-3 sm:flex-row">
            <p className="text-[10px] text-faint">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <IconButton label="Previous page" size="sm" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              {pageNumbers(safePage, totalPages).map((pageNumber, index) =>
                pageNumber === '…' ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-[10px] text-faint">…</span>
                ) : (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'h-7 min-w-7 rounded-md px-1.5 text-[10px] font-semibold transition',
                      pageNumber === safePage ? 'bg-brand text-canvas' : 'text-muted hover:bg-elevated hover:text-ink',
                    )}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <IconButton label="Next page" size="sm" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col items-start justify-between gap-2 text-[10px] leading-5 text-faint sm:flex-row sm:items-center">
        <p>Companies are logo associations printed in the source sheet — not current hiring-frequency claims. Three marks are unverified.</p>
        <Link to="/report" className="shrink-0 text-muted underline decoration-line underline-offset-4 hover:text-ink">Import validation report</Link>
      </div>
    </div>
  );
}

function LibraryRow({ problem, today }: { problem: Problem; today: string }) {
  const { state, dispatch } = useStore();
  const progress = state.progress[problem.id];
  const next = progress ? getNextDueReview(progress, today) : null;
  return (
    <article className="group px-4 py-3 transition hover:bg-elevated/30 xl:grid xl:grid-cols-[64px_minmax(0,1fr)_180px_160px_120px_70px] xl:items-center xl:gap-3">
      <div className="flex items-start gap-2 xl:items-center">
        <SolvedCheckbox
          problemId={problem.id}
          title={problem.title}
          size="sm"
          className="mt-0.5 xl:mt-0"
        />
        <span className="inline-flex min-w-8 items-center justify-center rounded-md border border-line bg-elevated/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
          {problem.numberText}
        </span>
        <div className="min-w-0 flex-1 xl:hidden">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to={`/problem/${problem.id}`} className="font-display text-sm font-semibold leading-snug text-ink hover:text-brand">{problem.title}</Link>
            <StatusBadge progress={progress} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-faint">
            <span>{problem.topic}</span><span>/</span><span>{problem.subtopic}</span><span>/</span><span>p. {problem.pdfPage}</span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 xl:block">
        <div className="flex items-center gap-2">
          <Link to={`/problem/${problem.id}`} className="truncate text-[12.5px] font-semibold text-ink transition hover:text-brand">{problem.title}</Link>
          {progress?.starred ? <Star className="h-3 w-3 shrink-0 fill-warn text-warn" /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-faint">
          <span>PDF p. {problem.pdfPage}</span>
          {problem.duplicateNumbers.length ? <DuplicateBadge problem={problem} /> : null}
          {progress?.difficulty ? <DifficultyDots value={progress.difficulty} /> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-faint xl:mt-0 xl:block">
        <span className="xl:block text-muted">{problem.topic}</span>
        <span className="xl:mt-0.5 xl:block text-faint">{problem.subtopic}</span>
        <div className="xl:mt-1"><PlatformBadge platform={problem.platform} /></div>
      </div>

      <div className="mt-2 xl:mt-0">
        <CompanyChips companies={problem.companies} max={2} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 xl:mt-0 xl:block">
        <StatusBadge progress={progress} />
        {next ? (
          <Badge
            tone={next.urgency === 'overdue' ? 'bad' : next.urgency === 'today' ? 'warn' : 'neutral'}
            className="ml-1"
          >
            {relativeDueLabel(next.dueOn, today)}
          </Badge>
        ) : progress?.solvedEver ? (
          <span className="ml-1 text-[10px] text-faint">cycle complete</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-1 xl:mt-0 xl:justify-end">
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_STAR', problemId: problem.id })}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-elevated',
            progress?.starred ? 'text-warn' : 'text-faint hover:text-warn',
          )}
          aria-label={progress?.starred ? 'Remove star' : 'Star problem'}
          title={progress?.starred ? 'Remove star' : 'Star problem'}
        >
          <Star className={cn('h-3.5 w-3.5', progress?.starred && 'fill-warn')} />
        </button>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-elevated hover:text-brand"
          aria-label={`Open ${problem.title} on ${problem.platform}`}
          title={`Live-verified link · checked ${problem.linkCheckedAt}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Link
          to={`/problem/${problem.id}`}
          className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-muted transition hover:bg-elevated hover:text-ink"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {progress?.firstSolvedOn ? (
        <span className="sr-only">First solved {formatDateKey(progress.firstSolvedOn)}</span>
      ) : null}
    </article>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="rounded-full p-0.5 hover:bg-brand/20">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function pageNumbers(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | '…'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('…');
    result.push(page);
  });
  return result;
}
