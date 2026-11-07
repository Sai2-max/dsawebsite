export type Platform = 'LeetCode' | 'GeeksforGeeks';

export type CompanyConfidence = 'high' | 'medium';

export interface CompanyRef {
  name: string;
  confidence: CompanyConfidence;
}

export interface Problem {
  id: string;
  number: number;
  numberText: string;
  title: string;
  sourceTitle: string;
  titleCorrected: boolean;
  topicId: string;
  topic: string;
  topicSourceNumber: string;
  topicOrder: number;
  subtopic: string;
  pdfPage: number;
  printedPage: number;
  platform: Platform;
  url: string;
  canonicalId: string;
  canonicalNumber: number;
  duplicateNumbers: number[];
  linkStatus: 'verified';
  linkCheckedAt: string;
  searchUrl: string;
  companies: CompanyRef[];
  unverifiedLogoCount: number;
  duplicateTitleNumbers: number[];
  duplicateUrlNumbers: number[];
}

export interface Topic {
  id: string;
  sourceNumber: string;
  name: string;
  order: number;
  pdfPage: number;
  problemCount: number;
}

export interface DatasetMeta {
  sourceFile: string;
  sourceSha256: string;
  sheetTitle: string;
  totalProblems: number;
  uniqueProblems: number;
  topicCount: number;
  pdfContentPages: [number, number];
  importedAt: string;
  linksVerifiedAt: string;
  linkVerification: string;
  duplicateTitleGroups: number;
  duplicateUrlGroups: number;
}

export interface Dataset {
  meta: DatasetMeta;
  topics: Topic[];
  problems: Problem[];
}

export interface ImportReport {
  expectedProblems: number;
  importedProblems: number;
  uniqueProblems: number;
  numbersContiguous: boolean;
  topicsImported: number;
  platformCounts: Record<Platform, number>;
  linksPresent: number;
  missingLinks: string[];
  linksVerified: number;
  linkFailures: string[];
  titleCorrections: Array<{ number: number; sourceTitle: string; title: string }>;
  unverifiedLogoRows: Array<{ number: number; title: string; logoCount: number }>;
  companyAssociations: number;
  uniqueCompanies: number;
  duplicateTitleGroups: Record<string, number[]>;
  duplicateUrlGroups: Record<string, number[]>;
  duplicateProblemsPreserved: boolean;
  notes: string[];
}

export type ProgressStatus = 'new' | 'attempted' | 'solved' | 'needs_practice' | 'skipped';

export type AttemptOutcome = 'attempted' | 'solved' | 'needs_practice';

export interface Attempt {
  id: string;
  createdAt: string;
  startedAt?: string;
  seconds: number;
  outcome: AttemptOutcome;
  note?: string;
}

export interface SnoozeRecord {
  from: string;
  to: string;
  at: string;
}

export interface ReviewStage {
  stage: 1 | 2 | 3 | 4;
  intervalDays: 1 | 3 | 7 | 30;
  dueOn: string;
  completedOn?: string;
  snoozedTo?: string;
  snoozeHistory: SnoozeRecord[];
}

export interface ReviewCycle {
  id: string;
  cycleNumber: number;
  startedOn: string;
  stages: ReviewStage[];
  completedOn?: string;
  archivedOn?: string;
  archivedReason?: string;
}

export interface ProblemProgress {
  problemId: string;
  status: ProgressStatus;
  solvedEver: boolean;
  firstSolvedOn?: string;
  lastSolvedOn?: string;
  skippedOn?: string;
  attempts: Attempt[];
  cycles: ReviewCycle[];
  notes: string;
  timeComplexity: string;
  spaceComplexity: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  mistakes: string;
  learnings: string;
  starred: boolean;
  lastActivityAt?: string;
}

export interface ActiveTimer {
  problemId: string;
  running: boolean;
  startedAt?: string;
  accumulatedSeconds: number;
}

export type ActivityEventType =
  | 'attempt'
  | 'solve'
  | 'needs_practice'
  | 'uncheck'
  | 'skip'
  | 'restore'
  | 'review'
  | 'snooze'
  | 'note'
  | 'star'
  | 'import'
  | 'reset';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  problemId?: string;
  date: string;
  at: string;
  minutes?: number;
  detail?: string;
}

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Settings {
  dailyTarget: number;
  theme: ThemePreference;
  weekStartsOn: 0 | 1;
  studyName: string;
}

export interface AppState {
  schemaVersion: 1;
  settings: Settings;
  progress: Record<string, ProblemProgress>;
  timer: ActiveTimer | null;
  events: ActivityEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportBundle {
  app: 'DSA Command Center';
  exportVersion: 1;
  exportedAt: string;
  dataset: {
    sourceSha256: string;
    totalProblems: number;
    importedAt: string;
  };
  state: AppState;
}

export interface ImportSummary {
  problemsTouched: number;
  attempts: number;
  reviewsCompleted: number;
  events: number;
  unknownProblems: string[];
  datasetMismatch: boolean;
  exportedAt?: string;
}

export type RevisionUrgency = 'overdue' | 'today' | 'upcoming' | 'complete';

export interface DueReview {
  problemId: string;
  cycle: ReviewCycle;
  stage: ReviewStage;
  dueOn: string;
  overdueDays: number;
  urgency: RevisionUrgency;
}
