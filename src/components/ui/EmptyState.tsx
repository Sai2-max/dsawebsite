import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-elevated text-muted">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-canvas/50 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            option.value === value
              ? 'bg-elevated text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
          aria-pressed={option.value === value}
        >
          {option.label}
          {typeof option.count === 'number' ? (
            <span className="ml-1.5 text-[10px] text-faint">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
