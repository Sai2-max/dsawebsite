import { Link } from 'react-router-dom';
import { ExternalLink, Pause, Play, RotateCcw, Square, TimerReset } from 'lucide-react';
import { useNow, useStore } from '../store/StoreContext';
import { elapsedSeconds } from '../lib/timer';
import { formatDuration } from '../lib/dates';
import { getProblem } from '../lib/dataset';
import { Button, IconButton } from './ui/Button';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';

function LiveElapsed({ problemId, className }: { problemId: string; className?: string }) {
  const { state } = useStore();
  const now = useNow(1000);
  const timer = state.timer?.problemId === problemId ? state.timer : null;
  if (!timer) return <span className={className}>0:00</span>;
  return <span className={className}>{formatDuration(elapsedSeconds(timer, now))}</span>;
}

export function TimerControls({
  problemId,
  compact = false,
  allowClear = false,
  className,
}: {
  problemId: string;
  compact?: boolean;
  allowClear?: boolean;
  className?: string;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const timer = state.timer?.problemId === problemId ? state.timer : null;
  const otherTimer = state.timer && state.timer.problemId !== problemId ? state.timer : null;

  const toggle = () => {
    if (otherTimer) {
      const other = getProblem(otherTimer.problemId);
      toast(
        `A timer is already running for ${other ? `#${other.number} ${other.title}` : 'another problem'}. Pause and clear it first.`,
        'error',
      );
      return;
    }
    if (!timer) {
      dispatch({ type: 'TIMER_START', problemId });
      return;
    }
    if (timer.running) {
      dispatch({ type: 'TIMER_PAUSE' });
    } else {
      dispatch({ type: 'TIMER_START', problemId });
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Button
        type="button"
        size={compact ? 'sm' : 'md'}
        variant={timer?.running ? 'subtle' : 'secondary'}
        onClick={toggle}
        icon={
          timer?.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />
        }
        title={timer?.running ? 'Pause timer' : timer ? 'Resume timer' : 'Start timer'}
      >
        <LiveElapsed problemId={problemId} className="font-mono tabular-nums" />
      </Button>
      {allowClear && timer ? (
        <IconButton
          label="Discard timer"
          size="icon"
          onClick={() => dispatch({ type: 'TIMER_CLEAR' })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
    </div>
  );
}

export function TimerBar() {
  const { state, dispatch } = useStore();
  const now = useNow(1000);
  if (!state.timer) return null;
  const problem = getProblem(state.timer.problemId);
  if (!problem) return null;
  const elapsed = elapsedSeconds(state.timer, now);
  return (
    <div className="fixed inset-x-3 bottom-36 z-[70] lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[380px]">
      <div className="flex items-center gap-3 rounded-xl2 border border-brand/30 bg-surface/95 p-3 shadow-glow backdrop-blur-xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <TimerReset className={cn('h-4 w-4', state.timer.running && 'animate-pulseSoft')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-ink">
              {formatDuration(elapsed)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              {state.timer.running ? 'Focusing' : 'Paused'}
            </span>
          </div>
          <Link
            to={`/problem/${problem.id}`}
            className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted transition hover:text-ink"
          >
            #{problem.number} · {problem.title}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </div>
        <IconButton
          label={state.timer.running ? 'Pause timer' : 'Resume timer'}
          onClick={() =>
            state.timer?.running
              ? dispatch({ type: 'TIMER_PAUSE' })
              : dispatch({ type: 'TIMER_START', problemId: state.timer!.problemId })
          }
          variant="secondary"
        >
          {state.timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label="Stop and discard timer"
          onClick={() => dispatch({ type: 'TIMER_CLEAR' })}
          title="Discard timer"
        >
          <Square className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
