# Job Scanner

Google Apps Script project, maintained locally with clasp. Collects job advertisements from mail and web/API sources, scores and deduplicates them, stores user feedback separately, and builds spreadsheet cockpits and email/PDF notifications.

## Data and execution

`scanAllJobSources()` sets up sheets, refreshes the learning cache, runs 15 scanner calls with per-source error logging, sends notifications, formats scores, builds both cockpits, optionally archives candidates, and refreshes source health. Individual scanner failures are caught; some later system steps propagate errors. This behaviour is preserved.

Scanners parse source-specific data, call `normalizeJobRecord_()` (scoring, identity, row conversion), then `upsertJobsToAll_()`.

- `Jobs_All`: collected job records, automatic scores, identity and notification/history fields.
- `Jobs_User`: user edits keyed by job identity; these are persistent data, not a generated view.
- `Jobs_Cockpit` and `Scoring_Cockpit`: generated views with editable fields handled by `onEdit(e)`.
- `Notified_All`: notification history.
- `Scan_Log`: run statistics and errors; source-health view is derived from these logs.
- External archive: archived job and user records, managed by `archive.js`.

`buildDerivedJobViews_()` combines master and user records. Both the job cockpit and notifications consume this shared view. Notification selection requires final category Relevant/Vielleicht, no notification timestamp, visibility other than hidden, and job state other than closed. Additional notification processing remains in `notifications/email.js`.

## File map

| Location | Responsibility |
| --- | --- |
| `main.js` | Sheet setup and schema validation entry points |
| `config.js` | Settings, source configuration and scoring rules |
| `core/schemas.js`, `core/state.js` | Column definitions, execution state and archive switch |
| `core/job-model.js`, `core/job-identity.js`, `core/job-store.js` | Job object construction, stable identity, normalisation and storage |
| `core/derived-jobs.js` | Master/user join and final derived job values |
| Other `core/` files | Shared sheet, text, date, settings, fetch/mail and logging helpers |
| `scanners/scanners-main.js` | Full scan orchestration |
| Source files under `scanners/` | Source-specific collection and parsing |
| `scanners/Workday.js` | Workday parsing and related extraction helpers |
| `scoring/scoring-main.js` | Scoring implementation |
| `scoring/learning.js` | Feedback-derived learning cache and adjustments |
| `scoring/rescore-store.js` | Rescoring stored jobs and test sheets |
| `scoring/diagnostics.js` | Scoring audits and threshold analysis |
| `views/` | Cockpit construction, formatting, flags and source health |
| `notifications/` | Email selection/rendering, PDF creation and notification history |
| `archive.js`, `admin.js` | Archive operations, maintenance and historical repairs |
| `debug.js`, `test_sink.js` | Diagnostics and separate test-sheet workflows |
| `tests/verify-refactor.cjs` | Local comparison against the original source tree |

Files retain global function names. This pass adds no imports, namespaces or build process. Some source-specific diagnostic functions remain next to their parsers. Admin and archive repairs remain intact pending a separate review.

## Common entry points

- `scanAllJobSources()`: full production workflow, including email and optional archiving.
- `buildJobsCockpit()`, `buildScoringCockpit()`, `buildSourceHealthView()`: rebuild individual views.
- `validateCoreSheetSchemas()`: check core sheet headers.
- `onEdit(e)`: persist supported single-cell cockpit edits to Jobs_User.
- `rescoreAllSources()`: rescore production records.
- `runTestSinkScanners()`: run the configured test-sink sources.
- `rescoreAllTestSheets(sourceInput)`: rescore test stores.

## First refactor pass — 2026-09-10

Split mixed files by responsibility and moved schemas/state out of config. Consolidated duplicate declarations of `extractLhJobIdFromUrl_`, `normalizeAuditToken_`, and `rescoreAllTestSheets`. The retained LH implementation was the later declaration in its original file. The other duplicate implementations were identical.

All 332 effective function implementations match the baseline after normalising line endings. Configuration/schema comparison and 24 behaviour comparison cases passed. The harness uses local stubs for Session and hashing; it does not access Google services. It is a structural/baseline regression check, not a live integration test.

No scoring weights, source selection, column schemas, trigger function names, row-write behaviour, archive policies or notification policies were intentionally changed. Existing per-row writes and duplicated test/production storage are deferred to the next pass.

## Install and validate

Baseline Git commit: `7e07dfa` (user-confirmed). The supplied ZIP was the source used for this refactor.

1. In the local checkout, create a branch: `git switch -c refactor/structure`.
2. Copy the contents of the ZIP's `job-scanner` folder into the existing checkout, merging directories and replacing existing files. All original paths are retained, including a README.js pointer. Keep any backup copies outside the checkout to avoid clasp uploading duplicate functions.
3. Review `git diff --stat` and `git status`. The ZIP preserves the supplied clasp settings and Apps Script manifest.
4. Optional local verification (Node.js required): extract `git archive 7e07dfa` outside this checkout and run `node tests/verify-refactor.cjs PATH_TO_BASELINE .`.
5. Use your existing `clasp push` workflow. The supplied .claspignore includes nested JavaScript files and excludes Markdown and the .cjs test harness.
6. In Apps Script, run `validateCoreSheetSchemas()`, then rebuild the job cockpit, scoring cockpit and source health. Check formatting, rankings and persistence of a reversible cockpit edit.
7. Observe the next normal scheduled scan and notification cycle; a manual full scan also sends email and may archive jobs under the existing settings.
8. Commit the refactor after review. Live Apps Script, Gmail, Sheets and source endpoints were not executed during this refactor.
