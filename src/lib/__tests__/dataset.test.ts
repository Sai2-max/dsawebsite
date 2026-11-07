import { describe, expect, it } from 'vitest';
import {
  canonicalProblems,
  companies,
  dataset,
  getProblemByNumber,
  importReport,
  problems,
  topics,
} from '../dataset';

const DUPLICATE_GROUPS = [
  [6, 186],
  [7, 187],
  [15, 23],
  [43, 84],
  [47, 51],
  [182, 196],
  [199, 206],
];

describe('dataset integrity', () => {
  it('imports every numbered PDF row in source order', () => {
    expect(problems).toHaveLength(211);
    expect(problems.map((problem) => problem.number)).toEqual(
      Array.from({ length: 211 }, (_, index) => index + 1),
    );
    expect(problems.every((problem, index) => problem.id === `p${String(index + 1).padStart(3, '0')}`)).toBe(true);
    expect(problems.every((problem) => problem.numberText === String(problem.number).padStart(2, '0'))).toBe(true);
  });

  it('keeps all 15 source topics, including repeated printed numbers', () => {
    expect(topics).toHaveLength(15);
    expect(topics.map((topic) => topic.sourceNumber)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '07', '08', '09', '10', '10', '10', '11', '11',
    ]);
    expect(topics.map((topic) => topic.name)).toEqual([
      'ARRAYS',
      'Binary Search',
      'Sorting',
      'Hashing',
      'Linked Lists',
      'Stack and Queue',
      'Heap',
      'Recursion & Backtracking',
      'Trees',
      'Trees II',
      'GRAPHS',
      'Greedy',
      'Dynamic Programming',
      'MATH',
      'Miscellaneous',
    ]);
    expect(topics.reduce((total, topic) => total + topic.problemCount, 0)).toBe(211);
  });

  it('preserves seven duplicate groups and maps them to one canonical problem', () => {
    expect(Object.keys(importReport.duplicateTitleGroups)).toHaveLength(7);
    expect(Object.keys(importReport.duplicateUrlGroups)).toHaveLength(7);
    expect(importReport.duplicateProblemsPreserved).toBe(true);
    expect(canonicalProblems).toHaveLength(204);

    for (const [first, second] of DUPLICATE_GROUPS) {
      const a = getProblemByNumber(first);
      const b = getProblemByNumber(second);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(a?.canonicalId).toBe(b?.canonicalId);
      expect(a?.duplicateNumbers).toEqual([second]);
      expect(b?.duplicateNumbers).toEqual([first]);
    }

    const canonicalIds = new Set(problems.map((problem) => problem.canonicalId));
    expect(canonicalIds.size).toBe(204);
  });

  it('retains verified practice links for every row with a fallback search', () => {
    expect(importReport.linksPresent).toBe(211);
    expect(importReport.linksVerified).toBe(211);
    expect(importReport.missingLinks).toHaveLength(0);
    expect(importReport.linkFailures).toHaveLength(0);

    for (const problem of problems) {
      expect(problem.linkStatus).toBe('verified');
      expect(problem.url).toMatch(/^https:\/\/(leetcode\.com|www\.geeksforgeeks\.org)\//);
      expect(problem.searchUrl.startsWith('https://www.google.com/search?q=')).toBe(true);
      if (problem.platform === 'LeetCode') expect(problem.url).toContain('leetcode.com/problems/');
      if (problem.platform === 'GeeksforGeeks') expect(problem.url).toContain('geeksforgeeks.org/');
    }
    expect(importReport.platformCounts).toEqual({ LeetCode: 204, GeeksforGeeks: 7 });
  });

  it('keeps company associations source-faithful and discloses unknowns', () => {
    const associations = problems.reduce((total, problem) => total + problem.companies.length, 0);
    expect(associations).toBe(611);
    expect(companies).toHaveLength(54);
    expect(new Set(companies.map((company) => company.name)).size).toBe(54);
    expect(importReport.companyAssociations).toBe(associations);
    expect(importReport.uniqueCompanies).toBe(54);

    const unverified = problems.filter((problem) => problem.unverifiedLogoCount > 0);
    expect(unverified.map((problem) => problem.number)).toEqual([25, 120, 158]);
    expect(unverified.reduce((total, problem) => total + problem.unverifiedLogoCount, 0)).toBe(3);

    const medium = problems.flatMap((problem) =>
      problem.companies.filter((company) => company.confidence === 'medium').map((company) => company.name),
    );
    expect(medium).toHaveLength(2);
    expect(new Set(medium)).toEqual(new Set(['Myntra']));
    expect(importReport.unverifiedLogoRows.map((row) => row.number)).toEqual([25, 120, 158]);
  });

  it('documents the four title expansions and keeps the source text', () => {
    expect(importReport.titleCorrections).toHaveLength(4);
    for (const correction of importReport.titleCorrections) {
      const problem = getProblemByNumber(correction.number);
      expect(problem?.title).toBe(correction.title);
      expect(problem?.sourceTitle).toBe(correction.sourceTitle);
      expect(problem?.titleCorrected).toBe(true);
    }
    expect(problems.filter((problem) => problem.titleCorrected)).toHaveLength(4);
  });

  it('records the exact source hash and content page range', () => {
    expect(dataset.meta.sourceSha256).toBe(
      '8371c66f6790d0b3aeeb8d8c507ef894623fde060cbf36f48523fb2d8694ab52',
    );
    expect(dataset.meta.totalProblems).toBe(211);
    expect(dataset.meta.uniqueProblems).toBe(204);
    expect(dataset.meta.topicCount).toBe(15);
    expect(dataset.meta.pdfContentPages).toEqual([4, 40]);
  });
});
