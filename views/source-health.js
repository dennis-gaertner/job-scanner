// views/source-health.js — extracted without changing function implementations.

function buildSourceHealthView() {
  buildSourceHealthView_()
}

function buildSourceHealthView_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.sheets.scanLog);
  if (!logSheet) throw new Error('Scan_Log fehlt.');

  let healthSheet = ss.getSheetByName('Source_Health');
  if (!healthSheet) {
    healthSheet = ss.insertSheet('Source_Health');
  }

  const data = logSheet.getDataRange().getValues();

  const output = [[
    'source',
    'last_run_at',
    'status',
    'items_seen',
    'jobs_parsed',
    'new_jobs',
    'duration_s',
    'warning_flag',
    'message'
  ]];

  if (data.length <= 1) {
    healthSheet.clearContents();
    healthSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
    formatSourceHealthSheet_(healthSheet);
    return;
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const latestBySource = new Map();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const source = String(row[idx.source] || '').trim();
    const runAt = row[idx.run_at];

    if (!source || !runAt) continue;

    if (!latestBySource.has(source)) {
      latestBySource.set(source, row);
      continue;
    }

    const existing = latestBySource.get(source);
    const existingRunAt = existing[idx.run_at];

    if (new Date(runAt) > new Date(existingRunAt)) {
      latestBySource.set(source, row);
    }
  }

  Array.from(latestBySource.keys()).sort().forEach(source => {
    const row = latestBySource.get(source);

    const status = String(row[idx.status] || '');
    const itemsSeen = row[idx.items_seen] || 0;
    const jobsParsed = row[idx.jobs_parsed] || 0;
    const newJobs = row[idx.new_jobs] || 0;
    const durationMs = Number(row[idx.duration_ms] || 0);
    const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
    const message = row[idx.message] || '';

    const isSystem = source.startsWith('SYSTEM:');

    let warningFlag = '';
    if (status === 'error') {
      warningFlag = 'ERROR';
    } else if (!isSystem && Number(jobsParsed) === 0) {
      warningFlag = 'CHECK';
    }

    output.push([
      source,
      row[idx.run_at] || '',
      status,
      itemsSeen,
      jobsParsed,
      newJobs,
      durationSec,
      warningFlag,
      message
    ]);
  });

  healthSheet.clearContents();
  healthSheet.getRange(1, 1, output.length, output[0].length).setValues(output);

  formatSourceHealthSheet_(healthSheet);
}


function formatSourceHealthSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;

  sheet.setFrozenRows(1);

  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold');

  sheet.getRange(1, 1, lastRow, lastCol).setVerticalAlignment('top');

  const widths = {
    1: 110, // source
    2: 140, // last_run_at
    3: 70,  // status
    4: 80,  // items_seen
    5: 80,  // jobs_parsed
    6: 80,  // new_jobs
    7: 80,  // duration_s
    8: 90,  // warning_flag
    9: 420  // message
  };

  Object.keys(widths).forEach(col => {
    sheet.setColumnWidth(Number(col), widths[col]);
  });

  if (lastRow > 1) {
    sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat('dd.mm.yyyy hh:mm');
    sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat('0');
  }

  sheet.clearConditionalFormatRules();

  if (lastRow > 1) {
    const fullRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const warningColLetter = columnToLetter_(8);

    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${warningColLetter}2="ERROR"`)
        .setBackground('#fce8e6')
        .setFontColor('#b3261e')
        .setRanges([fullRange])
        .build(),

      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${warningColLetter}2="CHECK"`)
        .setBackground('#fff8e1')
        .setFontColor('#8a6d1d')
        .setRanges([fullRange])
        .build()
    ];

    sheet.setConditionalFormatRules(rules);
  }
}



// *****************************************
// SCORING COCKPIT
// *****************************************



