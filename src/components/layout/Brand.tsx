import { Link } from 'react-router-dom';

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#brand-bg)" stroke="rgb(255 255 255 / 0.12)" />
      <path d="M15 34V14h7.5c8.3 0 13.5 3.7 13.5 10s-5.2 10-13.5 10H15Z" stroke="#dbeafe" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M30.5 14H34M30.5 34H34" stroke="#67e8f9" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 38h32" stroke="url(#brand-line)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <defs>
        <linearGradient id="brand-bg" x1="5" y1="2" x2="43" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12284c" />
          <stop offset="1" stopColor="#081122" />
        </linearGradient>
        <linearGradient id="brand-line" x1="8" y1="38" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b9dff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#5b9dff" />
          <stop offset="1" stopColor="#35d6ed" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={compact ? 'font-display text-sm font-semibold tracking-tight' : 'font-display text-[15px] font-semibold tracking-tight'}>
        DSA <span className="text-brand">//</span> COMMAND
      </p>
      {!compact ? <p className="eyebrow mt-0.5 text-[9px]">CENTER</p> : null}
    </div>
  );
}

export function BrandLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-3">
      <BrandMark />
      <Wordmark />
    </Link>
  );
}
