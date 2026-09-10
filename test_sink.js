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
  const idx = indexMap_(JOBS_ALL_COLUMNS);
  newRows = dedupeRowsByUniqueKey_(newRows, idx);

  if (!newRows.length) {
    return {
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0
    };
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Test-Sheet fehlt: ' + sheetName);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sheetIdx = indexMap_(headers);

  const existingMap = new Map();
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const key = String(row[sheetIdx.unique_key] || '');
    if (key) existingMap.set(key, { rowNumber: r + 1, row });
  }

  const rowsToAppend = [];
  let newCount = 0;
  let updatedCount = 0;

  newRows.forEach(newRow => {
    const key = String(newRow[idx.unique_key] || '');
    if (!key) return;

    if (existingMap.has(key)) {
      const existing = existingMap.get(key);
      const rowNumber = existing.rowNumber;



      if (idx.first_seen_at != null && sheetIdx.first_seen_at != null) {
        newRow[idx.first_seen_at] =
          existing.row[sheetIdx.first_seen_at] || newRow[idx.first_seen_at];
      }

      if (idx.mail_date != null && sheetIdx.mail_date != null) {
        newRow[idx.mail_date] =
          existing.row[sheetIdx.mail_date] || newRow[idx.mail_date];
      }

      if (idx.notified_at != null && sheetIdx.notified_at != null) {
        newRow[idx.notified_at] =
          existing.row[sheetIdx.notified_at] || '';
      }

      if (idx.detail_text != null && sheetIdx.detail_text != null) {
        newRow[idx.detail_text] =
          newRow[idx.detail_text] || existing.row[sheetIdx.detail_text] || '';
      }

      if (idx.run_id != null && sheetIdx.run_id != null) {
        newRow[idx.run_id] =
          newRow[idx.run_id] || existing.row[sheetIdx.run_id] || '';
      }

      if (idx.archived_at != null && sheetIdx.archived_at != null) {
        newRow[idx.archived_at] =
          existing.row[sheetIdx.archived_at] || '';
      }

      if (idx.archive_reason != null && sheetIdx.archive_reason != null) {
        newRow[idx.archive_reason] =
          existing.row[sheetIdx.archive_reason] || '';
      }

      sheet.getRange(rowNumber, 1, 1, newRow.length).setValues([newRow]);
      // ✅ ASSERTION HIER
      if (!newRow[idx.url]) {
        Logger.log('WARN: URL empty for key ' + key);
      }
      updatedCount++;
    } else {
      rowsToAppend.push(newRow);
      newCount++;
    }
  });

  if (rowsToAppend.length) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }

  return {
    jobs_upserted: newCount + updatedCount,
    new_jobs: newCount,
    updated_jobs: updatedCount
  };

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
