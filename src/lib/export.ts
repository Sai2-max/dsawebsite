import type { AppState } from '../types';
import { getNextDueReview, REVISION_STAGE_LABELS } from './revision';
import { problems } from './dataset';
import { toDateKey, todayKey } from './dates';
import { downloadFile } from './utils';
import { backupFilename, createExportBundle } from './storage';

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

export function buildProblemsCsv(state: AppState): string {
  const today = todayKey();
  const headers = [
    'number',
    'title',
    'source_title',
    'topic',
    'subtopic',
    'pdf_page',
    'printed_page',
    'platform',
    'url',
    'companies',
    'unverified_logo_count',
    'status',
    'solved_ever',
    'first_solved_on',
    'last_solved_on',
    'attempt_count',
    'study_seconds',
    'personal_difficulty',
    'time_complexity',
    'space_complexity',
    'next_review_stage',
    'next_review_date',
    'next_review_cycle',
    'notes',
    'mistakes',
    'learnings',
    'starred',
    'duplicate_numbers',
  ];
  const rows = [csvRow(headers)];
  for (const problem of problems) {
    const progress = state.progress[problem.id];
    const next = progress ? getNextDueReview(progress, today) : null;
    rows.push(
      csvRow([
        problem.number,
        problem.title,
        problem.sourceTitle,
        problem.topic,
        problem.subtopic,
        problem.pdfPage,
        problem.printedPage,
        problem.platform,
        problem.url,
        problem.companies.map((company) => company.name).join(' | '),
        problem.unverifiedLogoCount,
        progress?.status ?? 'new',
        progress?.solvedEver ? 'yes' : 'no',
        progress?.firstSolvedOn,
        progress?.lastSolvedOn,
        progress?.attempts.length ?? 0,
        progress ? progress.attempts.reduce((total, attempt) => total + attempt.seconds, 0) : 0,
        progress?.difficulty,
        progress?.timeComplexity,
        progress?.spaceComplexity,
        next ? REVISION_STAGE_LABELS[next.stage.stage - 1] : '',
        next?.dueOn,
        next?.cycle.cycleNumber,
        progress?.notes,
        progress?.mistakes,
        progress?.learnings,
        progress?.starred ? 'yes' : 'no',
        problem.duplicateNumbers.join(' | '),
      ]),
    );
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function buildAttemptsCsv(state: AppState): string {
  const headers = [
    'problem_number',
    'problem_title',
    'outcome',
    'local_date',
    'created_at',
    'started_at',
    'seconds',
    'minutes',
    'note',
  ];
  const rows = [csvRow(headers)];
  const attempts = problems.flatMap((problem) =>
    (state.progress[problem.id]?.attempts ?? []).map((attempt) => ({ problem, attempt })),
  );
  attempts.sort((a, b) => a.attempt.createdAt.localeCompare(b.attempt.createdAt));
  for (const { problem, attempt } of attempts) {
    const created = new Date(attempt.createdAt);
    rows.push(
      csvRow([
        problem.number,
        problem.title,
        attempt.outcome,
        Number.isNaN(created.getTime()) ? '' : toDateKey(created),
        attempt.createdAt,
        attempt.startedAt,
        attempt.seconds,
        Math.round((attempt.seconds / 60) * 100) / 100,
        attempt.note,
      ]),
    );
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function buildReviewsCsv(state: AppState): string {
  const headers = [
    'problem_number',
    'problem_title',
    'cycle',
    'stage',
    'scheduled_due',
    'effective_due',
    'completed_on',
    'status',
    'snooze_count',
  ];
  const rows = [csvRow(headers)];
  for (const problem of problems) {
    const progress = state.progress[problem.id];
    if (!progress) continue;
    for (const cycle of progress.cycles) {
      for (const stage of cycle.stages) {
        rows.push(
          csvRow([
            problem.number,
            problem.title,
            cycle.cycleNumber,
            REVISION_STAGE_LABELS[stage.stage - 1],
            stage.dueOn,
            stage.snoozedTo ?? stage.dueOn,
            stage.completedOn,
            stage.completedOn ? 'completed' : cycle.archivedOn ? 'archived' : 'open',
            stage.snoozeHistory.length,
          ]),
        );
      }
    }
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function downloadProblemsCsv(state: AppState): void {
  downloadFile(`dsa-progress-${todayKey()}.csv`, buildProblemsCsv(state), 'text/csv;charset=utf-8');
}

export function downloadAttemptsCsv(state: AppState): void {
  downloadFile(`dsa-attempts-${todayKey()}.csv`, buildAttemptsCsv(state), 'text/csv;charset=utf-8');
}

export function downloadReviewsCsv(state: AppState): void {
  downloadFile(`dsa-revisions-${todayKey()}.csv`, buildReviewsCsv(state), 'text/csv;charset=utf-8');
}

export function downloadBackup(state: AppState): void {
  downloadFile(backupFilename(), JSON.stringify(createExportBundle(state), null, 2), 'application/json');
}
