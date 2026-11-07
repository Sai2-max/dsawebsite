import type { AppState, DueReview, Problem, ProblemProgress, ProgressStatus } from '../types';
import { addDays, diffDays, isValidDateKey, lastNDays, toDateKey, todayKey } from './dates';
import { companies, getProblem, problems, topics } from './dataset';
import { listDueReviews, listUpcomingReviews, totalCompletedReviews, totalReachedReviews } from './revision';
import { percent, sum, unique } from './utils';

export const STUDY_EVENT_TYPES = new Set(['attempt', 'solve', 'needs_practice', 'review']);

export function progressFor(state: AppState, problemId: string): ProblemProgress | undefined {
  return state.progress[problemId];
}

export function statusOf(state: AppState, problemId: string): ProgressStatus {
  return state.progress[problemId]?.status ?? 'new';
}

export function isSolvedEver(state: AppState, problemId: string): boolean {
  return Boolean(state.progress[problemId]?.solvedEver);
}

export function earliestAttemptDate(progress: ProblemProgress): string | undefined {
  if (progress.attempts.length === 0) return undefined;
  const dates = progress.attempts
    .map((attempt) => {
      const date = new Date(attempt.createdAt);
      return Number.isNaN(date.getTime()) ? undefined : toDateKey(date);
    })
    .filter((date): date is string => Boolean(date))
    .sort();
  return dates[0];
}

export function getSolvedRows(state: AppState): number {
  return problems.filter((problem) => state.progress[problem.id]?.solvedEver).length;
}

export function getSolvedCanonicalIds(state: AppState): Set<string> {
  const set = new Set<string>();
  for (const [problemId, progress] of Object.entries(state.progress)) {
    if (!progress.solvedEver) continue;
    const problem = getProblem(problemId);
    if (problem) set.add(problem.canonicalId);
  }
  return set;
}

export function getSolvedUniqueCount(state: AppState): number {
  return getSolvedCanonicalIds(state).size;
}

export interface StatusCounts {
  new: number;
  attempted: number;
  solved: number;
  needs_practice: number;
  skipped: number;
  solvedEver: number;
  solvedRows: number;
  touchedRows: number;
}

export function getStatusCounts(state: AppState): StatusCounts {
  const counts: StatusCounts = {
    new: 0,
    attempted: 0,
    solved: 0,
    needs_practice: 0,
    skipped: 0,
    solvedEver: 0,
    solvedRows: 0,
    touchedRows: 0,
  };
  for (const problem of problems) {
    const progress = state.progress[problem.id];
    const status = progress?.status ?? 'new';
    counts[status] += 1;
    if (progress?.solvedEver) {
      counts.solvedEver += 1;
      counts.solvedRows += 1;
    }
    if (progress && (progress.attempts.length > 0 || progress.status !== 'new' || progress.solvedEver)) {
      counts.touchedRows += 1;
    }
  }
  return counts;
}

export function getStudyDates(state: AppState): Set<string> {
  const dates = new Set<string>();
  for (const event of state.events) {
    if (STUDY_EVENT_TYPES.has(event.type) && isValidDateKey(event.date)) dates.add(event.date);
  }
  for (const progress of Object.values(state.progress)) {
    for (const attempt of progress.attempts) {
      const date = new Date(attempt.createdAt);
      if (!Number.isNaN(date.getTime())) dates.add(toDateKey(date));
    }
    for (const cycle of progress.cycles) {
      for (const stage of cycle.stages) {
        if (isValidDateKey(stage.completedOn)) dates.add(stage.completedOn);
      }
    }
  }
  return dates;
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActive?: string;
}

export function getStreak(state: AppState, today = todayKey()): StreakInfo {
  const dates = getStudyDates(state);
  if (dates.size === 0) return { current: 0, longest: 0, activeToday: false };
  const sorted = [...dates].sort();
  let longest = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (diffDays(sorted[index - 1], sorted[index]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (sorted[index] !== sorted[index - 1]) {
      run = 1;
    }
  }
  const activeToday = dates.has(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let current = 0;
  while (dates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return {
    current,
    longest,
    activeToday,
    lastActive: sorted[sorted.length - 1],
  };
}

export function getStudySeconds(state: AppState): number {
  return sum(
    Object.values(state.progress).flatMap((progress) =>
      progress.attempts.map((attempt) => attempt.seconds),
    ),
  );
}

export interface ActivityCell {
  date: string;
  count: number;
  minutes: number;
  solves: number;
  reviews: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export function getActivityMap(state: AppState): Map<string, ActivityCell> {
  const map = new Map<string, ActivityCell>();
  const ensure = (date: string) => {
    const existing = map.get(date);
    if (existing) return existing;
    const cell: ActivityCell = {
      date,
      count: 0,
      minutes: 0,
      solves: 0,
      reviews: 0,
      level: 0,
      future: false,
    };
    map.set(date, cell);
    return cell;
  };
  for (const event of state.events) {
    if (!STUDY_EVENT_TYPES.has(event.type) || !isValidDateKey(event.date)) continue;
    const cell = ensure(event.date);
    cell.count += 1;
    if (event.type === 'solve') cell.solves += 1;
    if (event.type === 'review') cell.reviews += 1;
    // Attempt events duplicate attempt records below; count those minutes once.
    if (event.type === 'review' && typeof event.minutes === 'number') cell.minutes += event.minutes;
  }
  // Attempts are authoritative for time and keep old/imported data visible.
  for (const progress of Object.values(state.progress)) {
    for (const attempt of progress.attempts) {
      const date = new Date(attempt.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = toDateKey(date);
      const cell = ensure(key);
      if (cell.count === 0) cell.count = 1;
      cell.minutes += attempt.seconds / 60;
    }
    for (const cycle of progress.cycles) {
      for (const stage of cycle.stages) {
        if (!isValidDateKey(stage.completedOn)) continue;
        const cell = ensure(stage.completedOn);
        if (cell.reviews === 0 && cell.count === 0) {
          cell.count = 1;
          cell.reviews = 1;
        }
      }
    }
  }
  for (const cell of map.values()) {
    cell.level = cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count === 2 ? 2 : cell.count <= 4 ? 3 : 4;
  }
  return map;
}

export function getHeatmap(
  state: AppState,
  today = todayKey(),
  weeks = 26,
  weekStartsOn: 0 | 1 = 1,
): ActivityCell[] {
  const activity = getActivityMap(state);
  const todayDate = new Date(`${today}T12:00:00`);
  const day = todayDate.getDay();
  const delta = weekStartsOn === 1 ? (day + 6) % 7 : day;
  const currentWeekStart = addDays(today, -delta);
  const start = addDays(currentWeekStart, -(weeks - 1) * 7);
  const days = lastNDays(addDays(currentWeekStart, 6), weeks * 7);
  const end = days[days.length - 1];
  return days.map((date) => {
    const cell = date < start ? undefined : activity.get(date);
    return {
      date,
      count: cell?.count ?? 0,
      minutes: cell?.minutes ?? 0,
      solves: cell?.solves ?? 0,
      reviews: cell?.reviews ?? 0,
      level: cell?.level ?? 0,
      future: date > today && date <= end,
    };
  });
}

export interface ReviewStats {
  completed: number;
  reached: number;
  due: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  completionRate: number;
}

export function getReviewStats(state: AppState, today = todayKey()): ReviewStats {
  const due = listDueReviews(state.progress, today);
  const upcoming = listUpcomingReviews(state.progress, today, 1000);
  let completed = 0;
  let reached = 0;
  for (const progress of Object.values(state.progress)) {
    completed += totalCompletedReviews(progress);
    reached += totalReachedReviews(progress, today);
  }
  return {
    completed,
    reached,
    due: due.length,
    overdue: due.filter((review) => review.urgency === 'overdue').length,
    dueToday: due.filter((review) => review.urgency === 'today').length,
    upcoming: upcoming.length,
    completionRate: reached === 0 ? 0 : Math.min(100, Math.round((completed / reached) * 100)),
  };
}

export function getDueReviews(state: AppState, today = todayKey()): DueReview[] {
  return listDueReviews(state.progress, today);
}

export function getUpcomingReviews(state: AppState, today = todayKey(), limit = 5): DueReview[] {
  return listUpcomingReviews(state.progress, today, limit);
}

export interface NewQueueResult {
  queue: Problem[];
  onDeck: Problem[];
  exhaustedCanonicals: Set<string>;
}

export function getNewQueue(state: AppState, limit: number): NewQueueResult {
  const exhausted = new Set<string>();
  for (const [problemId, progress] of Object.entries(state.progress)) {
    const problem = getProblem(problemId);
    if (!problem) continue;
    if (progress.attempts.length > 0 || progress.solvedEver || progress.status !== 'new' || progress.skippedOn) {
      exhausted.add(problem.canonicalId);
    }
  }
  const candidates: Problem[] = [];
  const selected = new Set<string>();
  for (const problem of problems) {
    if (exhausted.has(problem.canonicalId) || selected.has(problem.canonicalId)) continue;
    const progress = state.progress[problem.id];
    if (progress && (progress.attempts.length > 0 || progress.solvedEver || progress.status !== 'new')) continue;
    selected.add(problem.canonicalId);
    candidates.push(problem);
  }
  return {
    queue: candidates.slice(0, limit),
    onDeck: candidates.slice(limit, limit + 3),
    exhaustedCanonicals: exhausted,
  };
}

export interface TodayPlan {
  date: string;
  target: number;
  introduced: number;
  slotsRemaining: number;
  newQueue: Problem[];
  onDeck: Problem[];
  reviewsDue: DueReview[];
  overdueReviews: DueReview[];
  inProgress: Problem[];
  needsPractice: Problem[];
  solvedToday: Problem[];
  rowsSolvedToday: number;
  reviewsCompletedToday: number;
  studyMinutes: number;
  targetMet: boolean;
  progressPercent: number;
  nextUp: Problem[];
}

export function getTodayPlan(state: AppState, today = todayKey()): TodayPlan {
  const target = state.settings.dailyTarget;
  const introducedCanonicals = new Set<string>();
  const solvedTodayCanonicals = new Set<string>();
  const solvedTodayRows: Problem[] = [];
  const rolledBackCanonicals = new Set<string>();
  const rolledBackRows: Problem[] = [];
  for (const [problemId, progress] of Object.entries(state.progress)) {
    const problem = getProblem(problemId);
    if (!problem) continue;
    const earliest = earliestAttemptDate(progress);
    const introducedToday =
      earliest === today || (!progress.attempts.length && progress.firstSolvedOn === today);
    const solvedNow = Boolean(progress.solvedEver);
    if (introducedToday) introducedCanonicals.add(problem.canonicalId);
    if (solvedNow && progress.lastSolvedOn === today && !solvedTodayCanonicals.has(problem.canonicalId)) {
      solvedTodayCanonicals.add(problem.canonicalId);
      solvedTodayRows.push(problem);
    }
    // A row introduced today that is no longer solved (for example it was
    // checked by mistake and then unchecked) returns to today's cards.
    if (
      introducedToday &&
      !solvedNow &&
      progress.status !== 'skipped' &&
      progress.status !== 'needs_practice' &&
      !rolledBackCanonicals.has(problem.canonicalId)
    ) {
      rolledBackCanonicals.add(problem.canonicalId);
      rolledBackRows.push(problem);
    }
  }
  const introduced = introducedCanonicals.size;
  const slotsRemaining = Math.max(0, target - introduced);
  const { queue, onDeck } = getNewQueue(state, Math.max(slotsRemaining, 0) + 3);
  const freshRows = queue.slice(0, Math.max(slotsRemaining, 0));
  const newQueue = [...rolledBackRows, ...freshRows].sort((a, b) => a.number - b.number);
  const cardIds = new Set(newQueue.map((problem) => problem.id));
  const solvedToday = solvedTodayRows.sort((a, b) => a.number - b.number);
  const reviewsDue = getDueReviews(state, today);
  const inProgress = problems
    .filter((problem) => {
      if (cardIds.has(problem.id)) return false;
      const progress = state.progress[problem.id];
      if (!progress) return false;
      return progress.status === 'attempted' || progress.status === 'needs_practice';
    })
    .sort((a, b) => {
      const aTime = state.progress[a.id]?.lastActivityAt ?? '';
      const bTime = state.progress[b.id]?.lastActivityAt ?? '';
      return bTime.localeCompare(aTime) || a.number - b.number;
    });
  const needsPractice = inProgress.filter(
    (problem) => state.progress[problem.id]?.status === 'needs_practice',
  );
  const reviewsCompletedToday = state.events.filter(
    (event) => event.type === 'review' && event.date === today,
  ).length;
  const studyMinutes =
    sum(
      Object.values(state.progress).flatMap((progress) =>
        progress.attempts
          .filter((attempt) => {
            const date = new Date(attempt.createdAt);
            return !Number.isNaN(date.getTime()) && toDateKey(date) === today;
          })
          .map((attempt) => attempt.seconds),
      ),
    ) / 60;
  return {
    date: today,
    target,
    introduced,
    slotsRemaining,
    newQueue,
    onDeck: queue.length > slotsRemaining ? queue.slice(slotsRemaining) : onDeck,
    reviewsDue,
    overdueReviews: reviewsDue.filter((review) => review.urgency === 'overdue'),
    inProgress,
    needsPractice,
    solvedToday,
    rowsSolvedToday: solvedToday.length,
    reviewsCompletedToday,
    studyMinutes,
    targetMet: introduced >= target,
    progressPercent: target === 0 ? 100 : Math.min(100, Math.round((introduced / target) * 100)),
    nextUp: queue.slice(0, 3),
  };
}

export interface TopicStat {
  id: string;
  name: string;
  sourceNumber: string;
  order: number;
  totalRows: number;
  uniqueRows: number;
  solvedRows: number;
  solvedUnique: number;
  attemptedRows: number;
  needsPracticeRows: number;
  skippedRows: number;
  dueCount: number;
  overdueCount: number;
  reviewsCompleted: number;
  minutes: number;
  progressPercent: number;
  companyCount: number;
  subtopics: string[];
  lastActivity?: string;
}

export function getTopicStats(state: AppState, today = todayKey()): TopicStat[] {
  const dueReviews = getDueReviews(state, today);
  return topics.map((topic) => {
    const topicRows = problems.filter((problem) => problem.topicId === topic.id);
    const progressList = topicRows
      .map((problem) => state.progress[problem.id])
      .filter((progress): progress is ProblemProgress => Boolean(progress));
    const solvedProblems = topicRows.filter((problem) => state.progress[problem.id]?.solvedEver);
    const uniqueCanonicals = new Set(topicRows.map((problem) => problem.canonicalId));
    const solvedCanonicals = new Set(solvedProblems.map((problem) => problem.canonicalId));
    const companyNames = new Set(topicRows.flatMap((problem) => problem.companies.map((company) => company.name)));
    const due = dueReviews.filter((review) => {
      const problem = getProblem(review.problemId);
      return problem?.topicId === topic.id;
    });
    const lastActivity = progressList
      .map((progress) => progress.lastActivityAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    return {
      id: topic.id,
      name: topic.name,
      sourceNumber: topic.sourceNumber,
      order: topic.order,
      totalRows: topicRows.length,
      uniqueRows: uniqueCanonicals.size,
      solvedRows: solvedProblems.length,
      solvedUnique: solvedCanonicals.size,
      attemptedRows: topicRows.filter((problem) => state.progress[problem.id]?.status === 'attempted').length,
      needsPracticeRows: topicRows.filter(
        (problem) => state.progress[problem.id]?.status === 'needs_practice',
      ).length,
      skippedRows: topicRows.filter((problem) => state.progress[problem.id]?.status === 'skipped').length,
      dueCount: due.length,
      overdueCount: due.filter((review) => review.urgency === 'overdue').length,
      reviewsCompleted: progressList.reduce((total, progress) => total + totalCompletedReviews(progress), 0),
      minutes: sum(progressList.flatMap((progress) => progress.attempts.map((attempt) => attempt.seconds))) / 60,
      progressPercent: uniqueCanonicals.size === 0 ? 0 : percent(solvedCanonicals.size, uniqueCanonicals.size),
      companyCount: companyNames.size,
      subtopics: unique(topicRows.map((problem) => problem.subtopic)).sort(),
      lastActivity,
    };
  });
}

export interface CompanyStat {
  name: string;
  rows: number;
  uniqueRows: number;
  solvedRows: number;
  solvedUnique: number;
  dueCount: number;
  overdueCount: number;
  minutes: number;
  attempts: number;
  progressPercent: number;
}

export function getCompanyStats(state: AppState, today = todayKey()): CompanyStat[] {
  const dueReviews = getDueReviews(state, today);
  return companies.map((company) => {
    const solvedRows = company.problems.filter((problem) => state.progress[problem.id]?.solvedEver);
    const solvedCanonicals = new Set(solvedRows.map((problem) => problem.canonicalId));
    const due = dueReviews.filter((review) => company.problems.some((problem) => problem.id === review.problemId));
    const progressList = company.problems
      .map((problem) => state.progress[problem.id])
      .filter((progress): progress is ProblemProgress => Boolean(progress));
    return {
      name: company.name,
      rows: company.problemCount,
      uniqueRows: new Set(company.problems.map((problem) => problem.canonicalId)).size,
      solvedRows: solvedRows.length,
      solvedUnique: solvedCanonicals.size,
      dueCount: due.length,
      overdueCount: due.filter((review) => review.urgency === 'overdue').length,
      minutes: sum(progressList.flatMap((progress) => progress.attempts.map((attempt) => attempt.seconds))) / 60,
      attempts: sum(progressList.map((progress) => progress.attempts.length)),
      progressPercent:
        company.uniqueProblemCount === 0 ? 0 : percent(solvedCanonicals.size, company.uniqueProblemCount),
    };
  });
}

export interface RecentActivity {
  event: AppState['events'][number];
  problem?: Problem;
}

export function getRecentActivity(state: AppState, limit = 8): RecentActivity[] {
  return state.events
    .filter((event) => event.type !== 'import' && event.type !== 'reset')
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((event) => ({
      event,
      problem: event.problemId ? getProblem(event.problemId) : undefined,
    }));
}

export function getDifficultyCounts(state: AppState): Array<{ value: number | 'unrated'; count: number }> {
  const counts = new Map<number, number>();
  let unrated = 0;
  for (const progress of Object.values(state.progress)) {
    if (progress.attempts.length === 0 && progress.status === 'new') continue;
    if (progress.difficulty) counts.set(progress.difficulty, (counts.get(progress.difficulty) ?? 0) + 1);
    else unrated += 1;
  }
  const result: Array<{ value: number | 'unrated'; count: number }> = [1, 2, 3, 4, 5].map(
    (value) => ({ value, count: counts.get(value) ?? 0 }),
  );
  result.push({ value: 'unrated', count: unrated });
  return result;
}

export function getAverageDifficulty(state: AppState): number | null {
  const values = Object.values(state.progress)
    .map((progress) => progress.difficulty)
    .filter((value): value is 1 | 2 | 3 | 4 | 5 => Boolean(value));
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function getWeeklyActivity(
  state: AppState,
  today = todayKey(),
  days = 7,
): Array<{ date: string; label: string; count: number; minutes: number; solves: number; reviews: number }> {
  const activity = getActivityMap(state);
  return lastNDays(today, days).map((date) => {
    const cell = activity.get(date);
    return {
      date,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
      count: cell?.count ?? 0,
      minutes: cell?.minutes ?? 0,
      solves: cell?.solves ?? 0,
      reviews: cell?.reviews ?? 0,
    };
  });
}

export function getTodaySummary(state: AppState, today = todayKey()) {
  const plan = getTodayPlan(state, today);
  return {
    plan,
    reviewStats: getReviewStats(state, today),
    streak: getStreak(state, today),
    studyMinutes: getStudySeconds(state) / 60,
    solvedUnique: getSolvedUniqueCount(state),
    solvedRows: getSolvedRows(state),
    statusCounts: getStatusCounts(state),
  };
}
