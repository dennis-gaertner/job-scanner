// core/scan-log.js — extracted without changing function implementations.

function appendScanLogRow_(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.scanLog);
  if (!sheet) return;

  const row = [[
    entry.run_at || new Date(),
    entry.run_id || '',
    entry.source || '',
    entry.mode || '',
    entry.label_or_endpoint || '',
    entry.mail_threads || 0,
    entry.mail_messages || 0,
    entry.items_seen || 0,
    entry.jobs_parsed || 0,
    entry.rows_input_to_upsert || 0,
    entry.jobs_upserted || 0,
    entry.new_jobs || 0,
    entry.updated_jobs || 0,
    entry.relevant_count || 0,
    entry.maybe_count || 0,
    entry.ignore_count || 0,
    entry.detail_fetch_attempted || 0,
    entry.detail_fetch_count || 0,
    entry.duration_ms || 0,
    entry.status || 'ok',
    entry.message || ''
  ]];

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row[0].length).setValues(row);
}








// *****************************************
// 5. LEARNING
// *****************************************


