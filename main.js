// main.js — extracted without changing function implementations.

// Log
//
// 16.3.2026
// -new_flag jetzt Formelspalte
// -sortJobsAllForCockpit_() gehärtet
// -applyCockpitFieldsToRow_() schreibt kein new_flag

//
// 28.3.2026
// - new functions for scoring diagnostics. see section "SCORING DIAGNOSTICS"






// *****************************************
// 2. ÖFFENTLICHE EINSTIEGSPUNKTE
// *****************************************





function setupJobSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheetWithHeaders_(ss, CONFIG.sheets.jobsAll, JOBS_ALL_COLUMNS);
  ensureSheetWithHeaders_(ss, CONFIG.sheets.notifiedAll, NOTIFIED_COLUMNS);
  ensureSheetWithHeaders_(ss, CONFIG.sheets.scanLog, SCAN_LOG_COLUMNS);

  ensureSheetWithHeaders_(ss, CONFIG.sheets.jobsUser, JOBS_USER_COLUMNS);
  ensureSheetWithHeaders_(ss, CONFIG.sheets.jobsCockpit, JOBS_COCKPIT_COLUMNS);
  ensureSheetWithHeaders_(ss, CONFIG.sheets.scoringCockpit, SCORING_COCKPIT_COLUMNS);
}


function validateCoreSheetSchemas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const notifiedSheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);

  if (jobsSheet) assertSheetHeadersExact_(jobsSheet, JOBS_ALL_COLUMNS);
  if (notifiedSheet) assertSheetHeadersExact_(notifiedSheet, NOTIFIED_COLUMNS);

  if (CONFIG.sheets.scanLog) {
    const scanLogSheet = ss.getSheetByName(CONFIG.sheets.scanLog);
    if (scanLogSheet) assertSheetHeadersExact_(scanLogSheet, SCAN_LOG_COLUMNS);
  }
}






