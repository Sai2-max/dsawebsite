import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appReducer } from '../../store/reducer';
import { createInitialState } from '../storage';
import {
  getActivityMap,
  getCompanyStats,
  getNewQueue,
  getReviewStats,
  getSolvedRows,
  getSolvedUniqueCount,
  getStatusCounts,
  getStreak,
  getStudySeconds,
  getTodayPlan,
  getTopicStats,
} from '../stats';
import { addDays, todayKey } from '../dates';
import type { ActivityEvent } from '../../types';

const TODAY = new Date(2026, 9, 27, 12, 0, 0);

function solve(state = createInitialState(), problemId: string) {
  return appReducer(state, { type: 'LOG_ATTEMPT', problemId, outcome: 'solved', seconds: 120 });
}

describe('progress statistics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts duplicate twins once for unique solved but twice for rows', () => {
    let state = solve(createInitialState(), 'p006');
    expect(getSolvedUniqueCount(state)).toBe(1);
    expect(getSolvedRows(state)).toBe(1);

    state = solve(state, 'p186');
    expect(getSolvedUniqueCount(state)).toBe(1);
    expect(getSolvedRows(state)).toBe(2);

    state = solve(state, 'p001');
    expect(getSolvedUniqueCount(state)).toBe(2);
    expect(getSolvedRows(state)).toBe(3);
    expect(getStatusCounts(state).solvedRows).toBe(3);
    expect(getStatusCounts(state).solvedEver).toBe(3);
  });

  it('puts untouched unique problems in PDF order and never repeats a canonical twin', () => {
    const fresh = getNewQueue(createInitialState(), 10);
    expect(fresh.queue.slice(0, 3).map((problem) => problem.number)).toEqual([1, 2, 3]);
    expect(new Set(fresh.queue.map((problem) => problem.canonicalId)).size).toBe(fresh.queue.length);
    expect(fresh.queue.some((problem) => problem.number === 186)).toBe(false);

    const afterSolve = getNewQueue(solve(createInitialState(), 'p006'), 30);
    expect(afterSolve.queue.some((problem) => problem.number === 6)).toBe(false);
    expect(afterSolve.queue.some((problem) => problem.number === 186)).toBe(false);
    expect(afterSolve.exhaustedCanonicals.has('p006')).toBe(true);

    const skipped = appReducer(createInitialState(), { type: 'MARK_SKIPPED', problemId: 'p001' });
    const afterSkip = getNewQueue(skipped, 5);
    expect(afterSkip.queue[0].number).toBe(2);
    expect(afterSkip.queue.some((problem) => problem.number === 1)).toBe(false);
  });

  it('plans today by unique introductions rather than duplicate rows', () => {
    let state = createInitialState();
    state = solve(state, 'p006');
    state = solve(state, 'p186');
    const plan = getTodayPlan(state, '2026-10-27');

    expect(plan.target).toBe(3);
    expect(plan.introduced).toBe(1);
    expect(plan.rowsSolvedToday).toBe(1);
    expect(plan.solvedToday).toHaveLength(1);
    expect(plan.slotsRemaining).toBe(2);
    expect(plan.progressPercent).toBe(33);
    expect(plan.newQueue.some((problem) => problem.canonicalId === 'p006')).toBe(false);
    expect(new Set(plan.newQueue.map((problem) => problem.canonicalId)).size).toBe(plan.newQueue.length);
  });

  it('puts a checked-then-unchecked row back on today\'s plan and out of solved-today', () => {
    let state = solve(createInitialState(), 'p001');
    expect(getTodayPlan(state, '2026-10-27').rowsSolvedToday).toBe(1);
    expect(getTodayPlan(state, '2026-10-27').newQueue.map((problem) => problem.number)).toEqual([2, 3]);

    state = appReducer(state, { type: 'UNDO_SOLVE', problemId: 'p001' });
    const plan = getTodayPlan(state, '2026-10-27');
    expect(plan.rowsSolvedToday).toBe(0);
    expect(plan.solvedToday).toHaveLength(0);
    // The unchecked row returns to the cards ahead of the untouched rows.
    expect(plan.newQueue.map((problem) => problem.number).slice(0, 3)).toEqual([1, 2, 3]);
    // Attempt history is intact while the row is back on the plan.
    expect(state.progress.p001.attempts).toHaveLength(1);
    // The in-progress list does not duplicate the row that is already a card.
    expect(plan.inProgress.some((problem) => problem.number === 1)).toBe(false);
  });

  it('derives due review counts and completion from cycle state', () => {
    let state = solve(createInitialState(), 'p001');
    const cycle = state.progress.p001.cycles[0];

    let stats = getReviewStats(state, '2026-10-27');
    expect(stats.due).toBe(0);
    expect(stats.upcoming).toBe(1);
    expect(stats.overdue).toBe(0);

    stats = getReviewStats(state, '2026-10-29');
    expect(stats.due).toBe(1);
    expect(stats.overdue).toBe(1);
    expect(stats.completionRate).toBe(0);

    state = appReducer(state, {
      type: 'COMPLETE_REVIEW',
      problemId: 'p001',
      cycleId: cycle.id,
      stage: 1,
    });
    stats = getReviewStats(state, '2026-10-29');
    expect(stats.completed).toBe(1);
    expect(stats.completionRate).toBe(100);
    expect(stats.due).toBe(0);
    expect(stats.upcoming).toBe(1);
  });

  it('creates a streak from local study dates', () => {
    const yesterday = addDays(todayKey(), -1);
    const base = createInitialState();
    const events: ActivityEvent[] = [
      { id: 'e1', type: 'attempt', problemId: 'p001', date: yesterday, at: `${yesterday}T10:00:00.000Z` },
      { id: 'e2', type: 'solve', problemId: 'p002', date: todayKey(), at: `${todayKey()}T10:00:00.000Z` },
      { id: 'e3', type: 'note', problemId: 'p003', date: addDays(todayKey(), -3), at: `${addDays(todayKey(), -3)}T10:00:00.000Z` },
    ];
    const state = { ...base, events };
    const streak = getStreak(state, todayKey());
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
    expect(streak.activeToday).toBe(true);
  });

  it('counts attempt minutes once in the activity map', () => {
    let state = solve(createInitialState(), 'p001');
    state = appReducer(state, { type: 'SAVE_DETAILS', problemId: 'p001', patch: { notes: 'Note' } });
    const cell = getActivityMap(state).get(todayKey());
    expect(cell).toBeDefined();
    expect(cell?.minutes).toBeCloseTo(2, 5);
    expect(cell?.solves).toBe(1);
    expect(getStudySeconds(state)).toBe(120);
  });

  it('aggregates all source rows across topic and company views', () => {
    const state = solve(createInitialState(), 'p001');
    const topicStats = getTopicStats(state, todayKey());
    const companyStats = getCompanyStats(state, todayKey());
    expect(topicStats).toHaveLength(15);
    expect(topicStats.reduce((total, topic) => total + topic.totalRows, 0)).toBe(211);
    // Five duplicate rows sit under a different topic than their twin, so per-topic
    // unique counts sum to 209 even though the global canonical total is 204.
    expect(topicStats.reduce((total, topic) => total + topic.uniqueRows, 0)).toBe(209);
    expect(topicStats.reduce((total, topic) => total + topic.solvedUnique, 0)).toBe(1);
    expect(companyStats).toHaveLength(54);
    expect(companyStats.reduce((total, company) => total + company.rows, 0)).toBe(611);
  });
});
