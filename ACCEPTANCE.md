# Acceptance Verification

**Run date:** 2026-10-27  
**Environment:** Windows, Node.js 24, headless Microsoft Edge, Vite dev server at `http://127.0.0.1:5173`  
**Viewports:** 1440 x 1000 desktop, 375 x 812 mobile  
**Profile:** fresh temporary browser profile; localStorage reset/seeded per scenario  
**Result:** **10 / 10 scenarios passed**, all recorded assertions true, **0 browser console errors**

The browser checks used real UI controls (checkbox clicks, buttons, select inputs, date pickers, file input, and downloads) against the running app. A separate unit suite covers the underlying date, revision, stats, storage, and dataset rules.

## Summary

| # | Scenario | Result | Main evidence |
| --- | --- | --- | --- |
| 1 | Import all 211 PDF rows with source evidence | PASS | 211/211 rows, 204 unique, 211/211 links, 611 associations, 7 duplicate groups, 4 expanded titles, 3 unidentified marks |
| 2 | Daily target and PDF-order planning | PASS | Default 3 -> 3 cards; target 5 -> 5 cards; target back to 3 -> 3 cards; first cards #1-#5 in PDF order |
| 3 | TUF-style checkbox solve and revision cycle | PASS | One solved attempt, Day 1/3/7/30 dates, checked state persisted; clicking again unchecked it while preserving the attempt and archiving the cycle |
| 4 | Reattempt preserves history | PASS | 2 attempts, 2 cycles, old cycle archived, new cycle open, first/last solve dates intact |
| 5 | Overdue review and explicit snooze | PASS | Overdue due date survived reload; snooze moved effective date; original date and history preserved |
| 6 | Complete review without shifting later dates | PASS | Day 1 completed today; Day 3 due date stayed 2026-10-30 before and after completion |
| 7 | Notes, complexity, mistakes, learnings, difficulty, timer | PASS | Guided "Log a session" outcome picker (solved / tried-not-solved / needs practice) with plain-English consequences; all fields persisted after reload; timer accumulated time and was cleared |
| 8 | Search, filters and analytics pages | PASS | Two Sum search = 2 rows; solved filter = 1 row; Google filter returned a 30-row first page; all insight pages rendered |
| 9 | Backup, CSV, guarded reset and restore | PASS | Valid JSON bundle, 211 data rows in CSV + header, reset blocked until `RESET`, empty state restored from backup |
| 10 | Theme, responsive layout and checkbox accessibility | PASS | Light/dark applied; all 10 mobile routes had no horizontal overflow; two-way checkbox role/label/state exposed and uncheck flow verified |

## Scenario detail

### 1. Import completeness and evidence

Opened `/#/report` and checked the rendered import report.

- **211 / 211** numbered rows imported.
- **204** unique problems; **7** duplicate groups preserved.
- **211 / 211** links verified.
- **611** company associations across **54** companies.
- **4** expanded titles and **3** unverified logo marks disclosed.
- Source SHA-256: `8371c66f6790d0b3aeeb8d8c507ef894623fde060cbf36f48523fb2d8694ab52`.

### 2. Daily target and PDF-order planning

Started from a fresh state on Today's Plan.

- Default target **3**: cards for #1 Richest Customer Wealth, #2 Two Sum, #3 Count Negative Numbers in a Sorted Matrix.
- Changed target to **5** in Settings: the plan added #4 Next Permutation and #5 Median of Two Sorted Arrays, in source order.
- Changed target back to **3**: the plan returned to three cards.
- `settings.dailyTarget` persisted as 5 immediately after the Settings change.
- Duplicate-twin skipping is also covered by the unit test `puts untouched unique problems in PDF order and never repeats a canonical twin`.

### 3. Checkbox solve and revision cycle

Clicked the unchecked circle for **Richest Customer Wealth** on Today's Plan.

- Checkbox label before click: `Mark Richest customer wealth as solved`; `aria-checked="false"`.
- Toast: `Solved. Day 1 review scheduled for 28 Oct.`
- Stored progress: status `solved`, `solvedEver: true`, **1** attempt, first/last solved date `2026-10-27`.
- Revision stage due dates: **2026-10-28**, **2026-10-30**, **2026-11-03**, **2026-11-26** (1/3/7/30 days).
- Searching the Library for the problem showed the checked state, a solved badge, and one row.
- Clicking the checked circle again **unchecked** it: toast `Unchecked. Attempt history is preserved.`
  - `solvedEver` became `false`; status derived from the last attempt (`attempted`).
  - The attempt and first/last solve dates stayed intact; the open cycle was archived with reason `Unchecked solve`.
  - A new `uncheck` entry appeared in the activity feed.
  - **Today's Plan:** the unchecked row returned as card #1 in the PDF-order cards; "Solved today" dropped to `0`; it did not appear duplicated in "In progress."

### 4. Reattempt preserves history

On the Problem Detail page, clicked **Solve again**.

- Attempt outcomes: `solved`, `solved`.
- Two cycles existed.
- Cycle 1: archived on `2026-10-27`, reason `New solve cycle started`, all four stage dates retained.
- Cycle 2: open, with a fresh set of Day 1/3/7/30 dates.
- `firstSolvedOn` and `lastSolvedOn` both remained `2026-10-27`.
- No prior attempt or review was deleted.

### 5. Overdue stays overdue; snooze is explicit

Seeded the current cycle's Day 1 due date to `2026-10-25` (two days overdue).

- Today's Plan showed the overdue alert before reload.
- The overdue alert and due card were still present after a full page reload.
- Clicked **Snooze** and selected `2026-10-28`.
- Stored stage after snooze: original `dueOn = 2026-10-25`, `snoozedTo = 2026-10-28`.
- Snooze history: `from: 2026-10-25`, `to: 2026-10-28`, with timestamp.
- The original fixed schedule was not rewritten.

### 6. Completing a review leaves later dates fixed

Seeded Day 1 to be due today (`2026-10-27`), then clicked **Mark reviewed**.

- Day 1 `completedOn`: `2026-10-27`.
- Day 3 due date before completion: `2026-10-30`.
- Day 3 due date after completion: `2026-10-30` (unchanged).
- Day 3 remained open; one review event was recorded.

### 7. Notes, complexity, mistakes, learnings, difficulty and timer

On the Problem Detail page:

- Saved notes: `Use a single pass and track the invariant.`
- Saved time complexity: `O(n)`; space complexity: `O(1)`.
- Saved a mistake and a learning.
- Set personal difficulty to **4 / Hard**.
- Started and paused the timer after about 1.4 seconds; it accumulated at least one second.
- Discarded the timer.
- Reloaded the page and confirmed every text field, difficulty, and cleared timer state persisted.
- Clicked **Solved it** then **Log this session**: one `solve` event recorded, Day 1 / 3 / 7 / 30 cycle created, and "Solved today" incremented on Today's Plan.
- Clicked **Tried, not solved** then **Log this session**: one `attempt` event recorded, row stayed on Today's Plan cards in PDF order.
- Clicked **Needs practice** then **Log this session**: one `needs_practice` event recorded, row appeared in the practice queue.

### 8. Search, filters and insights

On the Library page:

- Search `Two Sum` returned **2** matching rows: #2 Two Sum and #28 Two Sum II.
- Status filter **Solved ever** returned **1** row.
- Company filter **Google** returned a filtered first page of **30** rows.
- Visited **Topics**, **Companies**, and **Analytics**; all pages rendered their headings and populated content.

### 9. Backup, CSV, reset and restore

On Settings:

- **Download JSON backup** produced a bundle with app `DSA Command Center`, export version `1`, **1** progress record, and **1** solved problem.
- **Progress CSV** contained **212 lines**: one header plus all 211 problem rows.
- **Attempts CSV** and **Revisions CSV** downloaded with their expected headers.
- **Reset local progress** opened a guarded dialog; the reset button was disabled before typing `RESET` and enabled afterward.
- After reset: **0** progress records; settings kept (`dailyTarget = 3`, `theme = dark`).
- Selected the downloaded backup; the restore dialog showed the candidate; clicking **Replace local progress** restored **1** progress record and **1** solved problem.

### 10. Theme, responsiveness and checkbox accessibility

- Clicked **Light** in Settings; `document.documentElement.dataset.theme` became `light`.
- Clicked **Dark**; the theme returned to `dark`.
- At 375 px, every main route had `scrollWidth === innerWidth === 375`:

| Route | scrollWidth / width |
| --- | --- |
| Dashboard | 375 / 375 |
| Today's Plan | 375 / 375 |
| Problem Library | 375 / 375 |
| Problem Detail | 375 / 375 |
| Revision Calendar | 375 / 375 |
| Topics | 375 / 375 |
| Companies | 375 / 375 |
| Analytics | 375 / 375 |
| Settings | 375 / 375 |
| Import Report | 375 / 375 |

- The first checkbox exposed `role="checkbox"`, a state-aware descriptive `aria-label`, `aria-checked`, an explanatory `title`, and keyboard focus styling.
- Desktop routes stayed within the 1440 px viewport (`scrollWidth` 1430).

## Reproducible checks

```bash
npm test
npm run build
```

The unit suite passes **48 tests in 6 files** (including reversible-checkbox and today-plan-rollback tests). The production build succeeds with a Vite large-chunk warning; the warning does not block the build.

The detailed browser acceptance harness was run from a temporary test directory with a fresh headless Edge profile. Its machine-specific output is not committed; the scenario evidence above is the reviewed result of that run.
