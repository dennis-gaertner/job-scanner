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
| `core/scan-stats.js` | Shared scanner row counts, storage totals and category counts |
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


## Second refactor pass — 2026-09-11

Consolidated repeated bookkeeping in 19 scanner functions into `buildScanStats_()` in `core/scan-stats.js`. Each scanner supplies its rows, upsert result and category index; the helper returns seven shared numeric result fields. Source-specific metadata, optional fields, detail-fetch counters, status, messages and logging remain in each scanner. This includes production, test-sink and legacy scanner functions, without changing which ones run.

Category counts still describe the input rows, including duplicates. Storage totals still come from the existing upsert implementation. Empty/unknown categories remain uncounted; category matching remains case- and whitespace-sensitive. The helper runs after upsert, as the previous blocks did. No new defaults or extra fields are added to scanner results. Early returns remain unchanged.

Validation: 313 existing functions unchanged; fetching, parsing, normalisation and storage prefixes and trailing logging of the 19 changed functions unchanged; 152 complete scanner-result comparisons passed across eight fixtures per function. Checks include duplicate input versus stored totals, empty input, missing and unrecognised categories, updates and absent totals. This verifies the result-building sections using fixture inputs, not live endpoint responses. Configuration, deployment files and non-scanner JavaScript remain unchanged.

Use `tests/verify-scan-stats.cjs` for this pass. The older `verify-refactor.cjs` is specific to the first structural pass and intentionally requires identical function bodies; it is not the test for this second pass.

### Install this pass

Before copying the new files, from your clean, merged `main` checkout:

```powershell
git archive --format=zip --output=../job-scanner-structure-baseline.zip HEAD
Expand-Archive ../job-scanner-structure-baseline.zip ../job-scanner-structure-baseline -Force
git switch -c refactor/scan-stats
```

Extract the new package outside the repository and merge its `job-scanner` contents into the checkout, replacing files. Then run:

```powershell
node tests/verify-scan-stats.cjs ../job-scanner-structure-baseline .
git diff --stat
git status
```

After review, upload using the existing clasp workflow and observe a normal scan, including Scan_Log/source health and notification results. The full scan retains its email and archive side effects. Commit and push the branch after validation. This pass has not been uploaded to Apps Script or run against live sources here.


## Third refactor pass — 2026-09-12

Production `upsertJobsToAll_()` and test `upsertRowsToSheetByName_()` now delegate to `upsertJobRows_()` in `core/upsert.js`. The wrappers retain their destination lookup and missing-sheet errors. A test-only flag preserves the existing empty-URL warning after updating a row. Destination lookup is deferred until after deduplication and the empty-input return.

The shared implementation preserves merge precedence, input-row mutation, duplicate handling, row-write order, append batching, return statistics and failure propagation. Existing timestamps, notification and archive fields retain the same rules. This pass does not batch existing-row updates or change header handling. Those would change behaviour and are separate work. No intake sheet or scheduling changes are introduced; the shared storage function provides a clearer boundary for that later architecture.

Validation: 42 complete entry-point comparisons (21 scenarios for each production/test path), checking final rows, input mutation, spreadsheet call/write order, warnings, totals, repeated execution and errors. Fixtures include empty input, mixed updates/inserts, duplicate input and stored keys, blank fields, missing/reordered headers, missing destination and injected open/write failures. All 331 other existing functions are unchanged. Google services are mocked; live validation remains necessary. Text comparison normalises CRLF/LF.

### Install this pass

From the clean checkout containing the merged scanner-statistics refactor, before copying files:

```powershell
git archive --format=zip --output=../job-scanner-upsert-baseline.zip HEAD
Expand-Archive ../job-scanner-upsert-baseline.zip ../job-scanner-upsert-baseline -Force
git switch -c refactor/shared-upsert
```

Extract the package outside the repository and merge its `job-scanner` contents into the checkout, replacing files. Then run:

```powershell
node tests/verify-upsert.cjs ../job-scanner-upsert-baseline .
git --no-pager diff --stat
git status
```

The previous two verifiers apply to their respective earlier refactor passes; use `verify-upsert.cjs` for this pass. After review, use the existing clasp upload workflow and validate a production scan and the test-sink workflow as appropriate. The production scan still sends notifications and may archive jobs. Commit and merge after validation.
