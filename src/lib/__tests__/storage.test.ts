// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSavedState,
  createExportBundle,
  createInitialState,
  loadState,
  normalizeState,
  parseImportBundle,
  saveState,
  STORAGE_KEY,
} from '../storage';
import { appReducer } from '../../store/reducer';

describe('local persistence and backup validation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reloads normalized local state', () => {
    const state = appReducer(
      { ...createInitialState(), settings: { dailyTarget: 4, theme: 'light', weekStartsOn: 0, studyName: 'Sai' } },
      { type: 'LOG_ATTEMPT', problemId: 'p001', outcome: 'solved', seconds: 90 },
    );
    expect(saveState(state)).toEqual({ ok: true });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    const loaded = loadState();
    expect(loaded.source).toBe('storage');
    expect(loaded.state.settings).toEqual({ dailyTarget: 4, theme: 'light', weekStartsOn: 0, studyName: 'Sai' });
    expect(loaded.state.progress.p001.solvedEver).toBe(true);
    expect(loaded.state.progress.p001.attempts).toHaveLength(1);
    expect(loaded.state.progress.p001.cycles).toHaveLength(1);
    expect(loaded.state.events).toHaveLength(1);
  });

  it('falls back safely when saved JSON is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json');
    const loaded = loadState();
    expect(loaded.source).toBe('recovered');
    expect(loaded.error).toBeTruthy();
    expect(loaded.state.progress).toEqual({});
    expect(loaded.state.settings.dailyTarget).toBe(3);
  });

  it('normalizes unknown problem IDs, invalid fields and unsafe settings', () => {
    const result = normalizeState({
      settings: { dailyTarget: 99, theme: 'system', weekStartsOn: 2, studyName: 123 },
      progress: {
        p001: {
          status: 'solved',
          solvedEver: true,
          attempts: [{ id: 'a', createdAt: '2026-01-01T00:00:00Z', seconds: -5, outcome: 'solved' }],
          cycles: [],
          notes: 4,
          difficulty: 9,
        },
        'not-a-problem': { status: 'solved' },
      },
      events: [
        { id: 'e1', type: 'solve', date: 'not-a-date', problemId: 'not-a-problem' },
        { id: 'e2', type: 'unknown-event', date: '2026-01-01' },
      ],
      timer: { problemId: 'p002', running: true, startedAt: '2026-01-01T00:00:00Z', accumulatedSeconds: -50 },
      createdAt: '2026-01-01T00:00:00Z',
    });

    expect(result.unknownProblems).toEqual(['not-a-problem']);
    expect(result.state.settings.dailyTarget).toBe(15);
    expect(result.state.settings.weekStartsOn).toBe(1);
    expect(result.state.settings.theme).toBe('system');
    expect(result.state.settings.studyName).toBe('');
    expect(result.state.progress.p001.status).toBe('solved');
    expect(result.state.progress.p001.solvedEver).toBe(true);
    expect(result.state.progress.p001.notes).toBe('');
    expect(result.state.progress.p001.attempts).toHaveLength(1);
    expect(result.state.events).toHaveLength(1);
    expect(result.state.events[0].problemId).toBeUndefined();
    expect(result.state.timer?.accumulatedSeconds).toBe(0);
    expect(result.state.timer?.running).toBe(true);
  });

  it('round-trips a full export bundle with a summary', () => {
    let state = appReducer(createInitialState(), {
      type: 'LOG_ATTEMPT',
      problemId: 'p001',
      outcome: 'solved',
      seconds: 300,
    });
    const cycle = state.progress.p001.cycles[0];
    state = appReducer(state, {
      type: 'COMPLETE_REVIEW',
      problemId: 'p001',
      cycleId: cycle.id,
      stage: 1,
    });
    const text = JSON.stringify(createExportBundle(state));
    const parsed = parseImportBundle(text);

    expect(parsed.summary.problemsTouched).toBe(1);
    expect(parsed.summary.attempts).toBe(1);
    expect(parsed.summary.reviewsCompleted).toBe(1);
    expect(parsed.summary.events).toBe(2);
    expect(parsed.summary.datasetMismatch).toBe(false);
    expect(parsed.state.progress.p001.solvedEver).toBe(true);
    expect(parsed.state.progress.p001.cycles[0].stages[0].completedOn).toBeTruthy();
  });

  it('flags backups from a different dataset build', () => {
    const state = createInitialState();
    const bundle = createExportBundle(state);
    bundle.dataset.sourceSha256 = 'different-hash';
    const parsed = parseImportBundle(JSON.stringify(bundle));
    expect(parsed.summary.datasetMismatch).toBe(true);
  });

  it('accepts a raw AppState object as a backup', () => {
    const state = appReducer(createInitialState(), {
      type: 'LOG_ATTEMPT',
      problemId: 'p002',
      outcome: 'attempted',
      seconds: 25,
    });
    const parsed = parseImportBundle(JSON.stringify(state));
    expect(parsed.summary.problemsTouched).toBe(1);
    expect(parsed.summary.attempts).toBe(1);
    expect(parsed.state.progress.p002.status).toBe('attempted');
  });

  it('rejects malformed or empty backups with clear errors', () => {
    expect(() => parseImportBundle('not json')).toThrow('not valid JSON');
    expect(() => parseImportBundle('{}')).toThrow('no progress records');
    expect(() => parseImportBundle(JSON.stringify({ state: {} }))).toThrow('no progress records');
  });

  it('clears the saved state', () => {
    saveState(createInitialState());
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearSavedState();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
