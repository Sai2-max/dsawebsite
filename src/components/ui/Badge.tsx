import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'neutral' | 'brand' | 'cyan' | 'violet' | 'good' | 'warn' | 'bad' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'border-line bg-elevated/80 text-muted',
  brand: 'border-brand/25 bg-brand/10 text-brand',
  cyan: 'border-cyan/25 bg-cyan/10 text-cyan',
  violet: 'border-violet/25 bg-violet/10 text-violet',
  good: 'border-good/25 bg-good/10 text-good',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  bad: 'border-bad/25 bg-bad/10 text-bad',
  outline: 'border-line bg-transparent text-muted',
};

const dotTones: Record<Tone, string> = {
  neutral: 'bg-faint',
  brand: 'bg-brand',
  cyan: 'bg-cyan',
  violet: 'bg-violet',
  good: 'bg-good',
  warn: 'bg-warn',
  bad: 'bg-bad',
  outline: 'bg-muted',
};

export function Badge({
  children,
  tone = 'neutral',
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]',
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} /> : null}
      {children}
    </span>
  );
}

export function DifficultyDots({ value, className }: { value?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={value ? `Difficulty ${value} of 5` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((dot) => (
        <span
          key={dot}
          className={cn(
            'h-1.5 w-1.5 rounded-full transition',
            value && dot <= value
              ? dot <= 2
                ? 'bg-good'
                : dot <= 3
                  ? 'bg-warn'
                  : 'bg-bad'
              : 'bg-line',
          )}
        />
      ))}
    </span>
  );
}
