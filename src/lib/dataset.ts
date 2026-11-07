import rawDataset from '../data/problems.json';
import rawImportReport from '../data/importReport.json';
import type { CompanyRef, Dataset, ImportReport, Problem, Topic } from '../types';
import { byNumber, unique } from './utils';

export const dataset = rawDataset as unknown as Dataset;
export const importReport = rawImportReport as unknown as ImportReport;

export const problems: Problem[] = [...dataset.problems].sort(byNumber);
export const topics: Topic[] = [...dataset.topics].sort((a, b) => a.order - b.order);

const problemById = new Map(problems.map((problem) => [problem.id, problem]));
const problemByNumber = new Map(problems.map((problem) => [problem.number, problem]));
const topicById = new Map(topics.map((topic) => [topic.id, topic]));

export function getProblem(id: string): Problem | undefined {
  return problemById.get(id);
}

export function getProblemByNumber(number: number): Problem | undefined {
  return problemByNumber.get(number);
}

export function getProblemOrThrow(id: string): Problem {
  const problem = problemById.get(id);
  if (!problem) throw new Error(`Unknown problem: ${id}`);
  return problem;
}

export function getTopic(id: string): Topic | undefined {
  return topicById.get(id);
}

export function getTopicName(id: string): string {
  return topicById.get(id)?.name ?? 'Unknown topic';
}

export const subtopics = unique(problems.map((problem) => problem.subtopic)).sort((a, b) =>
  a.localeCompare(b),
);

export interface CompanySummary {
  name: string;
  problemCount: number;
  uniqueProblemCount: number;
  highConfidenceCount: number;
  problems: Problem[];
}

export const companies: CompanySummary[] = (() => {
  const map = new Map<string, { problems: Problem[]; highConfidence: number }>();
  for (const problem of problems) {
    for (const company of problem.companies) {
      const entry = map.get(company.name) ?? { problems: [], highConfidence: 0 };
      entry.problems.push(problem);
      if (company.confidence === 'high') entry.highConfidence += 1;
      map.set(company.name, entry);
    }
  }
  return [...map.entries()]
    .map(([name, entry]) => ({
      name,
      problemCount: entry.problems.length,
      uniqueProblemCount: new Set(entry.problems.map((problem) => problem.canonicalId)).size,
      highConfidenceCount: entry.highConfidence,
      problems: entry.problems.sort(byNumber),
    }))
    .sort((a, b) => b.problemCount - a.problemCount || a.name.localeCompare(b.name));
})();

export function getCompany(name: string): CompanySummary | undefined {
  return companies.find((company) => company.name === name);
}

export const canonicalProblems: Problem[] = (() => {
  const map = new Map<string, Problem>();
  for (const problem of problems) {
    if (!map.has(problem.canonicalId)) map.set(problem.canonicalId, problem);
  }
  return [...map.values()].sort(byNumber);
})();

export const uniqueProblemCount = canonicalProblems.length;

export function companiesForTopic(topicId: string): CompanySummary[] {
  const names = new Set<string>();
  for (const problem of problems) {
    if (problem.topicId === topicId) {
      for (const company of problem.companies) names.add(company.name);
    }
  }
  return companies.filter((company) => names.has(company.name));
}

export function companyConfidenceForProblem(problem: Problem, name: string): CompanyRef['confidence'] | undefined {
  return problem.companies.find((company) => company.name === name)?.confidence;
}

export const topicProblems: Record<string, Problem[]> = Object.fromEntries(
  topics.map((topic) => [topic.id, problems.filter((problem) => problem.topicId === topic.id)]),
);

export const duplicates = problems.filter((problem) => problem.duplicateNumbers.length > 0);
