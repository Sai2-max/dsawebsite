import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  Coffee,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import type { DueReview, Problem } from '../types';
import { addDays, formatDateKey, relativeDueLabel, todayKey } from '../lib/dates';
import { getNextDueReview, REVISION_STAGE_LABELS } from '../lib/revision';
import { getProblem } from '../lib/dataset';
import { useStore } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { Badge, DifficultyDots } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TimerControls } from './Timer';
import { cn } from '../lib/utils';
import { CompanyChips, DuplicateBadge, StatusBadge } from './ProblemBits';
import { SolvedCheckbox } from './SolvedCheckbox';
import { elapsedSeconds } from '../lib/timer';

export function ProblemCard({
  problem,
  compact = false,
  showCompanies = true,
}: {
  problem: Problem;
  compact?: boolean;
  showCompanies?: boolean;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const progress = state.progress[problem.id];
  const solvedEver = progress?.solvedEver ?? false;
  const timer = state.timer?.problemId === problem.id ? state.timer : null;
  const nextReview = progress ? getNextDueReview(progress, todayKey()) : null;
  const today = todayKey();

  const log = (outcome: 'solved' | 'attempted' | 'needs_practice') => {
    const seconds =
      timer && state.timer?.problemId === problem.id
        ? Math.round(elapsedSeconds(state.timer, Date.now()))
        : 0;
    dispatch({ type: 'LOG_ATTEMPT', problemId: problem.id, outcome, seconds });
    if (outcome === 'solved') {
      toast(`Solved. Day 1 review scheduled for ${formatDateKey(addDays(today, 1), { month: 'short', day: 'numeric' })}.`, 'success');
    } else if (outcome === 'attempted') {
      toast('Attempt logged. Keep going.', 'success');
    } else {
      toast('Marked for practice. It will stay in your practice queue.', 'info');
    }
  };

  const skip = () => {
    dispatch({ type: 'MARK_SKIPPED', problemId: problem.id });
    toast('Skipped. You can restore it from the Library.', 'info');
  };

  return (
    <article
      className={cn(
        'card card-hover group relative flex flex-col p-4 sm:p-5',
        nextReview?.urgency === 'overdue' && 'border-bad/30',
        nextReview?.urgency === 'today' && 'border-warn/30',
      )}
    >
      <div className="flex items-start gap-3">
        <SolvedCheckbox
          problemId={problem.id}
          title={problem.title}
          size="sm"
          className="mt-1"
        />
        <span className="mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-line bg-elevated px-1.5 font-mono text-[11px] font-semibold text-muted">
          {problem.numberText}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              to={`/problem/${problem.id}`}
              className="font-display text-[15px] font-semibold leading-snug text-ink transition hover:text-brand sm:text-base"
            >
              {problem.title}
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge progress={progress} />
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
            <span>{problem.topic}</span>
            <span className="text-line">/</span>
            <span>{problem.subtopic}</span>
            <span className="text-line">/</span>
            <span>PDF p. {problem.pdfPage}</span>
            {progress?.difficulty ? <DifficultyDots value={progress.difficulty} className="ml-1" /> : null}
          </div>
        </div>
      </div>

      {!compact && (problem.duplicateNumbers.length > 0 || nextReview) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DuplicateBadge problem={problem} />
          {nextReview ? (
            <Badge
              tone={nextReview.urgency === 'overdue' ? 'bad' : nextReview.urgency === 'today' ? 'warn' : 'neutral'}
              dot
            >
              {relativeDueLabel(nextReview.dueOn, today)}
            </Badge>
          ) : null}
          {progress?.attempts.length ? (
            <span className="text-[11px] text-faint">{progress.attempts.length} attempt{progress.attempts.length === 1 ? '' : 's'}</span>
          ) : null}
        </div>
      ) : null}

      {showCompanies && !compact ? (
        <div className="mt-3">
          <CompanyChips companies={problem.companies} max={4} />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3.5">
        <TimerControls problemId={problem.id} compact />
        <Button
          size="sm"
          variant="primary"
          onClick={() => log('solved')}
          icon={<Check className="h-3.5 w-3.5" />}
        >
          {solvedEver ? 'Solve again' : 'Solve'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => log('attempted')}
          icon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          Attempt
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => log('needs_practice')}
          icon={<Coffee className="h-3.5 w-3.5" />}
          className="text-warn hover:text-warn"
        >
          Practice
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {!solvedEver ? (
            <IconButton label="Skip for now" size="sm" onClick={skip}>
              <Circle className="h-3.5 w-3.5" />
            </IconButton>
          ) : null}
          <Link
            to={`/problem/${problem.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:bg-elevated hover:text-ink"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ReviewCard({ review }: { review: DueReview }) {
  const { dispatch } = useStore();
  const { toast } = useToast();
  const problem = getProblem(review.problemId);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(addDays(todayKey(), 1));
  if (!problem) return null;

  const stages = review.cycle.stages;
  const stageLabel = REVISION_STAGE_LABELS[review.stage.stage - 1];
  const dueTone: 'bad' | 'warn' = review.urgency === 'overdue' ? 'bad' : 'warn';

  const complete = () => {
    dispatch({
      type: 'COMPLETE_REVIEW',
      problemId: problem.id,
      cycleId: review.cycle.id,
      stage: review.stage.stage,
    });
    toast(`${stageLabel} review completed for #${problem.number}.`, 'success');
  };

  const snooze = () => {
    dispatch({
      type: 'SNOOZE_REVIEW',
      problemId: problem.id,
      cycleId: review.cycle.id,
      stage: review.stage.stage,
      newDate: snoozeDate,
    });
    setSnoozeOpen(false);
    toast(`Review moved to ${formatDateKey(snoozeDate, { month: 'short', day: 'numeric' })}.`, 'success');
  };

  return (
    <>
      <article
        className={cn(
          'card relative overflow-hidden p-4 sm:p-5',
          review.urgency === 'overdue' ? 'border-bad/30' : 'border-warn/25',
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-0.5',
            review.urgency === 'overdue' ? 'bg-bad' : 'bg-warn',
          )}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={dueTone} dot>
                {relativeDueLabel(review.dueOn, todayKey())}
              </Badge>
              <Badge tone="violet">{stageLabel}</Badge>
              <span className="text-[11px] text-faint">Cycle {review.cycle.cycleNumber}</span>
              {review.stage.snoozedTo ? (
                <span className="text-[11px] text-faint">Originally {formatDateKey(review.stage.dueOn)}</span>
              ) : null}
            </div>
            <Link
              to={`/problem/${problem.id}`}
              className="mt-2 block font-display text-base font-semibold leading-snug text-ink transition hover:text-brand"
            >
              #{problem.number} · {problem.title}
            </Link>
            <p className="mt-1 text-xs text-faint">
              {problem.topic} / {problem.subtopic}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="sm" variant="success" onClick={complete} icon={<Check className="h-3.5 w-3.5" />}>
              Mark reviewed
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSnoozeDate(addDays(todayKey(), 1));
                setSnoozeOpen(true);
              }}
              icon={<Clock3 className="h-3.5 w-3.5" />}
            >
              Snooze
            </Button>
            <Link
              to={`/problem/${problem.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-muted transition hover:bg-elevated hover:text-ink"
            >
              Open <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-line/70 pt-3">
          {stages.map((stage) => {
            const isCurrent = stage.stage === review.stage.stage;
            return (
              <div key={stage.stage} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold',
                    stage.completedOn
                      ? 'border-good/40 bg-good/15 text-good'
                      : isCurrent
                        ? 'border-warn/50 bg-warn/15 text-warn'
                        : 'border-line bg-elevated text-faint',
                  )}
                  title={`${REVISION_STAGE_LABELS[stage.stage - 1]}${stage.completedOn ? ` · completed ${stage.completedOn}` : ''}`}
                >
                  {stage.completedOn ? <Check className="h-3 w-3" /> : stage.stage}
                </span>
                <span
                  className={cn(
                    'hidden text-[10px] font-medium sm:block',
                    stage.completedOn ? 'text-good' : isCurrent ? 'text-warn' : 'text-faint',
                  )}
                >
                  {REVISION_STAGE_LABELS[stage.stage - 1]}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      <Modal
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        title="Snooze review"
        description="Snoozing explicitly changes this review date. The original Day 1/3/7/30 schedule and the snooze history are preserved."
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setSnoozeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={snooze} icon={<CalendarClock className="h-4 w-4" />}>
              Move review
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 7].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setSnoozeDate(addDays(todayKey(), days))}
              className="rounded-xl border border-line bg-elevated/60 px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:text-ink"
            >
              +{days} day{days === 1 ? '' : 's'}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label htmlFor={`snooze-${review.problemId}`} className="label">
            New review date
          </label>
          <input
            id={`snooze-${review.problemId}`}
            type="date"
            className="input"
            min={todayKey()}
            value={snoozeDate}
            onChange={(event) => setSnoozeDate(event.target.value)}
          />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-canvas/40 p-3 text-[11px] leading-5 text-faint">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Marking reviewed advances to the next Day 1/3/7/30 stage. Overdue reviews stay overdue until you complete or snooze them.
        </div>
      </Modal>
    </>
  );
}
