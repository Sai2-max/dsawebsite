import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'border border-brand/60 bg-brand text-canvas shadow-[0_10px_30px_-14px_rgb(var(--brand)/0.9)] hover:bg-brand/90 active:translate-y-px',
  secondary:
    'border border-line bg-elevated/80 text-ink hover:border-brand/40 hover:bg-elevated',
  ghost: 'border border-transparent text-muted hover:bg-elevated hover:text-ink',
  subtle: 'border border-brand/25 bg-brand/10 text-brand hover:bg-brand/15',
  danger: 'border border-bad/30 bg-bad/10 text-bad hover:bg-bad/15',
  success: 'border border-good/30 bg-good/10 text-good hover:bg-good/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm',
  icon: 'h-9 w-9 rounded-lg',
};

export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, disabled, icon, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'icon';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, variant = 'ghost', size = 'icon', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={buttonClasses(variant, size, cn('p-0', className))}
      {...props}
    >
      {children}
    </button>
  );
});
