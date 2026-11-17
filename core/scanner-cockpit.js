/** Scanner scheduler settings and live status. No separate updating trigger. */
const SCANNER_COCKPIT_SHEET_ = 'Scanner_Cockpit';
const SCANNER_COCKPIT_HEADERS_ = [
  'source', 'enabled', 'frequency_days', 'next_due',
  'last_stage_attempt', 'last_stage_success', 'stage_status',
  'last_import_success', 'import_status', 'attempts',
  'items_seen', 'jobs_parsed', 'new_jobs', 'stage_duration_s',
  'import_duration_s', 'message'
];
function scannerCockpitSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCANNER_COCKPIT_SHEET_);
  if (!sheet) {
    sheet = ss.insertSheet(SCANNER_COCKPIT_SHEET_);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(ss.getNumSheets());
    sheet.getRange(1, 1, 1, SCANNER_COCKPIT_HEADERS_.length).setValues([SCANNER_COCKPIT_HEADERS_]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:P1').setFontWeight('bold');
    sheet.getRange('D2:F').setNumberFormat('dd.mm.yyyy hh:mm');
    sheet.getRange('H2:H').setNumberFormat('dd.mm.yyyy hh:mm');
  }
  assertSheetHeadersExact_(sheet, SCANNER_COCKPIT_HEADERS_);
  return sheet;
}
function scannerCockpitEnsureSources_() {
  const sheet = scannerCockpitSheet_();
  const data = sheet.getDataRange().getValues();
  const known = new Set(data.slice(1).map(r => String(r[0] || '').trim()).filter(Boolean));
  const additions = scannerPipelineSources_().filter(s => !known.has(s.id));
  if (!additions.length) return sheet;

  // Find the first empty SOURCE cell. Do not rely on getLastRow(): existing
  // checkbox values in column B can extend far below real scanner records.
  let rowNumber = 2;
  const sourceValues = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows()-1), 1).getValues();
  for (const spec of additions) {
    while (rowNumber <= sourceValues.length + 1 &&
           String(sourceValues[rowNumber - 2]?.[0] || '').trim()) rowNumber++;
    if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    const row = [spec.id, true, 1, '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, ''];
    sheet.getRange(rowNumber, 1, 1, SCANNER_COCKPIT_HEADERS_.length).setValues([row]);
    sheet.getRange(rowNumber, 2).insertCheckboxes();
    sheet.getRange(rowNumber, 2).setValue(true);
    sourceValues[rowNumber - 2] = [spec.id];
    rowNumber++;
  }
  return sheet;
}

/**
 * One-off migration for the original pilot's full-column checkbox bug.
 * Preserves all populated scanner rows and their statuses/settings.
 * Safe to rerun. Does not touch other sheets.
 */
function repairScannerCockpitLayout() {
  const sheet = scannerCockpitSheet_();
  const maxRows = sheet.getMaxRows();
  const width = SCANNER_COCKPIT_HEADERS_.length;
  const data = sheet.getRange(2, 1, maxRows - 1, width).getValues();
  const populated = data.filter(r => String(r[0] || '').trim());
  const seen = new Set();
  populated.forEach(r => {
    const key = String(r[0]).trim();
    if (seen.has(key)) throw new Error('Duplicate cockpit source: ' + key);
    seen.add(key);
  });

  // Remove obsolete full-column checkbox validation and its FALSE values.
  const body = sheet.getRange(2, 1, maxRows - 1, width);
  body.clearContent();
  sheet.getRange(2, 2, maxRows - 1, 1).clearDataValidations();

  if (populated.length) {
    sheet.getRange(2, 1, populated.length, width).setValues(populated);
    const checkboxes = sheet.getRange(2, 2, populated.length, 1);
    checkboxes.setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
  }
  scannerCockpitEnsureSources_();
  Logger.log('Scanner_Cockpit repaired: ' + populated.length + ' existing sources retained');
}
/** Call once to create Scanner_Cockpit. Safe to rerun; preserves user settings. */
function setupScannerCockpit() {
  scannerCockpitEnsureSources_();
}
function scannerCockpitDueSources_(sources, force) {
  const sheet = scannerCockpitEnsureSources_();
  const data = sheet.getDataRange().getValues();
  const idx = indexMap_(SCANNER_COCKPIT_HEADERS_);
  const byId = new Map(data.slice(1).map(r => [String(r[idx.source]), r]));
  const today = scannerCockpitDayNumber_(new Date());
  return sources.filter(spec => {
    const row = byId.get(spec.id);
    if (!row || row[idx.enabled] !== true) return false;
    if (force) return true;
    const days = Number(row[idx.frequency_days]);
    if (!Number.isInteger(days) || days < 1) throw new Error('Invalid frequency_days for '+spec.id);
    const last = row[idx.last_stage_success];
    return !(last instanceof Date) || today - scannerCockpitDayNumber_(last) >= days;
  });
}
function scannerCockpitStepResult_(source, phase, status, durationMs, result, attempts, message) {
  const sheet = scannerCockpitEnsureSources_();
  const data = sheet.getDataRange().getValues();
  const idx = indexMap_(SCANNER_COCKPIT_HEADERS_);
  const rowIndex = data.findIndex((r,i) => i>0 && String(r[idx.source])===source);
  if (rowIndex < 1) throw new Error('Unknown cockpit source '+source);
  const row = data[rowIndex].slice();
  const now = new Date();
  const set = (key, value) => {row[idx[key]]=value;};
  set('attempts', attempts);
  set('message', message || '');
  if (phase === 'stage') {
    set('last_stage_attempt', now);
    set('stage_status', status);
    set('stage_duration_s', Math.round(durationMs/1000));
    if (status === 'ok') {
      set('last_stage_success', now);
      set('items_seen', Number(result.items_seen || 0));
      set('jobs_parsed', Number(result.jobs_parsed || 0));
      const freq = Number(row[idx.frequency_days]);
      set('next_due', new Date(now.getTime() + freq * 86400000));
    }
  } else if (phase === 'import') {
    set('import_status', status);
    set('import_duration_s', Math.round(durationMs/1000));
    if (status === 'ok') {
      set('last_import_success', now);
      set('new_jobs', Number(result.new_jobs || 0));
    }
  } else throw new Error('Unexpected phase '+phase);
  sheet.getRange(rowIndex+1, 1, 1, SCANNER_COCKPIT_HEADERS_.length).setValues([row]);
}

/** Compare calendar days in the project's time zone, not drifting 24h windows. */
function scannerCockpitDayNumber_(date) {
  const day = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
}
