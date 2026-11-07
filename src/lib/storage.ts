import { dataset, problems } from './dataset';
import { isValidDateKey, todayKey } from './dates';
import { normalizeProgress } from './revision';
import { clamp, uid } from './utils';
import type {
  ActiveTimer,
  ActivityEvent,
  ActivityEventType,
  AppState,
  ExportBundle,
  ImportSummary,
  Settings,
  ThemePreference,
} from '../types';

export const STORAGE_KEY = 'dsa-command-center:v1';
export const STORAGE_VERSION = 1;

export const defaultSettings: Settings = {
  dailyTarget: 3,
  theme: 'dark',
  weekStartsOn: 1,
  studyName: '',
};

const EVENT_TYPES: ActivityEventType[] = [
  'attempt',
  'solve',
  'needs_practice',
  'uncheck',
  'skip',
  'restore',
  'review',
  'snooze',
  'note',
  'star',
  'import',
  'reset',
];

const knownProblemIds = new Set(problems.map((problem) => problem.id));

export function createInitialState(settings: Settings = defaultSettings): AppState {
  const now = new Date().toISOString();
  return {
    schemaVersion: STORAGE_VERSION,
    settings: { ...settings },
    progress: {},
    timer: null,
    events: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'system' || value === 'dark' ? value : 'dark';
}

export function normalizeSettings(raw: unknown, fallback: Settings = defaultSettings): Settings {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const value = raw as Partial<Settings>;
  return {
    dailyTarget: clamp(Number.isFinite(Number(value.dailyTarget)) ? Number(value.dailyTarget) : fallback.dailyTarget, 1, 15),
    theme: normalizeTheme(value.theme ?? fallback.theme),
    weekStartsOn: value.weekStartsOn === 0 ? 0 : 1,
    studyName: typeof value.studyName === 'string' ? value.studyName.slice(0, 60) : fallback.studyName,
  };
}

function normalizeEvent(raw: unknown): ActivityEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<ActivityEvent>;
  const type = EVENT_TYPES.includes(value.type as ActivityEventType) ? (value.type as ActivityEventType) : null;
  if (!type) return null;
  const date = isValidDateKey(value.date) ? value.date : todayKey();
  const problemId = typeof value.problemId === 'string' && knownProblemIds.has(value.problemId)
    ? value.problemId
    : undefined;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : uid('event'),
    type,
    problemId,
    date,
    at: typeof value.at === 'string' ? value.at : new Date().toISOString(),
    minutes: Number.isFinite(Number(value.minutes)) ? Number(value.minutes) : undefined,
    detail: typeof value.detail === 'string' ? value.detail.slice(0, 500) : undefined,
  };
}

function normalizeTimer(raw: unknown): ActiveTimer | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<ActiveTimer>;
  if (typeof value.problemId !== 'string' || !knownProblemIds.has(value.problemId)) return null;
  const running = Boolean(value.running && value.startedAt);
  return {
    problemId: value.problemId,
    running,
    startedAt: running ? value.startedAt : undefined,
    accumulatedSeconds: Number.isFinite(Number(value.accumulatedSeconds))
      ? Math.max(0, Number(value.accumulatedSeconds))
      : 0,
  };
}

export interface NormalizeResult {
  state: AppState;
  unknownProblems: string[];
}

export function normalizeState(raw: unknown, fallbackSettings: Settings = defaultSettings): NormalizeResult {
  if (!raw || typeof raw !== 'object') {
    return { state: createInitialState(fallbackSettings), unknownProblems: [] };
  }
  const value = raw as Partial<AppState>;
  const settings = normalizeSettings(value.settings, fallbackSettings);
  const progress: AppState['progress'] = {};
  const unknownProblems: string[] = [];
  if (value.progress && typeof value.progress === 'object' && !Array.isArray(value.progress)) {
    for (const [problemId, record] of Object.entries(value.progress)) {
      if (!knownProblemIds.has(problemId)) {
        unknownProblems.push(problemId);
        continue;
      }
      progress[problemId] = normalizeProgress(record, problemId);
    }
  }
  const events = Array.isArray(value.events)
    ? value.events
        .map(normalizeEvent)
        .filter((event): event is ActivityEvent => Boolean(event))
        .slice(-5000)
    : [];
  const now = new Date().toISOString();
  return {
    state: {
      schemaVersion: STORAGE_VERSION,
      settings,
      progress,
      timer: normalizeTimer(value.timer),
      events,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
      updatedAt: now,
    },
    unknownProblems,
  };
}

export interface LoadResult {
  state: AppState;
  source: 'storage' | 'fresh' | 'recovered';
  error?: string;
}

export function loadState(): LoadResult {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { state: createInitialState(), source: 'fresh' };
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: createInitialState(), source: 'fresh', error: 'Local storage is unavailable.' };
  }
  if (!raw) return { state: createInitialState(), source: 'fresh' };
  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeState(parsed);
    return { state: normalized.state, source: 'storage' };
  } catch (error) {
    return {
      state: createInitialState(),
      source: 'recovered',
      error: error instanceof Error ? error.message : 'Saved data could not be read.',
    };
  }
}

export function saveState(state: AppState): { ok: boolean; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'No local storage.' };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not write to local storage.',
    };
  }
}

export function clearSavedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures during reset; in-memory state is still cleared.
  }
}

export function createExportBundle(state: AppState): ExportBundle {
  return {
    app: 'DSA Command Center',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    dataset: {
      sourceSha256: dataset.meta.sourceSha256,
      totalProblems: dataset.meta.totalProblems,
      importedAt: dataset.meta.importedAt,
    },
    state,
  };
}

export interface ParsedImport {
  state: AppState;
  summary: ImportSummary;
}

export function parseImportBundle(text: string): ParsedImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The backup file is empty or malformed.');
  const container = parsed as { app?: unknown; state?: unknown; dataset?: { sourceSha256?: unknown }; exportedAt?: unknown };
  const candidateState = container.state ?? parsed;
  if (!candidateState || typeof candidateState !== 'object') {
    throw new Error('The backup does not contain app state.');
  }
  const candidate = candidateState as Partial<AppState>;
  if (!candidate.progress || typeof candidate.progress !== 'object' || Array.isArray(candidate.progress)) {
    throw new Error('The backup has no progress records.');
  }
  const normalized = normalizeState(candidateState);
  const progressValues = Object.values(normalized.state.progress);
  const summary: ImportSummary = {
    problemsTouched: progressValues.length,
    attempts: progressValues.reduce((total, item) => total + item.attempts.length, 0),
    reviewsCompleted: progressValues.reduce(
      (total, item) => total + item.cycles.reduce(
        (cycleTotal, cycle) => cycleTotal + cycle.stages.filter((stage) => stage.completedOn).length,
        0,
      ),
      0,
    ),
    events: normalized.state.events.length,
    unknownProblems: normalized.unknownProblems,
    datasetMismatch:
      typeof container.dataset?.sourceSha256 === 'string' &&
      container.dataset.sourceSha256 !== dataset.meta.sourceSha256,
    exportedAt: typeof container.exportedAt === 'string' ? container.exportedAt : undefined,
  };
  return { state: normalized.state, summary };
}

export function backupFilename(prefix = 'dsa-command-center-backup'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${stamp}.json`;
}
