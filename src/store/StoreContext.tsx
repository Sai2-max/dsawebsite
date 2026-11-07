import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadState, saveState, type LoadResult } from '../lib/storage';
import { todayKey } from '../lib/dates';
import { appReducer, type Action } from './reducer';
import type { AppState } from '../types';

interface PersistenceState {
  status: 'saved' | 'error';
  lastSavedAt?: string;
  error?: string;
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  persistence: PersistenceState;
  loadInfo: LoadResult;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState<LoadResult>(() => loadState());
  const [state, dispatch] = useReducer(appReducer, initialLoad.state);
  const [persistence, setPersistence] = useState<PersistenceState>({ status: 'saved' });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const result = saveState(state);
    if (result.ok) {
      setPersistence({ status: 'saved', lastSavedAt: new Date().toISOString() });
    } else {
      setPersistence({ status: 'error', error: result.error });
    }
  }, [state]);

  useEffect(() => {
    const flush = () => {
      saveState(stateRef.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const theme =
        state.settings.theme === 'system'
          ? media.matches
            ? 'light'
            : 'dark'
          : state.settings.theme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    };
    apply();
    if (state.settings.theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    return undefined;
  }, [state.settings.theme]);

  const value = useMemo(
    () => ({ state, dispatch, persistence, loadInfo: initialLoad }),
    [state, persistence, initialLoad],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider.');
  return context;
}

export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const update = () => setToday((current) => {
      const next = todayKey();
      return current === next ? current : next;
    });
    const interval = window.setInterval(update, 30_000);
    const onVisibility = () => update();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return today;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}

export function useStableCallback<T extends (...args: never[]) => void>(callback: T): T {
  const ref = useRef(callback);
  ref.current = callback;
  return useCallback(((...args: Parameters<T>) => ref.current(...args)) as T, []);
}
