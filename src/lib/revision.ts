import type {
  DueReview,
  ProblemProgress,
  ReviewCycle,
  ReviewStage,
  RevisionUrgency,
  SnoozeRecord,
} from '../types';
import { addDays, diffDays } from './dates';
import { uid } from './utils';

export const REVISION_INTERVALS = [1, 3, 7, 30] as const;
export const REVISION_STAGE_LABELS = ['Day 1', 'Day 3', 'Day 7', 'Day 30'] as const;

export function createEmptyProgress(problemId: string): ProblemProgress {
  return {
    problemId,
    status: 'new',
    solvedEver: false,
    attempts: [],
    cycles: [],
    notes: '',
    timeComplexity: '',
    spaceComplexity: '',
    mistakes: '',
    learnings: '',
    starred: false,
  };
}

export function effectiveDueOn(stage: ReviewStage): string {
  return stage.snoozedTo ?? stage.dueOn;
}

export function createReviewCycle(startedOn: string, cycleNumber: number): ReviewCycle {
  return {
    id: uid('cycle'),
    cycleNumber,
    startedOn,
    stages: REVISION_INTERVALS.map((intervalDays, index) => ({
      stage: (index + 1) as ReviewStage['stage'],
      intervalDays,
      dueOn: addDays(startedOn, intervalDays),
      snoozeHistory: [],
    })),
  };
}

export function isCycleComplete(cycle: ReviewCycle): boolean {
  return cycle.stages.every((stage) => Boolean(stage.completedOn));
}

export function getCurrentCycle(progress: ProblemProgress): ReviewCycle | undefined {
  for (let index = progress.cycles.length - 1; index >= 0; index -= 1) {
    const cycle = progress.cycles[index];
    if (!cycle.archivedOn) return cycle;
  }
  return undefined;
}

export function getOpenStage(cycle: ReviewCycle): ReviewStage | undefined {
  return cycle.stages.find((stage) => !stage.completedOn);
}

export function getCurrentReview(progress: ProblemProgress): { cycle: ReviewCycle; stage: ReviewStage } | null {
  const cycle = getCurrentCycle(progress);
  if (!cycle) return null;
  const stage = getOpenStage(cycle);
  if (!stage) return null;
  return { cycle, stage };
}

export function getNextDueReview(progress: ProblemProgress, today: string): DueReview | null {
  const current = getCurrentReview(progress);
  if (!current) return null;
  const dueOn = effectiveDueOn(current.stage);
  const overdueDays = Math.max(0, diffDays(dueOn, today));
  const urgency: RevisionUrgency = overdueDays > 0 ? 'overdue' : dueOn === today ? 'today' : 'upcoming';
  return {
    problemId: progress.problemId,
    cycle: current.cycle,
    stage: current.stage,
    dueOn,
    overdueDays,
    urgency,
  };
}

export function isReviewDue(progress: ProblemProgress, today: string): boolean {
  const next = getNextDueReview(progress, today);
  return Boolean(next && (next.urgency === 'overdue' || next.urgency === 'today'));
}

export function startNewReviewCycle(progress: ProblemProgress, solvedOn: string): ProblemProgress {
  const current = getCurrentCycle(progress);
  const cycles = progress.cycles.map((cycle) => {
    if (current && cycle.id === current.id && !isCycleComplete(cycle)) {
      return { ...cycle, archivedOn: solvedOn, archivedReason: 'New solve cycle started' };
    }
    return cycle;
  });
  const maxCycleNumber = progress.cycles.reduce((max, cycle) => Math.max(max, cycle.cycleNumber), 0);
  const newCycle = createReviewCycle(solvedOn, maxCycleNumber + 1);
  return {
    ...progress,
    status: 'solved',
    solvedEver: true,
    firstSolvedOn: progress.firstSolvedOn ?? solvedOn,
    lastSolvedOn: solvedOn,
    skippedOn: undefined,
    cycles: [...cycles, newCycle],
    lastActivityAt: new Date().toISOString(),
  };
}

export function completeReview(
  progress: ProblemProgress,
  cycleId: string,
  stageNumber: ReviewStage['stage'],
  completedOn: string,
): { progress: ProblemProgress; cycleCompleted: boolean } | null {
  const cycle = progress.cycles.find((candidate) => candidate.id === cycleId);
  if (!cycle) return null;
  const stage = cycle.stages.find((candidate) => candidate.stage === stageNumber);
  if (!stage || stage.completedOn) return null;

  let cycleCompleted = false;
  const cycles = progress.cycles.map((candidate) => {
    if (candidate.id !== cycleId) return candidate;
    const stages = candidate.stages.map((item) =>
      item.stage === stageNumber ? { ...item, completedOn } : item,
    );
    cycleCompleted = stages.every((item) => Boolean(item.completedOn));
    return {
      ...candidate,
      stages,
      completedOn: cycleCompleted ? completedOn : candidate.completedOn,
    };
  });

  return {
    progress: {
      ...progress,
      cycles,
      lastActivityAt: new Date().toISOString(),
    },
    cycleCompleted,
  };
}

export function snoozeReview(
  progress: ProblemProgress,
  cycleId: string,
  stageNumber: ReviewStage['stage'],
  newDate: string,
  _today: string,
): ProblemProgress | null {
  const cycle = progress.cycles.find((candidate) => candidate.id === cycleId);
  if (!cycle) return null;
  const stage = cycle.stages.find((candidate) => candidate.stage === stageNumber);
  if (!stage || stage.completedOn) return null;
  const from = effectiveDueOn(stage);
  const record: SnoozeRecord = { from, to: newDate, at: new Date().toISOString() };
  return {
    ...progress,
    cycles: progress.cycles.map((candidate) =>
      candidate.id !== cycleId
        ? candidate
        : {
            ...candidate,
            stages: candidate.stages.map((item) =>
              item.stage !== stageNumber
                ? item
                : {
                    ...item,
                    snoozedTo: newDate,
                    snoozeHistory: [...item.snoozeHistory, record],
                  },
            ),
          },
    ),
    lastActivityAt: new Date().toISOString(),
  };
}

export function totalCompletedReviews(progress: ProblemProgress): number {
  return progress.cycles.reduce(
    (total, cycle) => total + cycle.stages.filter((stage) => stage.completedOn).length,
    0,
  );
}

export function totalReachedReviews(progress: ProblemProgress, today: string): number {
  return progress.cycles.reduce(
    (total, cycle) =>
      total + cycle.stages.filter((stage) => effectiveDueOn(stage) <= today || stage.completedOn).length,
    0,
  );
}

export function listDueReviews(
  progressRecords: Record<string, ProblemProgress>,
  today: string,
): DueReview[] {
  return Object.values(progressRecords)
    .map((progress) => getNextDueReview(progress, today))
    .filter((review): review is DueReview => Boolean(review && review.urgency !== 'upcoming' && review.urgency !== 'complete'))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.problemId.localeCompare(b.problemId));
}

export function listUpcomingReviews(
  progressRecords: Record<string, ProblemProgress>,
  today: string,
  limit = 5,
): DueReview[] {
  return Object.values(progressRecords)
    .map((progress) => getNextDueReview(progress, today))
    .filter((review): review is DueReview => Boolean(review && review.urgency === 'upcoming'))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .slice(0, limit);
}

export function reviewStateLabel(review: DueReview | null): string {
  if (!review) return 'No review scheduled';
  if (review.urgency === 'overdue') {
    return `${review.overdueDays} day${review.overdueDays === 1 ? '' : 's'} overdue`;
  }
  if (review.urgency === 'today') return 'Review due today';
  return `Next review ${review.dueOn}`;
}

export function normalizeProgress(
  raw: unknown,
  problemId: string,
): ProblemProgress {
  const empty = createEmptyProgress(problemId);
  if (!raw || typeof raw !== 'object') return empty;
  const value = raw as Partial<ProblemProgress>;
  const status = ['new', 'attempted', 'solved', 'needs_practice', 'skipped'].includes(value.status ?? '')
    ? (value.status as ProblemProgress['status'])
    : empty.status;
  return {
    ...empty,
    ...value,
    problemId,
    status,
    solvedEver: Boolean(value.solvedEver),
    attempts: Array.isArray(value.attempts) ? value.attempts : [],
    cycles: Array.isArray(value.cycles)
      ? value.cycles.map((cycle) => ({
          ...cycle,
          stages: Array.isArray(cycle.stages)
            ? cycle.stages.map((stage) => ({
                ...stage,
                snoozeHistory: Array.isArray(stage.snoozeHistory) ? stage.snoozeHistory : [],
              }))
            : [],
        }))
      : [],
    notes: typeof value.notes === 'string' ? value.notes : '',
    timeComplexity: typeof value.timeComplexity === 'string' ? value.timeComplexity : '',
    spaceComplexity: typeof value.spaceComplexity === 'string' ? value.spaceComplexity : '',
    mistakes: typeof value.mistakes === 'string' ? value.mistakes : '',
    learnings: typeof value.learnings === 'string' ? value.learnings : '',
    starred: Boolean(value.starred),
  };
}
