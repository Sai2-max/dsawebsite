# DSA Command Center

A local-first study workspace for every numbered row in the **Bosscoder DSA Sheet** PDF. It turns the 211-row sheet into a daily queue, fixed-interval revision system, filterable library, topic/company views, analytics, and portable backups.

Built with React 18, TypeScript, Vite, Tailwind CSS, and `localStorage`. There is no backend, account, paid API, AI key, or subscription.

## Quick start

Requirements: Node.js 20+ (tested with Node 24) and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The app uses `HashRouter`, so deep links look like:

```text
http://localhost:5173/#/library
http://localhost:5173/#/problem/p001
http://localhost:5173/#/today
```

Other commands:

```bash
npm test          # 48 unit tests across 6 files
npm run test:watch
npm run build     # TypeScript build + production bundle
npm run preview   # preview the production build
```

**How to log a session:** Open a problem's detail page, pick one of the three outcomes under "Log a session" — **Solved it**, **Tried, not solved**, or **Needs practice** — then press **Log this session**. Each outcome saves your time and notes to the problem's attempt history; **Solved it** also starts the fixed Day 1 / 3 / 7 / 30 revision cycle. Nothing is ever overwritten or deleted.

## What is included

| Area | What it does |
| --- | --- |
| **Dashboard** | Daily target progress, unique solved count, streak, due/overdue revisions, focus queue, activity heatmap, and topic progress. |
| **Today's Plan** | Overdue revision alerts, reviews due today, new problems in PDF order, and an on-deck preview. |
| **Problem Library** | All 211 source rows with search, topic/company/status/platform filters, sorting, live links, notes, links to details, and the circular solve checkbox. |
| **Revision Calendar** | Month view with scheduled reviews, selected-day details, completion, and explicit snooze controls. |
| **Topics** | All 15 source topics, including the PDF's repeated printed topic numbers, with unique-problem progress. |
| **Companies** | 54 companies and 611 source associations, filterable through problem lists. These are PDF logo associations, not hiring-frequency claims. |
| **Analytics** | Status mix, solved-over-time heatmap, activity, topic performance, personal difficulty, and study time. |
| **Problem Detail** | Guided "log a session" outcome picker (solved / tried-not-solved / needs practice) with plain-English consequences, start reattempt / skip / restore, fixed Day 1/3/7/30 cycle history, attempt history, timer, notes, complexity, mistakes, learnings, difficulty, company chips, and source links. |
| **Settings** | Daily target, theme, week start, display name, JSON backup/restore, three CSV exports, and guarded reset. |
| **Import Report** | Source hash, row counts, duplicate evidence, title corrections, company caveats, link validation, and topic coverage. |

## The TUF-style solve checkbox

The circular checkbox is a two-way completion control. It is available on Library rows, dashboard focus rows, Today problem cards, and the Problem Detail header.

- **Unchecked → checked:** clicking it marks the problem solved, records an attempt, starts a fixed Day 1/3/7/30 cycle from today, captures a running timer if one is active, and shows a toast with the Day 1 date.
- **Checked → unchecked:** clicking it unchecks the box. The problem is no longer counted as solved or counted in unique stats, and its open revision cycle is closed out with the reason "Unchecked solve" so no overdue reminders linger. Nothing is deleted: attempts, solve dates, and past cycles all remain, and a later solve continues from that history.
- **Back on today's plan:** an unchecked row that was introduced today returns to Today's Plan as a card in PDF order, and "Solved today" only counts rows that are currently checked. The daily-target ring shows solved rows, not merely planned ones.
- **Reattempts:** use **Start reattempt** or **Solve again** on Problem Detail. A new solve archives the open cycle and starts a new cycle without removing older attempts or reviews.
- **Accessibility:** the control exposes `role="checkbox"`, `aria-checked`, a descriptive label that reflects the current state, keyboard focus, and a tooltip explaining that history is preserved when unchecking.

## Data provenance

- Source file: `DSA+CHEAT+SHEET-compressed.pdf`, copied to `public/dsa-sheet.pdf`.
- Source SHA-256: `8371c66f6790d0b3aeeb8d8c507ef894623fde060cbf36f48523fb2d8694ab52`.
- Sheet: **Bosscoder DSA Sheet**, PDF content pages 4-40.
- Imported rows: **211 / 211**, numbered contiguously and kept in source order.
- Unique problems: **204** (seven duplicate rows are retained).
- Topics/subtopics: **15 topics** and **33 subtopic names**. The PDF repeats printed topic numbers `07` and `10`; those source numbers remain unchanged.
- Platforms: 204 LeetCode rows and 7 GeeksforGeeks rows.
- Company associations: **611** across **54 companies**, derived only from logos printed on the PDF rows.
- Link verification: **211 / 211** rows verified on 2026-10-27 (197 unique LeetCode slugs through the LeetCode GraphQL endpoint; 7 GeeksforGeeks URLs returned HTTP 200). Each row keeps a search fallback.

### Duplicate groups

The PDF lists these seven pairs twice. Both rows stay in the Library, while unique statistics deduplicate by canonical URL and auto-planning avoids introducing a duplicate twin after the canonical row has been introduced.

| Numbers | Problem |
| --- | --- |
| 6, 186 | Find Greatest Common Divisor of Array |
| 7, 187 | Self Dividing Numbers |
| 15, 23 | Minimum Size Subarray Sum |
| 43, 84 | K Closest Points to Origin |
| 47, 51 | Subarray Sum Equals K |
| 182, 196 | Unique Paths |
| 199, 206 | Factorial Trailing Zeroes |

### Data caveats

- Three logo marks remain unidentified (rows **25**, **120**, **158**; internal mark IDs `1076`, `3554`, `4846`). They are counted as unverified; no company names were guessed.
- `6909` maps to **Myntra** with medium confidence.
- Four truncated or footer-contaminated source titles were expanded while retaining the original PDF text in `sourceTitle`: **#22**, **#145**, **#166**, **#195**.
- Company chips are source associations, not statements that a company currently asks that problem in interviews.

## Planning and revision rules

- Default daily target is **3**; it is configurable in Settings. The target is a floor, not a cap.
- New problems are planned in **PDF source order**. Duplicate twins are skipped by the unique planner.
- Revision dates are fixed from the solve date: **+1, +3, +7, and +30 local calendar days**.
- Completing a review records completion but **does not shift later fixed dates**.
- Overdue reviews remain overdue across reloads. They are not silently moved into today.
- Snoozing is explicit: it changes the effective review date, preserves the original due date, and records a snooze history entry.
- A new solve/reattempt archives the previous open revision cycle and starts a fresh cycle; attempts and old stages remain in history.

## Local persistence and exports

- Storage key: `dsa-command-center:v1`, schema version `1`.
- State saves to the browser on every change. No data leaves the machine at runtime.
- **Download JSON backup** writes a validated, restorable bundle.
- **Progress CSV**, **Attempts CSV**, and **Revisions CSV** export snapshots for spreadsheets.
- Restoring a backup validates the bundle, skips unknown problem IDs, and warns if the dataset hash differs.
- Reset requires typing `RESET`; it clears progress but keeps settings and the import report.

## Verification

- **Unit tests:** `npm test` passes **45 tests in 6 files**, covering dates, revisions, reducer behavior, stats, storage validation, and dataset invariants.
- **Production build:** `npm run build` passes. Vite reports a large-chunk warning (roughly 573 kB) but the build succeeds.
- **Browser acceptance:** all **10 / 10** scenarios passed in a fresh headless Edge profile at 1440 px and 375 px, with **0 console errors**. See [ACCEPTANCE.md](ACCEPTANCE.md) for scenario-level evidence.

Acceptance covered the import report, configurable PDF-order planning, checkbox solve behavior, reattempt history, overdue/snooze persistence, fixed review completion, notes/timer/difficulty persistence, filters and analytics, backup/CSV/restore/reset, and responsive themes plus checkbox accessibility.

At 1440 px all main routes stayed within a 1440 px viewport (`scrollWidth` 1430). At 375 px all main routes stayed within 375 px (`scrollWidth` 375). The light and dark themes both applied and persisted.

## Known limitations

- **Single browser only.** Progress is local to the browser profile. Clearing site data removes it unless a JSON backup was exported; there is no sync or account recovery.
- **No notifications.** Revisions are visible in the app and calendar, but there are no email, push, or OS reminders.
- **Source data is static.** The dataset was imported once from the supplied PDF. Links were verified on 2026-10-27 and can change later.
- **Company logos are incomplete by nature.** Three marks could not be identified and are deliberately not guessed. PDF logos are not evidence of interview frequency.
- **Duplicate rows are intentional.** The Library shows 211 rows; unique solved counts deduplicate canonical URLs, so row-level and unique-problem counts can differ.
- **Fixed revision policy.** Intervals are not configurable, and dates use the local calendar rather than a server timezone.
- **Timer scope.** Focus timers run while the app is open and persist pause state locally; closing the tab does not produce background reminders.
- **No problem runner or AI tutor.** The app links to the original problem pages and stores your planning/notes; it does not execute code or grade solutions.
- **Static hosting uses hash routes.** Deep links include `#/`, which keeps deployment simple without server rewrites.

## Project layout

```text
src/
  components/   UI primitives, charts, timer, problem cards, solve checkbox
  data/         final 211-row dataset and import report
  lib/          dates, revisions, stats, storage, export, dataset selectors
  pages/        dashboard, today, library, calendar, topics, companies,
                analytics, detail, settings, report, not-found
  store/        reducer and localStorage-backed context
public/         PDF source copy
```

The source extraction and link-validation artifacts remain at the repository root (`final_dataset.json`, `import_report.json`, `link_validation.json`, and the extraction scripts) for auditability.
