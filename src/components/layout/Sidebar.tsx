import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarClock,
  ChevronLeft,
  LayoutDashboard,
  Layers3,
  Library,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Flame,
  X,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BrandLink } from './Brand';
import { useStore, useToday } from '../../store/StoreContext';
import { formatDateKey } from '../../lib/dates';
import {
  getDueReviews,
  getStreak,
  getSolvedUniqueCount,
  getStatusCounts,
  getTodayPlan,
} from '../../lib/stats';
import { dataset } from '../../lib/dataset';
import { ProgressBar } from '../ui/Progress';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui/Button';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  end?: boolean;
}

const pageTitles: Array<{ path: string; title: string; subtitle: string }> = [
  { path: '/', title: 'Dashboard', subtitle: 'Your command view' },
  { path: '/today', title: "Today's Plan", subtitle: 'Focus queue' },
  { path: '/library', title: 'Problem Library', subtitle: 'All 211 rows' },
  { path: '/calendar', title: 'Revision Calendar', subtitle: 'Day 1 / 3 / 7 / 30' },
  { path: '/topics', title: 'Topics', subtitle: '15 source sections' },
  { path: '/companies', title: 'Companies', subtitle: 'Source associations' },
  { path: '/analytics', title: 'Analytics', subtitle: 'Progress & trends' },
  { path: '/settings', title: 'Settings', subtitle: 'Data & preferences' },
  { path: '/report', title: 'Import Report', subtitle: 'Validation evidence' },
];

function titleForPath(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith('/problem/')) return { title: 'Problem Detail', subtitle: 'Notes & revisions' };
  const match = [...pageTitles].reverse().find((item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path));
  return match ? { title: match.title, subtitle: match.subtitle } : { title: 'Not found', subtitle: 'Unknown route' };
}

function useNavBadges() {
  const { state } = useStore();
  const today = useToday();
  const due = getDueReviews(state, today).length;
  const statusCounts = getStatusCounts(state);
  return { due, needsPractice: statusCounts.needs_practice };
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { due, needsPractice } = useNavBadges();
  const primary: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/today', label: "Today's Plan", icon: Target, badge: planBadge(needsPractice) },
    { to: '/library', label: 'Problem Library', icon: Library },
    { to: '/calendar', label: 'Revision Calendar', icon: CalendarClock, badge: due ? String(due) : undefined },
  ];
  const insights: NavItem[] = [
    { to: '/topics', label: 'Topics', icon: Layers3 },
    { to: '/companies', label: 'Companies', icon: Building2 },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];
  const system: NavItem[] = [
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/report', label: 'Import Report', icon: ShieldCheck },
  ];
  return (
    <>
      <nav className="mt-7 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <NavGroup label="Workspace" items={primary} onNavigate={onNavigate} />
        <NavGroup label="Insights" items={insights} onNavigate={onNavigate} />
        <NavGroup label="System" items={system} onNavigate={onNavigate} />
      </nav>
      <SidebarFooter />
    </>
  );
}

function planBadge(needsPractice: number): string | undefined {
  return needsPractice ? String(needsPractice) : undefined;
}

function NavGroup({ label, items, onNavigate }: { label: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div>
      <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-faint">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-medium transition',
                isActive
                  ? 'bg-brand/10 text-ink shadow-[inset_0_0_0_1px_rgb(var(--brand)/0.18)]'
                  : 'text-muted hover:bg-elevated/70 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-4 w-4 shrink-0 transition', isActive ? 'text-brand' : 'text-faint group-hover:text-muted')} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full border border-line bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-muted">
                    {item.badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function SidebarFooter() {
  const { state } = useStore();
  const today = useToday();
  const solved = getSolvedUniqueCount(state);
  const streak = getStreak(state, today);
  const plan = getTodayPlan(state, today);
  const totalUnique = dataset.meta.uniqueProblems;
  return (
    <div className="border-t border-line/80 p-3">
      <div className="rounded-xl2 border border-line bg-canvas/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Today</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-warn">
            <Flame className="h-3 w-3" /> {streak.current}d
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="font-display text-xl font-semibold tabular-nums text-ink">
            {plan.introduced}<span className="text-sm font-normal text-faint">/{plan.target}</span>
          </span>
          <span className="text-[10px] text-faint">new introduced</span>
        </div>
        <ProgressBar value={plan.introduced} max={plan.target} height="h-1.5" className="mt-2" />
        <div className="mt-3 flex items-center justify-between text-[10px] text-faint">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-good" /> {solved}/{totalUnique} solved</span>
          <span>{dataset.meta.totalProblems} rows</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 px-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-[9px] font-bold text-brand">
          {(state.settings.studyName || 'OP').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-ink">{state.settings.studyName || 'Local operator'}</p>
          <p className="text-[9px] text-faint">Local-only workspace</p>
        </div>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
      <div className="px-5 pb-4 pt-5">
        <BrandLink />
        <p className="mt-4 text-[10.5px] leading-5 text-faint">
          {dataset.meta.totalProblems} rows · {dataset.meta.uniqueProblems} unique · local-first
        </p>
      </div>
      <SidebarNav />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-[#02060f]/70 backdrop-blur-sm" onClick={onClose} role="presentation" />
      <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-[310px] flex-col border-r border-line bg-surface shadow-card animate-fadeUp">
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <BrandLink onNavigate={onClose} />
          <IconButton label="Close navigation" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="mx-5 flex items-center justify-between rounded-xl border border-line bg-elevated/50 px-3 py-2 text-[10px] text-faint">
          <span>{dataset.meta.totalProblems} PDF rows</span>
          <span>15 topics</span>
          <span className="flex items-center gap-1 text-good"><span className="h-1.5 w-1.5 rounded-full bg-good" /> local</span>
        </div>
        <SidebarNav onNavigate={onClose} />
      </aside>
    </div>
  );
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { state, dispatch, persistence } = useStore();
  const location = useLocation();
  const today = useToday();
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const page = titleForPath(location.pathname);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      setResolvedTheme(
        state.settings.theme === 'system' ? (media.matches ? 'light' : 'dark') : state.settings.theme,
      );
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [state.settings.theme]);

  const toggleTheme = () => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: { theme: resolvedTheme === 'dark' ? 'light' : 'dark' } });
  };

  const savedLabel = useMemo(() => {
    if (persistence.status === 'error') return 'Storage issue';
    return 'Saved locally';
  }, [persistence.status]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="hidden min-w-0 lg:block">
            <div className="flex items-center gap-2 text-[11px] text-faint">
              <span>Workspace</span>
              <ChevronLeft className="h-3 w-3 rotate-180" />
              <span className="text-muted">{page.title}</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-ink">{page.subtitle}</p>
          </div>
          <div className="min-w-0 lg:hidden">
            <p className="truncate font-display text-sm font-semibold text-ink">{page.title}</p>
            <p className="truncate text-[10px] text-faint">{page.subtitle}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-[10px] font-medium text-muted sm:inline-flex">
            <CalendarClock className="h-3 w-3 text-brand" />
            {formatDateKey(today, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span
            className={cn(
              'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium md:inline-flex',
              persistence.status === 'error'
                ? 'border-bad/30 bg-bad/10 text-bad'
                : 'border-good/20 bg-good/5 text-good',
            )}
            title={persistence.error ?? (persistence.lastSavedAt ? `Last saved ${new Date(persistence.lastSavedAt).toLocaleTimeString()}` : 'Stored in your browser')}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', persistence.status === 'error' ? 'bg-bad' : 'bg-good')} />
            {savedLabel}
          </span>
          <Link
            to="/settings"
            className="hidden items-center gap-1 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-[10px] font-medium text-muted transition hover:text-ink sm:inline-flex"
            title="Theme preference is in Settings"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet" /> {state.settings.theme}
          </Link>
          <IconButton label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme} variant="secondary" size="icon">
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
          <Link
            to="/today"
            className="hidden h-9 items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-semibold text-brand transition hover:bg-brand/15 sm:inline-flex"
          >
            <Target className="h-3.5 w-3.5" /> Focus
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation();
  const items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
    { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/today', label: 'Today', icon: Target },
    { to: '/library', label: 'Library', icon: Library },
    { to: '/calendar', label: 'Revisions', icon: CalendarClock },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden safe-bottom">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.end ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-2.5 text-[9px] font-medium transition',
                active ? 'text-brand' : 'text-faint hover:text-muted',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center gap-0.5 px-1 py-2.5 text-[9px] font-medium text-faint transition hover:text-muted"
        >
          <Menu className="h-4 w-4" />
          More
        </button>
      </div>
    </nav>
  );
}

export function AppFooter() {
  const { state } = useStore();
  const today = useToday();
  const plan = getTodayPlan(state, today);
  return (
    <footer className="hidden border-t border-line/60 px-6 py-4 lg:flex lg:items-center lg:justify-between lg:px-8">
      <p className="text-[10px] text-faint">
        Built from the Bosscoder DSA Sheet · 211 source rows preserved · dates are local
      </p>
      <div className="flex items-center gap-4 text-[10px] text-faint">
        <span>{plan.introduced}/{plan.target} introduced today</span>
        <Link to="/report" className="transition hover:text-muted">Import evidence</Link>
        <span className="flex items-center gap-1 text-good"><span className="h-1 w-1 rounded-full bg-good" /> offline-ready</span>
      </div>
    </footer>
  );
}
