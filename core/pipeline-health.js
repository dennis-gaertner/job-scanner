/**
 * Operational status of the resumable scanner controller.
 * SCAN_LOG remains the historical record; Scanner_Cockpit remains the
 * per-source scheduling/configuration surface. This is pipeline state only.
 *
 * No trigger is needed. Updates are invoked by scanner-pipeline.js.
 */
const PIPELINE_HEALTH_SHEET_ = 'Pipeline_Health';
const PIPELINE_HEALTH_COLUMNS_ = [
  'cycle_id', 'started_at', 'updated_at', 'status', 'current_source',
  'phase', 'completed_sources', 'total_sources', 'attempts',
  'failures', 'message', 'finished_at'
];

function scannerPipelineHealthWrite_(state, status, message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PIPELINE_HEALTH_SHEET_);
  if (!sheet) {
    sheet = ss.insertSheet(PIPELINE_HEALTH_SHEET_);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(ss.getNumSheets());
    sheet.getRange(1, 1, 1, PIPELINE_HEALTH_COLUMNS_.length)
      .setValues([PIPELINE_HEALTH_COLUMNS_]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, PIPELINE_HEALTH_COLUMNS_.length).setFontWeight('bold');
  }
  assertSheetHeadersExact_(sheet, PIPELINE_HEALTH_COLUMNS_);
  const last = sheet.getLastRow();
  const source = state.index < state.queue.length ? state.queue[state.index] : '';
  const isFinished = status === 'SUCCESS' || status === 'PARTIAL';
  const row = [
    state.cycleId,
    state.startedAt ? new Date(state.startedAt) : '',
    new Date(),
    status,
    source,
    isFinished ? 'complete' : state.phase,
    state.index,
    state.queue.length,
    state.attempts,
    state.failures.length,
    message || '',
    isFinished ? new Date() : ''
  ];
  // Keep ONE row per cycle; never discard previous cycles.
  let dest = last + 1;
  if (last >= 2 && String(sheet.getRange(last, 1).getValue()) === String(state.cycleId)) {
    dest = last;
  }
  sheet.getRange(dest, 1, 1, row.length).setValues([row]);
  sheet.getRange(dest, 2, 1, 2).setNumberFormat('dd.mm.yyyy hh:mm:ss');
  sheet.getRange(dest, 12).setNumberFormat('dd.mm.yyyy hh:mm:ss');
}

function scannerPipelineHealthBestEffort_(state, status, message) {
  try { scannerPipelineHealthWrite_(state, status, message); }
  catch (e) { Logger.log('Pipeline_Health update failed: ' + String(e)); }
}

/** Read-only controller checkpoint inspector. No scanner calls or triggers. */
function inspectScannerPipelineCheckpoint() {
  const active = scannerPipelineLoad_();
  const last = JSON.parse(scannerPipelineProperties_()
    .getProperty(SCANNER_PIPELINE_LAST_KEY_) || 'null');
  const result = {active, last};
  Logger.log(JSON.stringify(result));
  return result;
}
