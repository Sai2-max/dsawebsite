const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const [, y, m, d] = DATE_KEY_RE.exec(value)!;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 12);
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(m) - 1 &&
    date.getDate() === Number(d)
  );
}

export function parseDateKey(key: string): Date {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function addMonths(key: string, amount: number): string {
  const date = parseDateKey(key);
  date.setMonth(date.getMonth() + amount, 1);
  return toDateKey(date);
}

/** Calendar-day difference (b - a) using local calendar dates, immune to DST shifts. */
export function diffDays(a: string, b: string): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isAfter(a: string, b: string): boolean {
  return a > b;
}

export function minDateKey(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDateKey(a: string, b: string): string {
  return a >= b ? a : b;
}

export interface DateFormatOptions {
  weekday?: 'short' | 'long';
  month?: 'short' | 'long';
  day?: 'numeric';
  year?: 'numeric';
}

export function formatDateKey(key: string, options: DateFormatOptions = {}): string {
  if (!isValidDateKey(key)) return '—';
  return new Intl.DateTimeFormat(undefined, {
    weekday: options.weekday,
    month: options.month ?? 'short',
    day: options.day ?? 'numeric',
    year: options.year,
  }).format(parseDateKey(key));
}

export function formatDateLong(key: string): string {
  return formatDateKey(key, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, monthIndex, 1, 12),
  );
}

export function formatWeekdayShort(key: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parseDateKey(key));
}

export function formatWeekdayNarrow(key: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(parseDateKey(key));
}

export function startOfWeek(key: string, weekStartsOn: 0 | 1): string {
  const date = parseDateKey(key);
  const day = date.getDay();
  const delta = weekStartsOn === 1 ? (day + 6) % 7 : day;
  return addDays(key, -delta);
}

export function startOfMonthKey(key: string): string {
  const date = parseDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12));
}

export function endOfMonthKey(key: string): string {
  const date = parseDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

export function getMonthGrid(
  year: number,
  monthIndex: number,
  weekStartsOn: 0 | 1,
): string[] {
  const first = new Date(year, monthIndex, 1, 12);
  const firstKey = toDateKey(first);
  const gridStart = startOfWeek(firstKey, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getWeekdayLabels(weekStartsOn: 0 | 1): string[] {
  const sunday = new Date(2024, 0, 7, 12); // Sunday
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
      new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + ((index + weekStartsOn) % 7), 12),
    ),
  );
}

export function lastNDays(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endKey, i - (count - 1)));
}

export function relativeDueLabel(dueOn: string, today: string): string {
  const delta = diffDays(today, dueOn);
  if (delta < 0) return `${Math.abs(delta)}d overdue`;
  if (delta === 0) return 'Due today';
  if (delta === 1) return 'Due tomorrow';
  if (delta < 7) return `Due in ${delta}d`;
  return formatDateKey(dueOn, { month: 'short', day: 'numeric' });
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
