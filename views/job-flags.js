// views/job-flags.js — extracted without changing function implementations.

function ensureNewFlagFormulaJobsAll() {
  ensureNewFlagFormulaJobsAll_() 
}

function ensureNewFlagFormulaJobsAll_() {

return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);

  if (!sheet || sheet.getLastRow() < 2) return;

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const idx = indexMap_(headers);

  if (idx.new_flag == null) {
    throw new Error('new_flag column not found.');
  }

  const col = idx.new_flag + 1;
  const a1 = columnNumberToLetter_(col) + '2';

  const lastRow = sheet.getLastRow();

  const formula =
    '=LET(' +
    'fs,INDEX($A$2:$ZZ$' + lastRow + ',,MATCH("first_seen_at",$A$1:$ZZ$1,0)),' +
    'days,new_days,' +
    'ARRAYFORMULA(IF(fs="","",IF(TODAY()-fs<=days,"NEW","")))' +
    ')';

  sheet.getRange(a1).setFormula(formula);
}




function formatNewFlagColumn_(sheet) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h || '').trim());

  const idx = indexMap_(headers);
  const lastRow = sheet.getLastRow();

  if (idx.new_flag == null || lastRow <= 1) return;

  const newRange = sheet.getRange(2, idx.new_flag + 1, lastRow - 1, 1);
  const values = newRange.getDisplayValues();

  const fontColors = [];
  const fontWeights = [];
  const fontSizes = [];

  values.forEach(r => {
    if (String(r[0]).trim() === 'NEW') {
      fontColors.push(['#cc0000']);
      fontWeights.push(['bold']);
      fontSizes.push([8]);
    } else {
      fontColors.push(['#000000']);
      fontWeights.push(['normal']);
      fontSizes.push([10]);
    }
  });

  newRange.setBackgrounds(Array(lastRow - 1).fill([null]));
  newRange.setFontColors(fontColors);
  newRange.setFontWeights(fontWeights);
  newRange.setFontSizes(fontSizes);
  newRange.setHorizontalAlignment('center');
}




function isHandledApplicationStatus_(value) {
  const s = String(value || '').trim().toLowerCase();
  return ['beworben', 'applied', 'interview', 'absage', 'offer', 'erledigt'].indexOf(s) !== -1;
}

function getHandledRank_(value) {
  return isHandledApplicationStatus_(value) ? 1 : 0;
}

function getCategoryRank_(value) {
  const s = normalizeCategoryLabel_(value);
  if (s === 'Relevant') return 0;
  if (s === 'Vielleicht') return 1;
  if (s === 'Ignorieren') return 2;
  return 9;
}

function getNewFlagRank_(value) {
  return String(value || '').trim().toUpperCase() === 'NEW' ? 1 : 0;
}


// DEPRECATED:
// part of old monolithic status logic
// currently unused
// candidate for removal after full migration
function computeAutoStatus_(row, idx) {

  const manualStatus = String(row[idx.status] || '').trim().toLowerCase();
  const appStatus = String(row[idx.application_status] || '').trim().toLowerCase();

  // manuelle Entscheidungen respektieren
  if (manualStatus === 'closed' || manualStatus === 'archived') {
    return manualStatus;
  }

  if (appStatus === 'beworben' || appStatus === 'applied') return 'applied';
  if (appStatus === 'interview') return 'interview';
  if (appStatus === 'offer') return 'offer';
  if (appStatus === 'absage' || appStatus === 'erledigt') return 'closed';

  const staleDays = CONFIG.recency.staleStatusDays;
  const cutoff = daysAgo_(staleDays);

  const lastSeen = row[idx.last_seen_at] instanceof Date
    ? row[idx.last_seen_at]
    : new Date(row[idx.last_seen_at]);

  if (lastSeen instanceof Date && !isNaN(lastSeen.getTime())) {
    if (lastSeen < cutoff) return 'stale';
  }

  return 'open';
}












// key function
