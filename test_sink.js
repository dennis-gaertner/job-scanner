function runTestSinkScanners(){
  scanBundAtJobsToAll('test-bundat', 'test');
  scanStadtWienJobsToAll('test-stadtwien', 'test');
  scanAaCitiesCrawlerJobsToAll('test-aacities', 'test');

  sortAllTestSinkSheetsForReview_();
}


function setupTestJobSheets_() {
  const ss = SpreadsheetApp.openById(CONFIG.testSink.spreadsheetId);

  Object.values(CONFIG.testSink.sheets).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    const headerRange = sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length);
    const currentHeader = sheet.getLastRow() >= 1
      ? sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length).getValues()[0]
      : [];

    const needsHeader =
      sheet.getLastRow() === 0 ||
      JSON.stringify(currentHeader) !== JSON.stringify(JOBS_ALL_COLUMNS);

    if (needsHeader) {
      sheet.clearContents();
      headerRange.setValues([JOBS_ALL_COLUMNS]);
    }
  });
}




function upsertRowsToSheetByName_(spreadsheetId, sheetName, newRows) {
  return upsertJobRows_(newRows, () => {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Test-Sheet fehlt: ' + sheetName);
    return sheet;
  }, true);
}


function sortJobStoreSheetForReview_(sheet) {
  if (!sheet) {
    throw new Error('sortJobStoreSheetForReview_: sheet is undefined');
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  const requiredCols = ['score_normalized', 'deadline'];
  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error('Missing required column in ' + sheet.getName() + ': ' + col);
    }
  });

  const header = data[0];
  const body = data.slice(1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function parseDeadline_(value) {
    if (!value) return null;

    const d = new Date(value);
    if (isNaN(d)) return null;

    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getExpiryGroup_(row) {
    const deadline = parseDeadline_(row[idx.deadline]);

    // 0 = open or no deadline
    // 1 = expired
    if (!deadline) return 0;
    return deadline < today ? 1 : 0;
  }

  function getScore_(row) {
    const raw = row[idx.score_normalized];
    const n = Number(raw);
    return isNaN(n) ? -999999 : n;
  }

  function getDeadlineSortValue_(row) {
    const deadline = parseDeadline_(row[idx.deadline]);
    if (!deadline) return Number.POSITIVE_INFINITY;
    return deadline.getTime();
  }

  body.sort((a, b) => {
    const aExpiryGroup = getExpiryGroup_(a);
    const bExpiryGroup = getExpiryGroup_(b);
    if (aExpiryGroup !== bExpiryGroup) {
      return aExpiryGroup - bExpiryGroup;
    }

    const aScore = getScore_(a);
    const bScore = getScore_(b);
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    const aDeadline = getDeadlineSortValue_(a);
    const bDeadline = getDeadlineSortValue_(b);
    if (aDeadline !== bDeadline) {
      return aDeadline - bDeadline;
    }

    return 0;
  });

  sheet.clearContents();
  sheet.getRange(1, 1, data.length, data[0].length).setValues([header, ...body]);
}


function sortAllTestSinkSheetsForReview() {
  sortAllTestSinkSheetsForReview_();
}

function sortAllTestSinkSheetsForReview_() {
  const ss = SpreadsheetApp.openById(CONFIG.testSink.spreadsheetId);

  const sheets = [
    CONFIG.testSink.sheets.bundAt,
    CONFIG.testSink.sheets.stadtWien,
    CONFIG.testSink.sheets.aaCities
  ];

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      Logger.log('Sheet not found: ' + name);
      return;
    }

    sortJobStoreSheetForReview_(sheet);
  });

  Logger.log('TestSink sheets sorted for review.');
}
