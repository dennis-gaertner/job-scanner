// views/scoring-cockpit.js — extracted without changing function implementations.

function buildScoringCockpit() {
  buildScoringCockpit_();
}

function buildScoringCockpit_() {
  Logger.log('buildScoringCockpit_ START');

  const ss = SpreadsheetApp.getActive();

  const masterSheet = ss.getSheetByName('Jobs_All');
  if (!masterSheet) throw new Error('Sheet "Jobs_All" not found.');

  const userSheet = ss.getSheetByName('Jobs_User');
  if (!userSheet) throw new Error('Sheet "Jobs_User" not found.');

  let cockpitSheet = ss.getSheetByName('Scoring_Cockpit');
  if (!cockpitSheet) {
    cockpitSheet = ss.insertSheet('Scoring_Cockpit');
  }

  const masterData = masterSheet.getDataRange().getValues();
  const userData = userSheet.getDataRange().getValues();

  cockpitSheet.clearContents();
  cockpitSheet.clearFormats();

  if (!masterData || masterData.length === 0) {
    cockpitSheet.getRange(1, 1, 1, SCORING_COCKPIT_COLUMNS.length)
      .setValues([SCORING_COCKPIT_COLUMNS]);
    formatScoringCockpitSheet_(cockpitSheet, 1, SCORING_COCKPIT_COLUMNS.length);
    Logger.log('buildScoringCockpit_ END (empty master)');
    return;
  }

  const masterHeaders = masterData[0];
  const userHeaders = userData && userData.length ? userData[0] : [];

  const mIdx = indexMap_(masterHeaders);
  const uIdx = indexMap_(userHeaders);

  //delme
  Logger.log(JSON.stringify({
  hard_reject_hit_header: masterHeaders.includes('hard_reject_hit'),
  hard_reject_hits_header: masterHeaders.includes('hard_reject_hits'),
  hard_reject_hit_index: mIdx.hard_reject_hit,
  hard_reject_hits_index: mIdx.hard_reject_hits,
  sample_header_slice: masterHeaders.slice(18, 25)
}, null, 2));

  const userMap = {};
  const userKeyIdx = uIdx.unique_key;

  if (userKeyIdx !== -1 && userKeyIdx !== undefined) {
    for (let i = 1; i < userData.length; i++) {
      const row = userData[i];
      const key = row[userKeyIdx];
      if (key) userMap[key] = row;
    }
  }

  const out = [SCORING_COCKPIT_COLUMNS];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const uniqueKey = row[mIdx.unique_key] ?? '';
    const userRow = uniqueKey && userMap[uniqueKey] ? userMap[uniqueKey] : null;


    out.push([
      row[mIdx.source] ?? '',
      row[mIdx.location] ?? '',
      row[mIdx.title] ?? '',
      row[mIdx.employer] ?? '',
      row[mIdx.url] ?? '',

      userRow && uIdx.manual_category !== -1 ? (userRow[uIdx.manual_category] ?? '') : '',
      userRow && uIdx.manual_score_delta !== -1 ? (userRow[uIdx.manual_score_delta] ?? '') : '',
      userRow && uIdx.learn_from_feedback !== -1 ? (userRow[uIdx.learn_from_feedback] ?? '') : '',
      userRow && uIdx.notes !== -1 ? (userRow[uIdx.notes] ?? '') : '',

      row[mIdx.category] ?? '',
      row[mIdx.score] ?? '',
      row[mIdx.score_normalized] ?? '',
      row[mIdx.positive_hits] ?? '',
      row[mIdx.negative_hits] ?? '',
      row[mIdx.hard_reject_hit] ?? '',
      row[mIdx.hard_reject_hits] ?? '',

      row[mIdx.deadline] ?? '',
      row[mIdx.mail_date] ?? '',
      row[mIdx.grade] ?? '',
      row[mIdx.percent_or_workload] ?? '',
      row[mIdx.domain] ?? '',
      row[mIdx.dg] ?? '',
      row[mIdx.source_label] ?? '',

      uniqueKey
    ]);
  }

  const categoryOrder = {
    'Relevant': 1,
    'Vielleicht': 2,
    'Ignorieren': 3
  };

const dataRows = out.slice(1);

const cIdx = indexMap_(SCORING_COCKPIT_COLUMNS);

dataRows.sort((a, b) => {
  const catA = categoryOrder[a[cIdx.category]] || 99;
  const catB = categoryOrder[b[cIdx.category]] || 99;
  if (catA !== catB) return catA - catB;

  const scoreA = Number(a[cIdx.score_normalized]) || 0;
  const scoreB = Number(b[cIdx.score_normalized]) || 0;
  return scoreB - scoreA;
});

  const finalOut = [out[0]].concat(dataRows);

  const expectedWidth = SCORING_COCKPIT_COLUMNS.length;
  finalOut.forEach((row, i) => {
    if (row.length !== expectedWidth) {
      throw new Error(
        'Scoring_Cockpit width mismatch in row ' + (i + 1) +
        ': expected ' + expectedWidth +
        ', got ' + row.length
      );
    }
  });

  const filter = cockpitSheet.getFilter();
  if (filter) filter.remove();

  cockpitSheet.getRange(1, 1, finalOut.length, expectedWidth).setValues(finalOut);
  cockpitSheet.setFrozenRows(1);

  formatScoringCockpitSheet_(cockpitSheet, finalOut.length, expectedWidth);

  Logger.log('buildScoringCockpit_ END');
}



function formatScoringCockpitSheet_(sheet, numRows, numCols) {
  if (numRows < 1 || numCols < 1) return;

  const headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  const cIdx = indexMap_(headers);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, numCols).setFontWeight('bold');

  const filter = sheet.getFilter();
  if (filter) filter.remove();

  if (numRows > 1) {
    sheet.getRange(1, 1, numRows, numCols).createFilter();
  }

  const widths = {
    1: 90,   // source
    2: 160,  // location
    3: 420,  // title
    4: 220,  // employer

    5: 120,  // manual_category
    6: 120,  // manual_score_delta
    7: 140,  // learn_from_feedback
    8: 260,  // notes

    9: 110,  // category
    10: 70,  // score
    11: 110, // score_normalized
    12: 110, // hard_reject_hit

    13: 100, // deadline
    14: 100, // mail_date
    15: 100, // grade
    16: 120, // percent_or_workload
    17: 110, // domain
    18: 80,  // dg
    19: 120, // source_label

    20: 320, // positive
    21: 220, // negative

    22: 260, // url
    23: 220  // unique_key
  };

  Object.keys(widths).forEach(col => {
    sheet.setColumnWidth(Number(col), widths[col]);
  });

  if (numRows > 1) {
    if (cIdx.score != null) {
      sheet.getRange(2, cIdx.score + 1, numRows - 1, 1).setNumberFormat('0.0');
    }
    if (cIdx.score_normalized != null) {
      sheet.getRange(2, cIdx.score_normalized + 1, numRows - 1, 1).setNumberFormat('0.0');
    }
    if (cIdx.manual_score_delta != null) {
      sheet.getRange(2, cIdx.manual_score_delta + 1, numRows - 1, 1).setNumberFormat('0.0');
    }
  }

  paintEditableColumnsScoringCockpit_(sheet, numRows, headers);
}

function paintEditableColumnsScoringCockpit_(sheet, numRows, headers) {
  if (numRows < 2) return;

  const headerMap = indexMap_(headers);
  const editableColor = '#d9edf7';

  SCORING_COCKPIT_EDITABLE_COLUMNS.forEach(name => {
    const zeroBasedIdx = headerMap[name];
    if (zeroBasedIdx === -1 || zeroBasedIdx === undefined) return;

    const col = zeroBasedIdx + 1;
    sheet.getRange(2, col, numRows - 1, 1).setBackground(editableColor);
  });
}






// *****************************************
// 3. ORCHESTRIERUNG / SCHREIBEN / VIEWS
// *****************************************


function columnNumberToLetter_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}


