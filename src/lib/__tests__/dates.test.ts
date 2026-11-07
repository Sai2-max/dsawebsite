import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  getMonthGrid,
  getWeekdayLabels,
  isValidDateKey,
  lastNDays,
  parseDateKey,
  startOfMonthKey,
  startOfWeek,
  toDateKey,
  todayKey,
} from '../dates';

describe('local calendar dates', () => {
  it('formats local dates without UTC drift', () => {
    expect(toDateKey(new Date(2026, 9, 27, 0, 5))).toBe('2026-10-27');
    expect(toDateKey(new Date(2026, 0, 1, 23, 55))).toBe('2026-01-01');
    expect(todayKey(new Date(2024, 1, 29, 12))).toBe('2024-02-29');
  });

  it('validates real calendar dates', () => {
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2026-04-31')).toBe(false);
    expect(isValidDateKey('2026-1-01')).toBe(false);
    expect(isValidDateKey(20260101)).toBe(false);
  });

  it('adds days across months, years and daylight-saving boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-03-09', 1)).toBe('2024-03-10');
    expect(addDays('2024-11-02', 1)).toBe('2024-11-03');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('calculates inclusive-exclusive calendar differences', () => {
    expect(diffDays('2026-01-01', '2026-01-04')).toBe(3);
    expect(diffDays('2026-01-04', '2026-01-01')).toBe(-3);
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffDays('2024-03-09', '2024-03-11')).toBe(2);
    expect(diffDays('2026-10-27', '2026-10-27')).toBe(0);
  });

  it('builds month grids that start on the configured weekday', () => {
    const mondayGrid = getMonthGrid(2026, 9, 1);
    expect(mondayGrid).toHaveLength(42);
    expect(mondayGrid[0]).toBe('2026-09-28');
    expect(parseDateKey(mondayGrid[0]).getDay()).toBe(1);
    expect(mondayGrid).toContain('2026-10-01');
    expect(mondayGrid).toContain('2026-10-31');

    const sundayGrid = getMonthGrid(2026, 9, 0);
    expect(parseDateKey(sundayGrid[0]).getDay()).toBe(0);
  });

  it('computes week starts and short rolling ranges', () => {
    expect(startOfWeek('2026-10-27', 1)).toBe('2026-10-26');
    expect(startOfWeek('2026-10-27', 0)).toBe('2026-10-25');
    expect(startOfWeek('2026-10-25', 1)).toBe('2026-10-19');
    expect(startOfMonthKey('2026-10-27')).toBe('2026-10-01');
    expect(lastNDays('2026-10-27', 3)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27']);
    expect(getWeekdayLabels(1)).toHaveLength(7);
  });
});
