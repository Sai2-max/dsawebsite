import { Check } from 'lucide-react';
import { addDays, formatDateKey, todayKey } from '../lib/dates';
import { elapsedSeconds } from '../lib/timer';
import { useStore } from '../store/StoreContext';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';

type SolvedCheckboxSize = 'sm' | 'md' | 'lg';

const circleSizes: Record<SolvedCheckboxSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
};

const iconSizes: Record<SolvedCheckboxSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

/**
 * A TUF-style round completion control.
 *
 * Checking marks the problem solved and starts its fixed Day 1 / 3 / 7 / 30
 * revision cycle. Clicking again unchecks it: the current status flips to
 * "not solved now" while attempt history and revision records are preserved —
 * nothing is ever deleted.
 */
export function SolvedCheckbox({
  problemId,
  title,
  size = 'md',
  showLabel = false,
  className,
}: {
  problemId: string;
  title: string;
  size?: SolvedCheckboxSize;
  showLabel?: boolean;
  className?: string;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const solved = Boolean(state.progress[problemId]?.solvedEver);
  const timer = state.timer?.problemId === problemId ? state.timer : null;

  const handleClick = () => {
    if (solved) {
      dispatch({ type: 'UNDO_SOLVE', problemId });
      toast('Unchecked. Attempt history is preserved.', 'info');
      return;
    }
    const seconds = timer ? Math.round(elapsedSeconds(timer, Date.now())) : 0;
    dispatch({ type: 'LOG_ATTEMPT', problemId, outcome: 'solved', seconds });
    toast(
      `Solved. Day 1 review scheduled for ${formatDateKey(addDays(todayKey(), 1), { month: 'short', day: 'numeric' })}.`,
      'success',
    );
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={solved}
      aria-label={solved ? `${title} is solved — click to uncheck` : `Mark ${title} as solved`}
      title={
        solved
          ? 'Solved — click to uncheck (attempt history is preserved)'
          : 'Mark solved and start Day 1 / 3 / 7 / 30 revisions'
      }
      onClick={handleClick}
      className={cn(
        'group/check inline-flex w-fit shrink-0 items-center gap-2 rounded-full text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          circleSizes[size],
          solved
            ? 'border-good bg-good text-canvas shadow-[0_0_0_4px_rgb(var(--good)/0.10)]'
            : 'border-line bg-canvas/55 text-transparent group-hover/check:border-brand/70 group-hover/check:bg-brand/10 group-hover/check:shadow-[0_0_0_4px_rgb(var(--brand)/0.08)]',
        )}
      >
        {solved ? (
          <Check
            className={cn(iconSizes[size], 'animate-checkPop')}
            strokeWidth={3.25}
            aria-hidden="true"
          />
        ) : null}
      </span>
      {showLabel ? (
        <span
          className={cn(
            'text-[11px] font-semibold transition',
            solved ? 'text-good' : 'text-muted group-hover/check:text-ink',
          )}
        >
          {solved ? 'Solved' : 'Mark solved'}
        </span>
      ) : null}
    </button>
  );
}
