/*
========================================================
JOB SCANNER SYSTEM — ARCHITECTURE OVERVIEW
========================================================

Purpose
-------
Automatisch Jobs aus mehreren Quellen sammeln, bewerten,
deduplizieren und interessante Jobs per Mail melden.

Die zentrale Datenbasis ist das Sheet:

  Jobs_All

Alle anderen Sheets sind nur Views oder Logs.

--------------------------------------------------------
SYSTEM FLOW
--------------------------------------------------------

scanAllJobSources()
        ↓
source scanners
(Bund, Airbus, SBB, LH, DB, etc.)
        ↓
normalizeJobRecord_()
        ↓
scoreJobBySource_()
        ↓
buildUniqueKey_()
        ↓
upsertJobsToAll_()
        ↓
Jobs_All (source of truth)
        ↓
buildRelevantViewAll()
        ↓
Relevant_All (filtered view)
        ↓
emailNewRelevantJobs()
        ↓
Mail + notified_at update
        ↓
Notified_All
        ↓
appendScanLogRow_()
        ↓
Scan_Log


--------------------------------------------------------
SHEET ROLES
--------------------------------------------------------

Jobs_All
--------
Zentrale Wahrheit für alle Jobs.

Enthält:
- Jobdaten
- Score
- Kategorie
- unique_key
- notified_at
- run_id

Alle Scanner schreiben nur hier hinein.


Relevant_All
------------
Gefilterte Ansicht von Jobs_All.

Enthält nur:

- Relevant
- Vielleicht (wenn nicht zu alt)
- keine abgelaufenen Deadlines

Sortiert nach:
1. Score
2. Maildatum


Notified_All
------------
Historie der versendeten Jobmeldungen.

Primäre Versandmarkierung bleibt:

  Jobs_All.notified_at


Scan_Log
--------
Monitoring der Scannerläufe.

Pro Quelle werden geloggt:

- items_seen
- jobs_parsed
- rows_input_to_upsert
- new_jobs
- updated_jobs
- relevant_count
- maybe_count
- ignore_count
- detail_fetch_count
- duration_ms


--------------------------------------------------------
CORE FUNCTIONS
--------------------------------------------------------

scanAllJobSources()

Orchestriert einen kompletten Scanlauf.

1. alle Scanner aufrufen
2. Relevant_All bauen
3. Mail verschicken
4. Logs schreiben


normalizeJobRecord_(job)

Normalisiert einen Jobdatensatz und führt Scoring aus.


buildUniqueKey_(...)

Erzeugt den dedupe-key eines Jobs.

Sichert:
Ein Job existiert nur einmal in Jobs_All.


upsertJobsToAll_(rows)

Schreibt Jobs in Jobs_All:

existing unique_key → update
neuer unique_key → append


buildRelevantViewAll()

Baut das Sheet Relevant_All aus Jobs_All.


emailNewRelevantJobs(runId)

Versendet Mail für:

- Relevant
- Vielleicht

nur wenn:

notified_at leer ist.


stampNotifiedAtInJobsAll_()

Markiert versendete Jobs.


appendScanLogRow_()

Schreibt Laufstatistik in Scan_Log.


--------------------------------------------------------
IMPORTANT INVARIANTS
--------------------------------------------------------

1) Jeder Job existiert nur einmal in Jobs_All
   → buildUniqueKey_()

2) Jeder Job wird nur einmal gemeldet
   → notified_at

3) Relevant_All ist nur eine View
   → keine eigene Logik

4) Scan_Log beschreibt Runs
   → nicht einzelne Testläufe


--------------------------------------------------------
DEBUGGING GUIDE
--------------------------------------------------------

Problem: doppelte Jobs
→ buildUniqueKey_()

Problem: Mail doppelt
→ notified_at prüfen

Problem: Relevant_All leer
→ buildRelevantViewAll()

Problem: Quelle liefert nichts
→ Scan_Log prüfen:
  items_seen
  jobs_parsed

Problem: Scanner langsam
→ duration_ms im Scan_Log prüfen


--------------------------------------------------------
SAFE CHANGE ORDER
--------------------------------------------------------

Bei Änderungen:

1. Scanner testen
2. Jobs_All prüfen
3. Relevant_All prüfen
4. Mail testen
5. Scan_Log kontrollieren


========================================================
*/