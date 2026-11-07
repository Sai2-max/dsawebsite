import { describe, expect, it } from 'vitest';
import {
  completeReview,
  createEmptyProgress,
  createReviewCycle,
  effectiveDueOn,
  getCurrentReview,
  getNextDueReview,
  isReviewDue,
  listDueReviews,
  REVISION_INTERVALS,
  snoozeReview,
  startNewReviewCycle,
  totalCompletedReviews,
} from '../revision';

describe('revision scheduling', () => {
  it('creates fixed Day 1 / 3 / 7 / 30 checkpoints from the solve date', () => {
    const cycle = createReviewCycle('2026-01-15', 1);
    expect(cycle.stages.map((stage) => stage.intervalDays)).toEqual([...REVISION_INTERVALS]);
    expect(cycle.stages.map((stage) => stage.dueOn)).toEqual([
      '2026-01-16',
      '2026-01-18',
      '2026-01-22',
      '2026-02-14',
    ]);
    expect(cycle.stages.every((stage) => !stage.completedOn && stage.snoozeHistory.length === 0)).toBe(true);
  });

  it('archives an open cycle on a new solve but preserves all history', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    const firstCycleId = progress.cycles[0].id;
    expect(progress.solvedEver).toBe(true);
    expect(progress.firstSolvedOn).toBe('2026-01-01');

    progress = { ...progress, attempts: [{ id: 'a1', createdAt: '2026-01-01T10:00:00Z', seconds: 120, outcome: 'solved' }] };
    progress = startNewReviewCycle(progress, '2026-02-01');

    expect(progress.cycles).toHaveLength(2);
    expect(progress.cycles[0].id).toBe(firstCycleId);
    expect(progress.cycles[0].archivedOn).toBe('2026-02-01');
    expect(progress.cycles[0].archivedReason).toBe('New solve cycle started');
    expect(progress.cycles[1].cycleNumber).toBe(2);
    expect(progress.cycles[1].stages[0].dueOn).toBe('2026-02-02');
    expect(progress.firstSolvedOn).toBe('2026-01-01');
    expect(progress.lastSolvedOn).toBe('2026-02-01');
    expect(progress.attempts).toHaveLength(1);
  });

  it('completes a stage without shifting later due dates', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    const cycle = progress.cycles[0];
    const stageTwoDue = cycle.stages[1].dueOn;

    const result = completeReview(progress, cycle.id, 1, '2026-01-05');
    expect(result).not.toBeNull();
    expect(result?.cycleCompleted).toBe(false);
    progress = result!.progress;

    expect(progress.cycles[0].stages[0].completedOn).toBe('2026-01-05');
    expect(progress.cycles[0].stages[1].dueOn).toBe(stageTwoDue);
    expect(progress.cycles[0].stages[1].dueOn).toBe('2026-01-04');
    expect(totalCompletedReviews(progress)).toBe(1);
    expect(getCurrentReview(progress)?.stage.stage).toBe(2);

    expect(completeReview(progress, cycle.id, 1, '2026-01-06')).toBeNull();
    expect(completeReview(progress, 'missing-cycle', 2, '2026-01-06')).toBeNull();
  });

  it('marks a cycle complete after all four stages', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    const cycleId = progress.cycles[0].id;
    const dates = ['2026-01-02', '2026-01-04', '2026-01-08', '2026-01-31'];

    dates.forEach((date, index) => {
      const result = completeReview(progress, cycleId, (index + 1) as 1 | 2 | 3 | 4, date);
      expect(result).not.toBeNull();
      progress = result!.progress;
      if (index < 3) expect(result?.cycleCompleted).toBe(false);
      if (index === 3) expect(result?.cycleCompleted).toBe(true);
    });

    expect(progress.cycles[0].completedOn).toBe('2026-01-31');
    expect(totalCompletedReviews(progress)).toBe(4);
    expect(getCurrentReview(progress)).toBeNull();
  });

  it('reports overdue and today reviews accurately', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');

    const dueToday = getNextDueReview(progress, '2026-01-02');
    expect(dueToday?.urgency).toBe('today');
    expect(dueToday?.overdueDays).toBe(0);
    expect(isReviewDue(progress, '2026-01-02')).toBe(true);

    const overdue = getNextDueReview(progress, '2026-01-05');
    expect(overdue?.urgency).toBe('overdue');
    expect(overdue?.overdueDays).toBe(3);
    expect(isReviewDue(progress, '2026-01-05')).toBe(true);

    const upcoming = getNextDueReview(progress, '2026-01-01');
    expect(upcoming?.urgency).toBe('upcoming');
    expect(isReviewDue(progress, '2026-01-01')).toBe(false);

    const dueList = listDueReviews({ p001: progress }, '2026-01-05');
    expect(dueList).toHaveLength(1);
    expect(dueList[0].problemId).toBe('p001');
  });

  it('snoozes explicitly while preserving original due date and history', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    const cycle = progress.cycles[0];
    const originalDue = effectiveDueOn(cycle.stages[0]);

    const snoozed = snoozeReview(progress, cycle.id, 1, '2026-01-10', '2026-01-05');
    expect(snoozed).not.toBeNull();
    const stage = snoozed!.cycles[0].stages[0];
    expect(stage.dueOn).toBe(originalDue);
    expect(stage.snoozedTo).toBe('2026-01-10');
    expect(stage.snoozeHistory).toHaveLength(1);
    expect(stage.snoozeHistory[0].from).toBe(originalDue);
    expect(stage.snoozeHistory[0].to).toBe('2026-01-10');
    expect(effectiveDueOn(stage)).toBe('2026-01-10');

    expect(getNextDueReview(snoozed!, '2026-01-05')?.urgency).toBe('upcoming');
    expect(getNextDueReview(snoozed!, '2026-01-11')?.urgency).toBe('overdue');
    expect(snoozeReview(snoozed!, cycle.id, 1, '2026-01-12', '2026-01-11')!.cycles[0].stages[0].snoozeHistory).toHaveLength(2);
  });

  it('does not snooze a completed stage', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    const cycleId = progress.cycles[0].id;
    progress = completeReview(progress, cycleId, 1, '2026-01-02')!.progress;
    expect(snoozeReview(progress, cycleId, 1, '2026-02-01', '2026-01-03')).toBeNull();
  });

  it('ignores archived cycles when finding the next review', () => {
    let progress = createEmptyProgress('p001');
    progress = startNewReviewCycle(progress, '2026-01-01');
    progress = startNewReviewCycle(progress, '2026-02-01');
    const next = getNextDueReview(progress, '2026-01-05');
    expect(next?.cycle.cycleNumber).toBe(2);
    expect(next?.urgency).toBe('upcoming');
    expect(getNextDueReview(progress, '2026-02-02')?.cycle.cycleNumber).toBe(2);
  });
});
