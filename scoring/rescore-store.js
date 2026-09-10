// scoring/rescore-store.js — extracted without changing function implementations.

function rescoreSheetBySpreadsheetId_(spreadsheetId, sheetName, sourceInput) {
  if (!spreadsheetId) {
    throw new Error('rescoreSheetBySpreadsheetId_: spreadsheetId fehlt.');
  }
  if (!sheetName) {
    throw new Error('rescoreSheetBySpreadsheetId_: sheetName fehlt.');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const result = rescoreJobStoreSheet_(sheet, sourceInput);

  return Object.assign({}, result, {
    spreadsheet_id: spreadsheetId
  });
}




//--------------------------------------------------
//NEW SCORING FUNCTIONS, 22.4.2026
//--------------------------------------------------


//helper to assemble job-data required for scoring
function buildScoringInputFromRow_(row, idx) {
  return {
    source: idx.source != null ? row[idx.source] || '' : '',
    source_label: idx.source_label != null ? row[idx.source_label] || '' : '',
    raw_source_id: idx.raw_source_id != null ? row[idx.raw_source_id] || '' : '',
    url: idx.url != null ? row[idx.url] || '' : '',

    title: idx.title != null ? row[idx.title] || '' : '',
    employer: idx.employer != null ? row[idx.employer] || '' : '',
    location: idx.location != null ? row[idx.location] || '' : '',
    mail_date: idx.mail_date != null ? row[idx.mail_date] || '' : '',
    deadline: idx.deadline != null ? row[idx.deadline] || '' : '',
    percent_or_workload: idx.percent_or_workload != null ? row[idx.percent_or_workload] || '' : '',
    grade: idx.grade != null ? row[idx.grade] || '' : '',
    domain: idx.domain != null ? row[idx.domain] || '' : '',
    dg: idx.dg != null ? row[idx.dg] || '' : '',

    raw_snippet: idx.raw_snippet != null ? row[idx.raw_snippet] || '' : '',
    detail_text: idx.detail_text != null ? row[idx.detail_text] || '' : ''
  };
}


function writeScoringResultToRow_(row, idx, scoring) {
  row[idx.score] = scoring.score;
  row[idx.score_normalized] = scoring.normalizedScore;
  row[idx.category] = scoring.category;
  row[idx.positive_hits] = (scoring.positive || []).join(', ');
  row[idx.negative_hits] = (scoring.negative || []).join(', ');
  row[idx.hard_reject_hit] = scoring.hardRejectHit || '';
  row[idx.hard_reject_hits] = (scoring.hardRejectHits || []).join(', ');
}


function rescoreJobStoreSheet_(sheet, sourceInput) {
  const sourceFilter = String(sourceInput || '').trim().toLowerCase();

  if (!sheet) {
    throw new Error('rescoreJobStoreSheet_: sheet is undefined');
  }

  const range = sheet.getDataRange();
  const data = range.getValues();

  if (data.length <= 1) {
    return {
      sheet_name: sheet.getName(),
      source_filter: sourceFilter || '',
      rows_seen: 0,
      rows_matched: 0,
      rows_updated: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      hard_reject_count: 0,
      per_source: []
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  // Pflichtspalten für ein sauberes, source-agnostisches Rescoring.
  // Einige Quellen lassen manche dieser Input-Felder leer – das ist ok.
  const requiredCols = [
    'source',
    'source_label',
    'title',
    'employer',
    'location',
    'percent_or_workload',
    'grade',
    'domain',
    'dg',
    'detail_text',

    'score',
    'score_normalized',
    'category',
    'positive_hits',
    'negative_hits',
    'hard_reject_hit',
    'hard_reject_hits'
  ];

  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error(
        'Required column missing in sheet "' + sheet.getName() + '": ' + col
      );
    }
  });

  let rowsMatched = 0;
  let rowsUpdated = 0;
  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;
  let hardRejectCount = 0;

  const perSourceMap = {};

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rowSource = String(row[idx.source] || '').trim().toLowerCase();
    if (!rowSource) continue;

    if (sourceFilter && rowSource !== sourceFilter) continue;

    rowsMatched++;

    const job = buildScoringInputFromRow_(row, idx);
    const scoring = scoreJobBySource_(job);

    writeScoringResultToRow_(row, idx, scoring);

    if (!perSourceMap[rowSource]) {
      perSourceMap[rowSource] = {
        source: rowSource,
        rows_matched: 0,
        rows_updated: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        hard_reject_count: 0
      };
    }

    perSourceMap[rowSource].rows_matched++;
    perSourceMap[rowSource].rows_updated++;

    if (String(scoring.category) === 'Relevant') {
      relevantCount++;
      perSourceMap[rowSource].relevant_count++;
    } else if (String(scoring.category) === 'Vielleicht') {
      maybeCount++;
      perSourceMap[rowSource].maybe_count++;
    } else {
      ignoreCount++;
      perSourceMap[rowSource].ignore_count++;
    }

    if (scoring.hardRejectHit) {
      hardRejectCount++;
      perSourceMap[rowSource].hard_reject_count++;
    }

    rowsUpdated++;
  }

  if (rowsUpdated > 0) {
    sheet.getRange(2, 1, data.length - 1, headers.length).setValues(data.slice(1));
  }

  const perSource = Object.values(perSourceMap).sort((a, b) =>
    String(a.source).localeCompare(String(b.source))
  );

  return {
    sheet_name: sheet.getName(),
    source_filter: sourceFilter || '',
    rows_seen: data.length - 1,
    rows_matched: rowsMatched,
    rows_updated: rowsUpdated,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    hard_reject_count: hardRejectCount,
    per_source: perSource
  };
}


function rescoreAllTestSheets(sourceInput) {
  const results = [
    rescoreSheetBySpreadsheetId_(
      CONFIG.testSink.spreadsheetId,
      CONFIG.testSink.sheets.bundAt,
      sourceInput
    ),
    rescoreSheetBySpreadsheetId_(
      CONFIG.testSink.spreadsheetId,
      CONFIG.testSink.sheets.stadtWien,
      sourceInput
    ),
    rescoreSheetBySpreadsheetId_(
      CONFIG.testSink.spreadsheetId,
      CONFIG.testSink.sheets.aaCities,
      sourceInput
    )
  ];

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}



function sortJobStoreSheetByScore_(sheet) {
  if (!sheet) {
    throw new Error('sortJobStoreSheetByScore_: sheet is undefined');
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  const scoreCol = idx.score_normalized != null
    ? idx.score_normalized + 1
    : null;

  const deadlineCol = idx.deadline != null
    ? idx.deadline + 1
    : null;

  if (!scoreCol) {
    throw new Error('score_normalized column missing in ' + sheet.getName());
  }

  // Sort: score_normalized DESC, deadline ASC (optional)
  const sortSpecs = [
    { column: scoreCol, ascending: false }
  ];

  if (deadlineCol) {
    sortSpecs.push({ column: deadlineCol, ascending: true });
  }

  range.offset(1, 0, range.getNumRows() - 1).sort(sortSpecs);
}