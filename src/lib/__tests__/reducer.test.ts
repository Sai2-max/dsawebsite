import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appReducer } from '../../store/reducer';
import { createInitialState } from '../storage';

const TODAY = new Date(2026, 9, 27, 12, 0, 0);

function seed() {
  return createInitialState();
}

describe('app reducer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a solve and starts a Day 1/3/7/30 cycle from the local date', () => {
    const state = appReducer(seed(), {
      type: 'LOG_ATTEMPT',
      problemId: 'p001',
      outcome: 'solved',
      seconds: 150,
    });
    const progress = state.progress.p001;
    expect(progress.status).toBe('solved');
    expect(progress.solvedEver).toBe(true);
    expect(progress.firstSolvedOn).toBe('2026-10-27');
    expect(progress.lastSolvedOn).toBe('2026-10-27');
    expect(progress.attempts).toHaveLength(1);
    expect(progress.attempts[0].seconds).toBe(150);
    expect(progress.cycles).toHaveLength(1);
    expect(progress.cycles[0].stages.map((stage) => stage.dueOn)).toEqual([
      '2026-10-28',
      '2026-10-30',
      '2026-11-03',
      '2026-11-26',
    ]);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ type: 'solve', problemId: 'p001', date: '2026-10-27' });
    expect(state.events[0].minutes).toBe(2.5);
  });

  it('does not start a cycle for attempts or needs-practice', () => {
    let state = appReducer(seed(), { type: 'LOG_ATTEMPT', problemId: 'p002', outcome: 'attempted', seconds: 30 });
    expect(state.progress.p002.status).toBe('attempted');
    expect(state.progress.p002.cycles).toHaveLength(0);
    state = appReducer(state, { type: 'LOG_ATTEMPT', problemId: 'p003', outcome: 'needs_practice', seconds: 60 });
    expect(state.progress.p003.status).toBe('needs_practice');
    expect(state.progress.p003.cycles).toHaveLength(0);
    expect(state.progress.p003.solvedEver).toBe(false);
  });

  it('keeps attempt history and archives the old cycle on a re-solve', () => {
    let state = appReducer(seed(), { type: 'LOG_ATTEMPT', problemId: 'p001', outcome: 'solved', seconds: 100 });
    const firstCycle = state.progress.p001.cycles[0].id;
    state = appReducer(state, { type: 'START_REATTEMPT', problemId: 'p001' });
    expect(state.progress.p001.status).toBe('attempted');
    expect(state.progress.p001.attempts).toHaveLength(1);

    vi.setSystemTime(new Date(2026, 10, 5, 12));
    state = appReducer(state, { type: 'LOG_ATTEMPT', problemId: 'p001', outcome: 'solved', seconds: 200 });

    const progress = state.progress.p001;
    expect(progress.attempts).toHaveLength(2);
    expect(progress.cycles).toHaveLength(2);
    expect(progress.cycles[0].id).toBe(firstCycle);
    expect(progress.cycles[0].archivedOn).toBe('2026-11-05');
    expect(progress.cycles[0].stages[0].completedOn).toBeUndefined();
    expect(progress.cycles[1].cycleNumber).toBe(2);
    expect(progress.firstSolvedOn).toBe('2026-10-27');
    expect(progress.lastSolvedOn).toBe('2026-11-05');
    expect(state.progress.p001.solvedEver).toBe(true);
  });

  it('unchecks a solve: sets solvedEver false, archives the open cycle and keeps history', () => {
    let state = appReducer(seed(), { type: 'LOG_ATTEMPT', problemId: 'p001', outcome: 'solved', seconds: 100 });
    const cycleId = state.progress.p001.cycles[0].id;

    vi.setSystemTime(new Date(2026, 9, 28, 12));
    state = appReducer(state, { type: 'UNDO_SOLVE', problemId: 'p001' });

    const progress = state.progress.p001;
    expect(progress.solvedEver).toBe(false);
    expect(progress.status).toBe('attempted');
    expect(progress.firstSolvedOn).toBe('2026-10-27');
    expect(progress.lastSolvedOn).toBe('2026-10-27');
    expect(progress.attempts).toHaveLength(1);
    expect(progress.cycles).toHaveLength(1);
    expect(progress.cycles[0].id).toBe(cycleId);
    expect(progress.cycles[0].stages.every((stage) => !stage.completedOn)).toBe(true);
    expect(progress.cycles[0].archivedOn).toBe('2026-10-28');
    expect(progress.cycles[0].archivedReason).toBe('Unchecked solve');
    expect(state.events.at(-1)).toMatchObject({ type: 'uncheck', problemId: 'p001', date: '2026-10-28' });
  });

  it('ignores UNDO_SOLVE when the problem is not solved', () => {
    const before = appReducer(seed(), { type: 'LOG_ATTEMPT', problemId: 'p002', outcome: 'attempted', seconds: 30 });
    const after = appReducer(before, { type: 'UNDO_SOLVE', problemId: 'p002' });
    expect(after).toBe(before);
  });

  it('skips, restores and preserves prior solve history', () => {
    let state = appReducer(seed(), { type: 'MARK_SKIPPED', problemId: 'p004' });
    expect(state.progress.p004.status).toBe('skipped');
    expect(state.progress.p004.skippedOn).toBe('2026-10-27');
    expect(state.events.at(-1)?.type).toBe('skip');

    state = appReducer(state, { type: 'RESTORE_PROBLEM', problemId: 'p004' });
    expect(state.progress.p004.status).toBe('new');
    expect(state.progress.p004.skippedOn).toBeUndefined();
    expect(state.events.at(-1)?.type).toBe('restore');
    expect(state.progress.p004.attempts).toHaveLength(0);
  });

  it('saves notes, complexity, mistakes and a 1–5 difficulty', () => {
    const state = appReducer(seed(), {
      type: 'SAVE_DETAILS',
      problemId: 'p005',
      patch: {
        notes: 'Two pointers',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        mistakes: 'Off by one',
        learnings: 'Sentinel',
        difficulty: 4,
      },
    });
    expect(state.progress.p005).toMatchObject({
      notes: 'Two pointers',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      mistakes: 'Off by one',
      learnings: 'Sentinel',
      difficulty: 4,
    });
    expect(state.events.at(-1)?.type).toBe('note');

    const unchanged = appReducer(state, {
      type: 'SAVE_DETAILS',
      problemId: 'p005',
      patch: { notes: 'Two pointers' },
    });
    expect(unchanged).toBe(state);
  });

  it('toggles stars and updates settings with clamping', () => {
    let state = appReducer(seed(), { type: 'TOGGLE_STAR', problemId: 'p006' });
    expect(state.progress.p006.starred).toBe(true);
    state = appReducer(state, { type: 'TOGGLE_STAR', problemId: 'p006' });
    expect(state.progress.p006.starred).toBe(false);

    state = appReducer(state, { type: 'UPDATE_SETTINGS', patch: { dailyTarget: 99 } });
    expect(state.settings.dailyTarget).toBe(15);
    state = appReducer(state, { type: 'UPDATE_SETTINGS', patch: { dailyTarget: -2 } });
    expect(state.settings.dailyTarget).toBe(1);
    state = appReducer(state, { type: 'UPDATE_SETTINGS', patch: { theme: 'light', weekStartsOn: 0 } });
    expect(state.settings.theme).toBe('light');
    expect(state.settings.weekStartsOn).toBe(0);
  });

  it('clears the timer when the tracked problem is attempted or skipped', () => {
    let state = appReducer(seed(), { type: 'TIMER_START', problemId: 'p007' });
    expect(state.timer?.running).toBe(true);
    state = appReducer(state, { type: 'LOG_ATTEMPT', problemId: 'p007', outcome: 'attempted', seconds: 12 });
    expect(state.timer).toBeNull();

    state = appReducer(state, { type: 'TIMER_START', problemId: 'p008' });
    state = appReducer(state, { type: 'MARK_SKIPPED', problemId: 'p008' });
    expect(state.timer).toBeNull();
  });

  it('completes and snoozes reviews through the reducer', () => {
    let state = appReducer(seed(), { type: 'LOG_ATTEMPT', problemId: 'p001', outcome: 'solved', seconds: 0 });
    const cycle = state.progress.p001.cycles[0];

    state = appReducer(state, {
      type: 'COMPLETE_REVIEW',
      problemId: 'p001',
      cycleId: cycle.id,
      stage: 1,
    });
    expect(state.progress.p001.cycles[0].stages[0].completedOn).toBe('2026-10-27');
    expect(state.events.at(-1)?.type).toBe('review');

    state = appReducer(state, {
      type: 'SNOOZE_REVIEW',
      problemId: 'p001',
      cycleId: cycle.id,
      stage: 2,
      newDate: '2026-11-10',
    });
    expect(state.progress.p001.cycles[0].stages[1].snoozedTo).toBe('2026-11-10');
    expect(state.progress.p001.cycles[0].stages[1].snoozeHistory).toHaveLength(1);
    expect(state.events.at(-1)?.type).toBe('snooze');
  });

  it('imports replace state and reset clears progress but keeps settings', () => {
    const custom = {
      ...seed(),
      settings: { ...seed().settings, dailyTarget: 5, theme: 'light' as const },
    };
    let state = appReducer(custom, { type: 'RESET_DATA' });
    expect(state.progress).toEqual({});
    expect(state.settings.dailyTarget).toBe(5);
    expect(state.settings.theme).toBe('light');
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('reset');

    const imported = appReducer(state, { type: 'IMPORT', state: custom });
    expect(imported.settings.dailyTarget).toBe(5);
    expect(imported.events.at(-1)?.type).toBe('import');
  });
});
