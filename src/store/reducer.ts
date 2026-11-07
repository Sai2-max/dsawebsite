import type {
  ActivityEvent,
  ActivityEventType,
  ActiveTimer,
  AppState,
  AttemptOutcome,
  ProblemProgress,
  Settings,
} from '../types';
import { diffDays, todayKey } from '../lib/dates';
import {
  completeReview,
  createEmptyProgress,
  getCurrentCycle,
  snoozeReview,
  startNewReviewCycle,
} from '../lib/revision';
import { pauseTimer, startTimer } from '../lib/timer';
import { uid } from '../lib/utils';
import { createInitialState, normalizeSettings } from '../lib/storage';

export type DetailPatch = Partial<
  Pick<
    ProblemProgress,
    'notes' | 'timeComplexity' | 'spaceComplexity' | 'difficulty' | 'mistakes' | 'learnings'
  >
>;

export type Action =
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | {
      type: 'LOG_ATTEMPT';
      problemId: string;
      outcome: AttemptOutcome;
      seconds: number;
      note?: string;
    }
  | { type: 'MARK_SKIPPED'; problemId: string }
  | { type: 'RESTORE_PROBLEM'; problemId: string }
  | { type: 'START_REATTEMPT'; problemId: string }
  | { type: 'UNDO_SOLVE'; problemId: string }
  | { type: 'SAVE_DETAILS'; problemId: string; patch: DetailPatch }
  | { type: 'TOGGLE_STAR'; problemId: string }
  | { type: 'COMPLETE_REVIEW'; problemId: string; cycleId: string; stage: 1 | 2 | 3 | 4 }
  | {
      type: 'SNOOZE_REVIEW';
      problemId: string;
      cycleId: string;
      stage: 1 | 2 | 3 | 4;
      newDate: string;
    }
  | { type: 'TIMER_START'; problemId: string }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_CLEAR' }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'RESET_DATA' };

function currentProgress(state: AppState, problemId: string): ProblemProgress {
  return state.progress[problemId] ?? createEmptyProgress(problemId);
}

function putProgress(
  state: AppState,
  progress: ProblemProgress,
  updatedAt = new Date().toISOString(),
): AppState {
  return {
    ...state,
    progress: { ...state.progress, [progress.problemId]: progress },
    updatedAt,
  };
}

function addEvent(
  state: AppState,
  type: ActivityEventType,
  options: {
    problemId?: string;
    minutes?: number;
    detail?: string;
    date?: string;
    at?: string;
  } = {},
): AppState {
  const at = options.at ?? new Date().toISOString();
  const event: ActivityEvent = {
    id: uid('event'),
    type,
    problemId: options.problemId,
    date: options.date ?? todayKey(),
    at,
    minutes: options.minutes,
    detail: options.detail,
  };
  return {
    ...state,
    events: [...state.events, event].slice(-5000),
    updatedAt: at,
  };
}

function outcomeToEvent(type: AttemptOutcome): ActivityEventType {
  if (type === 'solved') return 'solve';
  if (type === 'needs_practice') return 'needs_practice';
  return 'attempt';
}

function statusForAttempt(outcome: AttemptOutcome): ProblemProgress['status'] {
  if (outcome === 'solved') return 'solved';
  if (outcome === 'needs_practice') return 'needs_practice';
  return 'attempted';
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: normalizeSettings({ ...state.settings, ...action.patch }, state.settings),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'LOG_ATTEMPT': {
      const now = new Date();
      const today = todayKey(now);
      const base = currentProgress(state, action.problemId);
      const seconds = Math.max(0, Math.round(action.seconds));
      const attempt = {
        id: uid('attempt'),
        createdAt: now.toISOString(),
        startedAt: state.timer?.problemId === action.problemId ? state.timer.startedAt : undefined,
        seconds,
        outcome: action.outcome,
        note: action.note?.trim() || undefined,
      };
      let progress: ProblemProgress = {
        ...base,
        status: statusForAttempt(action.outcome),
        skippedOn: undefined,
        attempts: [...base.attempts, attempt],
        lastActivityAt: now.toISOString(),
      };
      if (action.outcome === 'solved') {
        progress = startNewReviewCycle(progress, today);
      }
      let next = putProgress(state, progress, now.toISOString());
      next = addEvent(next, outcomeToEvent(action.outcome), {
        problemId: action.problemId,
        minutes: seconds / 60,
        at: now.toISOString(),
        date: today,
      });
      if (state.timer?.problemId === action.problemId) {
        next = { ...next, timer: null };
      }
      return next;
    }

    case 'MARK_SKIPPED': {
      const now = new Date();
      const today = todayKey(now);
      const base = currentProgress(state, action.problemId);
      const next = putProgress(
        state,
        {
          ...base,
          status: 'skipped',
          skippedOn: today,
          lastActivityAt: now.toISOString(),
        },
        now.toISOString(),
      );
      const withEvent = addEvent(next, 'skip', {
        problemId: action.problemId,
        at: now.toISOString(),
        date: today,
      });
      return state.timer?.problemId === action.problemId
        ? { ...withEvent, timer: null }
        : withEvent;
    }

    case 'RESTORE_PROBLEM': {
      const now = new Date();
      const base = currentProgress(state, action.problemId);
      const lastAttempt = base.attempts[base.attempts.length - 1];
      const status: ProblemProgress['status'] = base.solvedEver
        ? 'solved'
        : lastAttempt?.outcome === 'needs_practice'
          ? 'needs_practice'
          : base.attempts.length > 0
            ? 'attempted'
            : 'new';
      const next = putProgress(
        state,
        { ...base, status, skippedOn: undefined, lastActivityAt: now.toISOString() },
        now.toISOString(),
      );
      return addEvent(next, 'restore', {
        problemId: action.problemId,
        at: now.toISOString(),
        date: todayKey(now),
      });
    }

    case 'START_REATTEMPT': {
      const now = new Date();
      const base = currentProgress(state, action.problemId);
      const next = putProgress(
        state,
        { ...base, status: 'attempted', skippedOn: undefined, lastActivityAt: now.toISOString() },
        now.toISOString(),
      );
      return addEvent(next, 'attempt', {
        problemId: action.problemId,
        detail: 'Reattempt started',
        at: now.toISOString(),
        date: todayKey(now),
      });
    }

    case 'UNDO_SOLVE': {
      const now = new Date();
      const today = todayKey(now);
      const base = currentProgress(state, action.problemId);
      if (!base.solvedEver) return state;
      // History is never deleted: attempts, firstSolvedOn/lastSolvedOn and all
      // cycles stay. Only the live review schedule is closed out because the
      // problem is no longer counted as solved.
      const currentCycle = getCurrentCycle(base);
      const cycles = currentCycle
        ? base.cycles.map((cycle) =>
            cycle.id === currentCycle.id && !cycle.archivedOn
              ? { ...cycle, archivedOn: today, archivedReason: 'Unchecked solve' }
              : cycle,
          )
        : base.cycles;
      const lastAttempt = base.attempts[base.attempts.length - 1];
      const status: ProblemProgress['status'] = lastAttempt?.outcome === 'needs_practice'
        ? 'needs_practice'
        : lastAttempt
          ? 'attempted'
          : 'new';
      const next = putProgress(
        state,
        {
          ...base,
          status,
          solvedEver: false,
          cycles,
          lastActivityAt: now.toISOString(),
        },
        now.toISOString(),
      );
      return addEvent(next, 'uncheck', {
        problemId: action.problemId,
        detail: 'Unchecked — attempt history kept',
        at: now.toISOString(),
        date: today,
      });
    }

    case 'SAVE_DETAILS': {
      const now = new Date();
      const base = currentProgress(state, action.problemId);
      const changed = (Object.keys(action.patch) as Array<keyof DetailPatch>).some(
        (key) => action.patch[key] !== base[key],
      );
      if (!changed) return state;
      const next = putProgress(
        state,
        { ...base, ...action.patch, lastActivityAt: now.toISOString() },
        now.toISOString(),
      );
      return addEvent(next, 'note', {
        problemId: action.problemId,
        detail: 'Problem notes updated',
        at: now.toISOString(),
        date: todayKey(now),
      });
    }

    case 'TOGGLE_STAR': {
      const now = new Date();
      const base = currentProgress(state, action.problemId);
      const next = putProgress(
        state,
        { ...base, starred: !base.starred, lastActivityAt: now.toISOString() },
        now.toISOString(),
      );
      return addEvent(next, 'star', {
        problemId: action.problemId,
        detail: !base.starred ? 'Starred' : 'Unstarred',
        at: now.toISOString(),
        date: todayKey(now),
      });
    }

    case 'COMPLETE_REVIEW': {
      const now = new Date();
      const today = todayKey(now);
      const base = currentProgress(state, action.problemId);
      const result = completeReview(base, action.cycleId, action.stage, today);
      if (!result) return state;
      const next = putProgress(state, result.progress, now.toISOString());
      return addEvent(next, 'review', {
        problemId: action.problemId,
        detail: result.cycleCompleted
          ? `Day ${[1, 3, 7, 30][action.stage - 1]} review complete — cycle finished`
          : `Day ${[1, 3, 7, 30][action.stage - 1]} review complete`,
        at: now.toISOString(),
        date: today,
      });
    }

    case 'SNOOZE_REVIEW': {
      const now = new Date();
      const today = todayKey(now);
      const base = currentProgress(state, action.problemId);
      const updated = snoozeReview(base, action.cycleId, action.stage, action.newDate, today);
      if (!updated) return state;
      const next = putProgress(state, updated, now.toISOString());
      return addEvent(next, 'snooze', {
        problemId: action.problemId,
        detail: `Review moved to ${action.newDate}`,
        at: now.toISOString(),
        date: today,
      });
    }

    case 'TIMER_START': {
      if (state.timer && state.timer.problemId !== action.problemId && state.timer.running) {
        return state;
      }
      const timer: ActiveTimer = startTimer(state.timer, action.problemId, new Date());
      return { ...state, timer, updatedAt: new Date().toISOString() };
    }

    case 'TIMER_PAUSE': {
      return {
        ...state,
        timer: pauseTimer(state.timer, new Date()),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'TIMER_CLEAR': {
      return { ...state, timer: null, updatedAt: new Date().toISOString() };
    }

    case 'IMPORT': {
      const now = new Date().toISOString();
      return addEvent(
        {
          ...action.state,
          schemaVersion: 1,
          updatedAt: now,
        },
        'import',
        { at: now, date: todayKey() },
      );
    }

    case 'RESET_DATA': {
      const fresh = createInitialState(state.settings);
      return addEvent(
        fresh,
        'reset',
        { at: fresh.createdAt, date: todayKey() },
      );
    }

    default:
      return state;
  }
}

export function nightsBetween(a: string, b: string): number {
  return diffDays(a, b);
}
