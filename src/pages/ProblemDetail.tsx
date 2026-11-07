import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock3,
  Coffee,
  ExternalLink,
  FileText,
  History,
  Info,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { getProblem, getProblemByNumber } from '../lib/dataset';
import { useStore, useToday } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import {
  addDays,
  formatDateKey,
  formatDuration,
  formatMinutes,
  relativeDueLabel,
  toDateKey,
} from '../lib/dates';
import {
  effectiveDueOn,
  getCurrentCycle,
  getNextDueReview,
  getOpenStage,
  REVISION_STAGE_LABELS,
} from '../lib/revision';
import { elapsedSeconds } from '../lib/timer';
import { CompanyChips, DuplicateBadge, PlatformBadge, SourceLinks, StatusBadge, UnverifiedLogoNote } from '../components/ProblemBits';
import { SolvedCheckbox } from '../components/SolvedCheckbox';
import { Badge, DifficultyDots } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, TextArea } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/Progress';
import { TimerControls } from '../components/Timer';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import type { ProblemProgress } from '../types';

const difficultyLabels: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very hard',
};

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const problem = id ? getProblem(id) : undefined;
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const today = useToday();

  if (!problem) {
    return (
      <div className="card">
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Problem not found"
          description="That problem ID does not exist in the imported sheet."
          action={<Link to="/library" className="inline-flex h-9 items-center rounded-lg border border-line bg-elevated px-3 text-xs font-semibold text-ink">Back to library</Link>}
        />
      </div>
    );
  }

  return <ProblemDetailContent problem={problem} state={state} dispatch={dispatch} toast={toast} today={today} />;
}

function ProblemDetailContent({
  problem,
  state,
  dispatch,
  toast,
  today,
}: {
  problem: NonNullable<ReturnType<typeof getProblem>>;
  state: ReturnType<typeof useStore>['state'];
  dispatch: ReturnType<typeof useStore>['dispatch'];
  toast: ReturnType<typeof useToast>['toast'];
  today: string;
}) {
  const progress = state.progress[problem.id];
  const timer = state.timer?.problemId === problem.id ? state.timer : null;
  const nextReview = progress ? getNextDueReview(progress, today) : null;
  const currentCycle = progress ? getCurrentCycle(progress) : undefined;
  const [notes, setNotes] = useState(progress?.notes ?? '');
  const [timeComplexity, setTimeComplexity] = useState(progress?.timeComplexity ?? '');
  const [spaceComplexity, setSpaceComplexity] = useState(progress?.spaceComplexity ?? '');
  const [mistakes, setMistakes] = useState(progress?.mistakes ?? '');
  const [learnings, setLearnings] = useState(progress?.learnings ?? '');
  const [difficulty, setDifficulty] = useState<number | undefined>(progress?.difficulty);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(addDays(today, 1));

  useEffect(() => {
    setNotes(progress?.notes ?? '');
    setTimeComplexity(progress?.timeComplexity ?? '');
    setSpaceComplexity(progress?.spaceComplexity ?? '');
    setMistakes(progress?.mistakes ?? '');
    setLearnings(progress?.learnings ?? '');
    setDifficulty(progress?.difficulty);
    // Reset the editor only when navigating to another problem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  const [selectedOutcome, setSelectedOutcome] = useState<'solved' | 'attempted' | 'needs_practice' | null>(null);

  const dirty =
    notes !== (progress?.notes ?? '') ||
    timeComplexity !== (progress?.timeComplexity ?? '') ||
    spaceComplexity !== (progress?.spaceComplexity ?? '') ||
    mistakes !== (progress?.mistakes ?? '') ||
    learnings !== (progress?.learnings ?? '') ||
    difficulty !== progress?.difficulty;

  const totalSeconds = (progress?.attempts ?? []).reduce((total, attempt) => total + attempt.seconds, 0);
  const prev = getProblemByNumber(problem.number - 1);
  const next = getProblemByNumber(problem.number + 1);
  const duplicates = problem.duplicateNumbers.map((number) => getProblemByNumber(number)).filter(Boolean);

  const secondsForAction = () => (timer ? Math.round(elapsedSeconds(timer, Date.now())) : 0);

  const log = (outcome: 'solved' | 'attempted' | 'needs_practice') => {
    dispatch({ type: 'LOG_ATTEMPT', problemId: problem.id, outcome, seconds: secondsForAction() });
    if (outcome === 'solved') {
      toast(`Solved. Day 1 review scheduled for ${formatDateKey(addDays(today, 1), { month: 'short', day: 'numeric' })}.`, 'success');
    } else if (outcome === 'attempted') {
      toast('Session logged. The row stays on Today’s plan so you can finish it.', 'success');
    } else {
      toast('Marked for another pass. It will appear in your practice queue.', 'info');
    }
  };

  const commitLog = () => {
    if (!selectedOutcome) return;
    log(selectedOutcome);
    setSelectedOutcome(null);
  };

  const saveDetails = () => {
    dispatch({
      type: 'SAVE_DETAILS',
      problemId: problem.id,
      patch: {
        notes,
        timeComplexity,
        spaceComplexity,
        mistakes,
        learnings,
        difficulty: difficulty as ProblemProgress['difficulty'],
      },
    });
    toast('Problem notes saved.', 'success');
  };

  const completeReview = () => {
    if (!nextReview) return;
    dispatch({
      type: 'COMPLETE_REVIEW',
      problemId: problem.id,
      cycleId: nextReview.cycle.id,
      stage: nextReview.stage.stage,
    });
    toast(`${REVISION_STAGE_LABELS[nextReview.stage.stage - 1]} review completed.`, 'success');
  };

  const snooze = () => {
    if (!nextReview) return;
    dispatch({
      type: 'SNOOZE_REVIEW',
      problemId: problem.id,
      cycleId: nextReview.cycle.id,
      stage: nextReview.stage.stage,
      newDate: snoozeDate,
    });
    setSnoozeOpen(false);
    toast(`Review moved to ${formatDateKey(snoozeDate, { month: 'short', day: 'numeric' })}.`, 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to library
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] text-faint">
          <span>Row {problem.number} of 211</span>
          <span className="text-line">/</span>
          <span>PDF p. {problem.pdfPage}</span>
          <span className="text-line">/</span>
          <span className="hidden sm:inline">printed p. {problem.printedPage}</span>
        </div>
      </div>

      <header className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 px-1.5 font-mono text-[11px] font-semibold text-brand">{problem.numberText}</span>
              <Badge tone="neutral">{problem.topic}</Badge>
              <span className="text-[10px] text-faint">{problem.subtopic}</span>
              <PlatformBadge platform={problem.platform} />
              {problem.duplicateNumbers.length ? <DuplicateBadge problem={problem} /> : null}
            </div>
            <h1 className="mt-3 text-balance font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">{problem.title}</h1>
            {problem.titleCorrected ? (
              <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-5 text-faint">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                PDF source title: “{problem.sourceTitle}”. The display title was expanded from the verified problem metadata.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SolvedCheckbox
                problemId={problem.id}
                title={problem.title}
                size="md"
                showLabel
                className="mr-1 rounded-lg border border-line/80 bg-elevated/55 px-2.5 py-1.5 hover:border-good/35"
              />
              <StatusBadge progress={progress} />
              {progress?.starred ? <Badge tone="warn" dot>Starred</Badge> : null}
              {progress?.attempts.length ? <span className="text-[10.5px] text-faint">{progress.attempts.length} attempt{progress.attempts.length === 1 ? '' : 's'} · {formatMinutes(totalSeconds / 60)}</span> : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SourceLinks problem={problem} />
              <a
                href={`/dsa-sheet.pdf#page=${problem.pdfPage}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-ink"
              >
                <FileText className="h-3 w-3" /> Source PDF
              </a>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant={progress?.starred ? 'subtle' : 'secondary'}
              size="md"
              onClick={() => dispatch({ type: 'TOGGLE_STAR', problemId: problem.id })}
              icon={<Star className={cn('h-4 w-4', progress?.starred && 'fill-warn text-warn')} />}
            >
              {progress?.starred ? 'Starred' : 'Star'}
            </Button>
            <TimerControls problemId={problem.id} allowClear />
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="min-w-0 space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Log a session</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">What happened in this session?</h2>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  Pick one outcome below, then press Log this session. Everything is saved automatically — nothing is overwritten or lost.
                </p>
              </div>
              {timer ? (
                <Badge tone={timer.running ? 'brand' : 'warn'} dot>
                  {timer.running ? `Timer running · ${formatDuration(elapsedSeconds(timer, Date.now()))}` : 'Timer paused'}
                </Badge>
              ) : (
                <Badge tone="neutral">No timer running</Badge>
              )}
            </div>

            <div role="radiogroup" aria-label="Session outcome" className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {[
                {
                  value: 'solved' as const,
                  label: progress?.solvedEver ? 'Solved again' : 'Solved it',
                  icon: CheckCircle2,
                  iconClass: 'border-good/25 bg-good/10 text-good',
                  hint: 'Checks the row done and schedules Day 1 / 3 / 7 / 30 reviews automatically.',
                },
                {
                  value: 'attempted' as const,
                  label: 'Tried, not solved',
                  icon: RotateCcw,
                  iconClass: 'border-brand/25 bg-brand/10 text-brand',
                  hint: 'Saves this session — time and notes go to your history and the row stays on Today’s plan to finish.',
                },
                {
                  value: 'needs_practice' as const,
                  label: 'Needs practice',
                  icon: Coffee,
                  iconClass: 'border-warn/25 bg-warn/10 text-warn',
                  hint: 'Flags the row for a later pass and adds it to the practice queue. No revision dates are scheduled.',
                },
              ].map((option) => {
                const active = selectedOutcome === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedOutcome(option.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                      active
                        ? 'border-brand/50 bg-brand/10 shadow-[0_0_0_3px_rgb(var(--brand)/0.08)]'
                        : 'border-line bg-canvas/40 hover:border-brand/35 hover:bg-elevated/60',
                    )}
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', option.iconClass)}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-faint">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/70 pt-4">
              <Button variant="primary" size="md" disabled={!selectedOutcome} onClick={commitLog} icon={<Check className="h-4 w-4" />}>Log this session</Button>
              <p className="text-[10.5px] text-faint">
                {selectedOutcome
                  ? selectedOutcome === 'solved'
                    ? 'Ready to log a solved session with a Day 1 / 3 / 7 / 30 revision cycle.'
                    : selectedOutcome === 'attempted'
                      ? 'Ready to log your time and notes — the row stays on your plan.'
                      : 'Ready to flag this row for another pass.'
                  : 'Select an outcome above, then log it.'}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-faint">
              <span className="font-semibold text-muted">Other actions:</span>
              {progress?.solvedEver && progress.status !== 'attempted' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'START_REATTEMPT', problemId: problem.id });
                    toast('Reattempt started. History and the old review cycle are preserved.', 'info');
                  }}
                  icon={<History className="h-3.5 w-3.5" />}
                >
                  Start reattempt
                </Button>
              ) : null}
              {!progress?.solvedEver ? (
                <Button variant="ghost" size="sm" onClick={() => {
                  dispatch({ type: 'MARK_SKIPPED', problemId: problem.id });
                  toast('Skipped. Restore it here or from the library filter.', 'info');
                }} icon={<CircleSlash className="h-3.5 w-3.5" />}>Skip this problem</Button>
              ) : null}
              {progress?.status === 'skipped' ? (
                <Button variant="subtle" size="sm" onClick={() => {
                  dispatch({ type: 'RESTORE_PROBLEM', problemId: problem.id });
                  toast('Problem restored to your queue.', 'success');
                }} icon={<RotateCcw className="h-3.5 w-3.5" />}>Restore</Button>
              ) : null}
              {progress?.solvedEver ? (
                <span className="text-[10px] text-faint">A new solve archives the open cycle and starts a fresh one — history is never deleted.</span>
              ) : null}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Working notes</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">Approach, complexity & lessons</h2>
              </div>
              <div className="flex items-center gap-2">
                {dirty ? <Badge tone="warn" dot>Unsaved</Badge> : <Badge tone="good" dot>Saved</Badge>}
                <Button variant="primary" size="sm" onClick={saveDetails} disabled={!dirty} icon={<Save className="h-3.5 w-3.5" />}>Save</Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Approach / notes" htmlFor="notes">
                <TextArea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Key idea, invariant, edge cases…"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Time complexity" htmlFor="time-complexity">
                  <input id="time-complexity" className="input font-mono text-xs" value={timeComplexity} onChange={(event) => setTimeComplexity(event.target.value)} placeholder="O(n log n)" />
                </Field>
                <Field label="Space complexity" htmlFor="space-complexity">
                  <input id="space-complexity" className="input font-mono text-xs" value={spaceComplexity} onChange={(event) => setSpaceComplexity(event.target.value)} placeholder="O(1)" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mistakes made" htmlFor="mistakes" hint="What tripped you up? Keep it concrete.">
                  <TextArea id="mistakes" value={mistakes} onChange={(event) => setMistakes(event.target.value)} placeholder="Off-by-one in the right boundary…" className="min-h-24" />
                </Field>
                <Field label="Learnings" htmlFor="learnings" hint="The reusable pattern or insight.">
                  <TextArea id="learnings" value={learnings} onChange={(event) => setLearnings(event.target.value)} placeholder="When the array is sorted, think two pointers…" className="min-h-24" />
                </Field>
              </div>
              <Field label="Personal difficulty (1–5)" htmlFor="difficulty">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-line bg-canvas/50 p-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDifficulty(difficulty === value ? undefined : value)}
                        className={cn(
                          'flex h-8 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition',
                          difficulty === value ? 'bg-brand text-canvas' : 'text-muted hover:bg-elevated hover:text-ink',
                        )}
                        aria-pressed={difficulty === value}
                        title={difficultyLabels[value]}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-faint">{difficulty ? difficultyLabels[difficulty] : 'Not rated · click a value'}</span>
                </div>
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Attempt history</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">Every session is kept</h2>
              </div>
              <Badge tone="violet">{progress?.attempts.length ?? 0} total</Badge>
            </div>
            {progress?.attempts.length ? (
              <div className="mt-4 divide-y divide-line/60">
                {[...progress.attempts].reverse().map((attempt) => (
                  <div key={attempt.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                      attempt.outcome === 'solved' ? 'border-good/25 bg-good/10 text-good' :
                      attempt.outcome === 'needs_practice' ? 'border-warn/25 bg-warn/10 text-warn' :
                      'border-brand/25 bg-brand/10 text-brand',
                    )}>
                      {attempt.outcome === 'solved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : attempt.outcome === 'needs_practice' ? <Coffee className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium capitalize text-ink">{attempt.outcome.replace('_', ' ')}</p>
                      <p className="text-[10px] text-faint">{formatDateKey(toDateKey(new Date(attempt.createdAt)), { month: 'short', day: 'numeric' })} · {new Date(attempt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {attempt.seconds > 0 ? <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted"><Timer className="h-3 w-3" /> {formatDuration(attempt.seconds)}</span> : <span className="text-[10px] text-faint">no timer</span>}
                    {attempt.note ? <p className="w-full text-[10.5px] text-faint sm:w-auto sm:flex-1">{attempt.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<History className="h-5 w-5" />} title="No attempts yet" description="Start a timer or log an attempt to build the history." className="py-8" />
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Revisions</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">Day 1 / 3 / 7 / 30 history</h2>
              </div>
              <Badge tone="violet">{progress?.cycles.length ?? 0} cycle{progress?.cycles.length === 1 ? '' : 's'}</Badge>
            </div>
            {progress?.cycles.length ? (
              <div className="mt-4 space-y-3">
                {[...progress.cycles].reverse().map((cycle) => (
                  <div key={cycle.id} className="rounded-xl border border-line bg-elevated/35 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-ink">Cycle {cycle.cycleNumber}</span>
                        <span className="text-[10px] text-faint">started {formatDateKey(cycle.startedOn, { month: 'short', day: 'numeric' })}</span>
                      </div>
                      {cycle.archivedOn ? <Badge tone="neutral">archived</Badge> : cycle.completedOn ? <Badge tone="good">complete</Badge> : <Badge tone="brand" dot>open</Badge>}
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {cycle.stages.map((stage) => (
                        <div key={stage.stage} className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border text-[8px]', stage.completedOn ? 'border-good/30 bg-good/10 text-good' : 'border-line bg-canvas/40 text-faint')}>
                            {stage.completedOn ? <Check className="h-2.5 w-2.5" /> : stage.stage}
                          </span>
                          <span className="w-11 font-medium text-muted">{REVISION_STAGE_LABELS[stage.stage - 1]}</span>
                          <span className="text-faint">due {formatDateKey(stage.dueOn, { month: 'short', day: 'numeric' })}</span>
                          {stage.snoozedTo ? <span className="text-warn">→ {formatDateKey(stage.snoozedTo, { month: 'short', day: 'numeric' })}</span> : null}
                          {stage.completedOn ? <span className="ml-auto text-good">completed {formatDateKey(stage.completedOn, { month: 'short', day: 'numeric' })}</span> : !cycle.archivedOn && getOpenStage(cycle)?.stage === stage.stage ? <span className="ml-auto text-warn">{relativeDueLabel(effectiveDueOn(stage), today)}</span> : null}
                        </div>
                      ))}
                    </div>
                    {cycle.archivedReason ? <p className="mt-2 text-[9.5px] text-faint">Archived: {cycle.archivedReason}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No revision cycle" description="Solve this problem to schedule Day 1, 3, 7 and 30 reviews." className="py-8" />
            )}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className={cn('card p-5', nextReview?.urgency === 'overdue' && 'border-bad/30')}>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Next revision</p>
              {nextReview ? (
                <Badge tone={nextReview.urgency === 'overdue' ? 'bad' : nextReview.urgency === 'today' ? 'warn' : 'brand'} dot>
                  {nextReview.urgency === 'overdue' ? 'Overdue' : nextReview.urgency === 'today' ? 'Due today' : 'Upcoming'}
                </Badge>
              ) : <Badge tone={progress?.solvedEver ? 'good' : 'neutral'}>{progress?.solvedEver ? 'Complete' : 'Not scheduled'}</Badge>}
            </div>
            {nextReview ? (
              <>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="font-display text-xl font-semibold text-ink">{REVISION_STAGE_LABELS[nextReview.stage.stage - 1]}</p>
                    <p className={cn('mt-1 text-[11px]', nextReview.urgency === 'overdue' ? 'text-bad' : 'text-muted')}>
                      {formatDateKey(nextReview.dueOn, { weekday: 'short', month: 'short', day: 'numeric' })} · {relativeDueLabel(nextReview.dueOn, today)}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-faint">cycle {nextReview.cycle.cycleNumber}</span>
                </div>
                {nextReview.stage.snoozedTo ? <p className="mt-2 text-[10px] text-warn">Snoozed from {formatDateKey(nextReview.stage.dueOn)}.</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="success" onClick={completeReview} icon={<Check className="h-3.5 w-3.5" />}>Mark reviewed</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setSnoozeDate(addDays(today, 1)); setSnoozeOpen(true); }} icon={<Clock3 className="h-3.5 w-3.5" />}>Snooze</Button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[11px] leading-5 text-muted">
                {progress?.solvedEver
                  ? 'All four stages are complete. Start a reattempt and solve again to open a fresh cycle.'
                  : 'Solve this problem to start a Day 1 / 3 / 7 / 30 review cycle.'}
              </p>
            )}
            {currentCycle ? (
              <div className="mt-4 border-t border-line/70 pt-3">
                <div className="flex items-center justify-between text-[10px] text-faint">
                  <span>Cycle progress</span>
                  <span>{currentCycle.stages.filter((stage) => stage.completedOn).length}/4</span>
                </div>
                <ProgressBar value={currentCycle.stages.filter((stage) => stage.completedOn).length} max={4} height="h-1.5" className="mt-1.5" tone={nextReview?.urgency === 'overdue' ? 'bad' : 'good'} />
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <p className="eyebrow">Snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Snapshot label="Status" value={<StatusBadge progress={progress} />} />
              <Snapshot label="Attempts" value={String(progress?.attempts.length ?? 0)} />
              <Snapshot label="Focused" value={formatMinutes(totalSeconds / 60)} />
              <Snapshot label="Personal difficulty" value={<DifficultyDots value={progress?.difficulty} />} />
              <Snapshot label="First solved" value={progress?.firstSolvedOn ? formatDateKey(progress.firstSolvedOn, { month: 'short', day: 'numeric' }) : '—'} />
              <Snapshot label="Last solved" value={progress?.lastSolvedOn ? formatDateKey(progress.lastSolvedOn, { month: 'short', day: 'numeric' }) : '—'} />
            </div>
            <div className="mt-4 border-t border-line/70 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Companies in source</p>
              <CompanyChips companies={problem.companies} max={10} interactive className="mt-2" />
              {problem.unverifiedLogoCount ? <div className="mt-2"><UnverifiedLogoNote count={problem.unverifiedLogoCount} /></div> : null}
              <p className="mt-2 text-[9.5px] leading-4 text-faint">Logo associations only. Not a claim about current interview frequency.</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="eyebrow">Source & links</p>
            <div className="mt-3 space-y-2.5 text-[11px]">
              <MetaRow label="Topic" value={`${problem.topicSourceNumber} · ${problem.topic}`} />
              <MetaRow label="Subtopic" value={problem.subtopic} />
              <MetaRow label="PDF page" value={`${problem.pdfPage} (printed ${problem.printedPage})`} />
              <MetaRow label="Platform" value={problem.platform} />
              <MetaRow label="Row" value={`${problem.number} of 211`} />
              <MetaRow label="Unique canonical" value={`#${problem.canonicalNumber}`} />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-good/20 bg-good/5 p-2.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />
              <p className="text-[10px] leading-4 text-muted">Practice link live-checked {problem.linkCheckedAt}. A clearly labelled Google search fallback is always available.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={problem.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-2.5 text-[11px] font-semibold text-brand hover:bg-brand/15">
                <ExternalLink className="h-3 w-3" /> {problem.platform}
              </a>
              <a href={problem.searchUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-elevated px-2.5 text-[11px] font-semibold text-muted hover:text-ink">
                <Search className="h-3 w-3" /> Search fallback
              </a>
              <a href={`/dsa-sheet.pdf#page=${problem.pdfPage}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-elevated px-2.5 text-[11px] font-semibold text-muted hover:text-ink">
                <FileText className="h-3 w-3" /> PDF
              </a>
            </div>
          </div>

          {duplicates.length ? (
            <div className="card border-warn/25 p-5">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-warn" />
                <p className="text-[11px] font-semibold text-ink">Duplicate row in the sheet</p>
              </div>
              <p className="mt-2 text-[10.5px] leading-5 text-faint">Both rows are preserved. They count once toward unique-problem stats.</p>
              <div className="mt-3 space-y-2">
                {duplicates.map((duplicate) => duplicate ? (
                  <Link key={duplicate.id} to={`/problem/${duplicate.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-elevated/50 px-2.5 py-2 text-[11px] text-ink hover:border-warn/30">
                    <span className="font-mono text-[10px] text-faint">#{duplicate.number}</span>
                    <span className="truncate">{duplicate.title}</span>
                    <Badge className="ml-auto" tone="neutral">{duplicate.topic}</Badge>
                  </Link>
                ) : null)}
              </div>
            </div>
          ) : null}

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet" />
              <p className="text-[11px] font-semibold text-ink">Source fidelity</p>
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-faint">
              Imported from the Bosscoder DSA Sheet. Source title and page are preserved. See the import report for link checks, duplicate groups and unverified logo marks.
            </p>
            <Link to="/report" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand hover:text-brand/80">Open import report <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </aside>
      </div>

      <nav className="flex flex-col items-stretch justify-between gap-3 border-t border-line/70 pt-4 sm:flex-row">
        {prev ? (
          <Link to={`/problem/${prev.id}`} className="group flex items-center gap-3 rounded-xl border border-line bg-surface/70 p-3 transition hover:border-brand/35 sm:w-[48%]">
            <ChevronLeft className="h-4 w-4 shrink-0 text-faint group-hover:text-brand" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.1em] text-faint">Previous row</p>
              <p className="truncate text-xs text-ink">#{prev.number} {prev.title}</p>
            </div>
          </Link>
        ) : <span className="hidden sm:block" />}
        {next ? (
          <Link to={`/problem/${next.id}`} className="group flex items-center justify-end gap-3 rounded-xl border border-line bg-surface/70 p-3 text-right transition hover:border-brand/35 sm:w-[48%]">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.1em] text-faint">Next row</p>
              <p className="truncate text-xs text-ink">#{next.number} {next.title}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-faint group-hover:text-brand" />
          </Link>
        ) : null}
      </nav>

      <Modal
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        title="Snooze review"
        description="Snoozing changes the effective review date. The original Day 1 / 3 / 7 / 30 due date and snooze history stay intact."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSnoozeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={snooze} icon={<CalendarClock className="h-4 w-4" />}>Move review</Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 7].map((days) => (
            <button key={days} type="button" onClick={() => setSnoozeDate(addDays(today, days))} className="rounded-xl border border-line bg-elevated/60 px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:text-ink">+{days}d</button>
          ))}
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="detail-snooze-date">New review date</label>
          <input id="detail-snooze-date" type="date" min={today} value={snoozeDate} onChange={(event) => setSnoozeDate(event.target.value)} className="input" />
        </div>
        <p className="mt-4 text-[10.5px] leading-5 text-faint">If you miss the new date, the item becomes overdue again. It never disappears or auto-advances.</p>
      </Modal>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
      <p className="text-[9px] uppercase tracking-[0.1em] text-faint">{label}</p>
      <div className="mt-1 text-[11px] font-medium text-ink">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-faint">{label}</span>
      <span className="text-right text-muted">{value}</span>
    </div>
  );
}
