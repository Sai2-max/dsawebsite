import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  ExternalLink,
  Flame,
  RefreshCcw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import type { CompanyRef, Problem, ProblemProgress } from '../types';
import { Badge, DifficultyDots } from './ui/Badge';
import { cn } from '../lib/utils';
import { useStore } from '../store/StoreContext';
import { useToast } from './ui/Toast';

export function StatusBadge({ progress }: { progress?: ProblemProgress }) {
  if (!progress) return <Badge dot>New</Badge>;
  if (progress.solvedEver && progress.status === 'attempted') {
    return <Badge tone="violet" dot>Reattempting</Badge>;
  }
  switch (progress.status) {
    case 'solved':
      return <Badge tone="good" dot>Solved</Badge>;
    case 'attempted':
      return <Badge tone="brand" dot>Attempted</Badge>;
    case 'needs_practice':
      return <Badge tone="warn" dot>Needs practice</Badge>;
    case 'skipped':
      return <Badge tone="neutral" dot>Skipped</Badge>;
    case 'new':
    default:
      return <Badge dot>New</Badge>;
  }
}

export function StatusIcon({ status }: { status: ProblemProgress['status'] }) {
  if (status === 'solved') return <CheckCircle2 className="h-4 w-4 text-good" />;
  if (status === 'needs_practice') return <TriangleAlert className="h-4 w-4 text-warn" />;
  if (status === 'skipped') return <CircleSlash className="h-4 w-4 text-faint" />;
  if (status === 'attempted') return <RefreshCcw className="h-4 w-4 text-brand" />;
  return <CircleDashed className="h-4 w-4 text-faint" />;
}

export function PlatformBadge({ platform }: { platform: Problem['platform'] }) {
  return (
    <Badge tone={platform === 'LeetCode' ? 'brand' : 'good'}>
      {platform === 'LeetCode' ? 'LeetCode' : 'GFG'}
    </Badge>
  );
}

export function CompanyChips({
  companies,
  max = 3,
  interactive = false,
  className,
}: {
  companies: CompanyRef[];
  max?: number;
  interactive?: boolean;
  className?: string;
}) {
  if (!companies.length) return <span className="text-xs text-faint">No company logo</span>;
  const shown = companies.slice(0, max);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((company) => {
        const chip = (
          <span
            className="inline-flex max-w-[9.5rem] items-center gap-1 truncate rounded-md border border-line bg-elevated/70 px-1.5 py-0.5 text-[10.5px] font-medium text-muted"
            title={`${company.name} · source logo association${company.confidence === 'medium' ? ' (medium confidence)' : ''}`}
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-brand/70" />
            <span className="truncate">{company.name}</span>
            {company.confidence === 'medium' ? <span className="text-warn">~</span> : null}
          </span>
        );
        return interactive ? (
          <Link key={company.name} to={`/library?company=${encodeURIComponent(company.name)}`} className="hover:opacity-80">
            {chip}
          </Link>
        ) : (
          <span key={company.name}>{chip}</span>
        );
      })}
      {companies.length > max ? (
        <span className="text-[10.5px] font-medium text-faint">+{companies.length - max}</span>
      ) : null}
    </div>
  );
}

export function SourceLinks({ problem, compact = false }: { problem: Problem; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={problem.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition hover:text-brand/80"
        title={`Link from the PDF, live-verified ${problem.linkCheckedAt}`}
      >
        {compact ? 'Solve' : `Open on ${problem.platform}`}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={problem.searchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-ink"
        title="Clearly labelled fallback search link"
      >
        <Search className="h-3 w-3" />
        Search
      </a>
    </div>
  );
}

export function DuplicateBadge({ problem }: { problem: Problem }) {
  if (!problem.duplicateNumbers.length) return null;
  return (
    <Badge tone="warn" className="gap-1">
      Duplicate · #{problem.duplicateNumbers.join(', #')}
    </Badge>
  );
}

export function DifficultySummary({ value }: { value?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <DifficultyDots value={value} />
      <span>{value ? `${value}/5` : 'Unrated'}</span>
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function InlineLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand/80"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function UnverifiedLogoNote({ count }: { count: number }) {
  if (!count) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-5 text-warn/90">
      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
      {count} logo mark{count > 1 ? 's' : ''} on this row could not be identified. No company name was guessed.
    </p>
  );
}

export function useProblemActions(problem: Problem) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const timer = state.timer?.problemId === problem.id ? state.timer : null;
  const stopTimerAndLog = (outcome: 'attempted' | 'solved' | 'needs_practice', seconds: number) => {
    dispatch({ type: 'LOG_ATTEMPT', problemId: problem.id, outcome, seconds });
  };
  return { state, dispatch, toast, timer, stopTimerAndLog };
}

export function FlameBadge({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/20 bg-warn/10 px-2.5 py-1 text-[11px] font-semibold text-warn">
      <Flame className="h-3.5 w-3.5" />
      {streak} day streak
    </span>
  );
}
