import type { ActiveTimer } from '../types';

export function elapsedSeconds(timer: ActiveTimer | null, nowMs = Date.now()): number {
  if (!timer) return 0;
  let seconds = timer.accumulatedSeconds;
  if (timer.running && timer.startedAt) {
    const started = Date.parse(timer.startedAt);
    if (!Number.isNaN(started)) {
      seconds += Math.max(0, (nowMs - started) / 1000);
    }
  }
  return Math.max(0, seconds);
}

export function startTimer(timer: ActiveTimer | null, problemId: string, at = new Date()): ActiveTimer {
  if (timer && timer.problemId === problemId) {
    if (timer.running) return timer;
    return {
      ...timer,
      running: true,
      startedAt: at.toISOString(),
    };
  }
  return {
    problemId,
    running: true,
    startedAt: at.toISOString(),
    accumulatedSeconds: 0,
  };
}

export function pauseTimer(timer: ActiveTimer | null, at = new Date()): ActiveTimer | null {
  if (!timer || !timer.running) return timer;
  return {
    ...timer,
    running: false,
    startedAt: undefined,
    accumulatedSeconds: elapsedSeconds(timer, at.getTime()),
  };
}
