import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  className,
  height = 'h-2',
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'cyan' | 'violet' | 'good' | 'warn' | 'bad';
  className?: string;
  height?: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass = {
    brand: 'bg-brand',
    cyan: 'bg-cyan',
    violet: 'bg-violet',
    good: 'bg-good',
    warn: 'bg-warn',
    bad: 'bg-bad',
  }[tone];
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-line/60', height, className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', toneClass)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 112,
  stroke = 7,
  tone = 'brand',
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: 'brand' | 'cyan' | 'violet' | 'good';
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const dash = circumference * percent;
  const colors = {
    brand: 'rgb(var(--brand))',
    cyan: 'rgb(var(--cyan))',
    violet: 'rgb(var(--violet))',
    good: 'rgb(var(--good))',
  };
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
