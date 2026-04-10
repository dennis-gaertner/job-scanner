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

  if (CONFIG.sheets.scanLog) {
    ensureSheetWithHeaders_(ss, CONFIG.sheets.scanLog, SCAN_LOG_COLUMNS);
  }
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






function buildScanSummarySinceLastMail_(runId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) return '';

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return '';

  const headers = data[0];
  const rows = data.slice(1);
  const idx = indexMap_(headers);

  let lastMailAt = null;

  rows.forEach(row => {
    const notifiedAt = row[idx.notified_at];
    if (notifiedAt instanceof Date && !isNaN(notifiedAt.getTime())) {
      if (!lastMailAt || notifiedAt > lastMailAt) {
        lastMailAt = notifiedAt;
      }
    }
  });

  const newRows = rows.filter(row => {
    const firstSeenAt = row[idx.first_seen_at];

    if (!(firstSeenAt instanceof Date) || isNaN(firstSeenAt.getTime())) {
      return false;
    }

    if (lastMailAt) {
      return firstSeenAt > lastMailAt;
    }

    return runId
      ? String(row[idx.run_id] || '') === String(runId)
      : false;
  });

  if (!newRows.length) return '';

  const grouped = {};

  newRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    const category = String(row[idx.category] || 'Ignorieren');

    if (!grouped[source]) {
      grouped[source] = {
        total: 0,
        relevant: 0,
        maybe: 0,
        ignore: 0
      };
    }

    grouped[source].total++;

    if (category === 'Relevant') grouped[source].relevant++;
    else if (category === 'Vielleicht') grouped[source].maybe++;
    else grouped[source].ignore++;
  });

  let total = 0;
  let totalRelevant = 0;
  let totalMaybe = 0;
  let totalIgnore = 0;

  let out = 'SCAN SUMMARY (seit letzter Mail)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const g = grouped[source];

    total += g.total;
    totalRelevant += g.relevant;
    totalMaybe += g.maybe;
    totalIgnore += g.ignore;

    out +=
      source.padEnd(12) +
      ` neu:${g.total} | ` +
      `rel:${g.relevant} maybe:${g.maybe} ign:${g.ignore}\n`;
  });

  out += '\n';
  out +=
    'GESAMT'.padEnd(12) +
    ` neu:${total} | ` +
    `rel:${totalRelevant} maybe:${totalMaybe} ign:${totalIgnore}\n\n`;

  return out;
}







function emailNewRelevantJobs(runId) {
  runId = runId || '';

  const derived = buildDerivedJobViews_();
  const ss = derived.ss;
  const jobsSheet = derived.masterSheet;
  const notifiedSheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);

  if (!jobsSheet) throw new Error('Bitte zuerst setupJobSheets() ausführen.');
  if (!derived.masterRows.length) return;

  const jobsHeaders = derived.masterHeaders;
  const jobsIdx = derived.masterIdx;

  const derivedByKey = new Map();
  derived.rows.forEach(view => {
    if (view.unique_key) derivedByKey.set(view.unique_key, view);
  });

  const newRecommendedViews = selectJobsForNotification_(derived.rows, jobsIdx);

  const newRecommendedMasterRows = newRecommendedViews.map(view => view.masterRow);
  const newRecommendedRowsDedup = dedupeRowsForMail_(newRecommendedMasterRows, jobsIdx);


  //sort jobs

  newRecommendedRowsDedup.sort((a, b) => {
    const keyA = jobsIdx.unique_key != null ? String(a[jobsIdx.unique_key] || '') : '';
    const keyB = jobsIdx.unique_key != null ? String(b[jobsIdx.unique_key] || '') : '';

    const viewA = derivedByKey.get(keyA);
    const viewB = derivedByKey.get(keyB);

    const scoreA = viewA ? Number(viewA.final_score || 0) : 0;
    const scoreB = viewB ? Number(viewB.final_score || 0) : 0;

    if (scoreB !== scoreA) return scoreB - scoreA;

    const deadlineA = jobsIdx.deadline != null && a[jobsIdx.deadline]
      ? new Date(a[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    const deadlineB = jobsIdx.deadline != null && b[jobsIdx.deadline]
      ? new Date(b[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    return deadlineA - deadlineB;
  });

  const newIgnoredViews = (CONFIG.debugMail && CONFIG.debugMail.includeIgnoredJobs)
    ? derived.rows.filter(view => {
        const notifiedAt = jobsIdx.notified_at != null
          ? view.masterRow[jobsIdx.notified_at]
          : '';

        return (
          view.final_category === 'Ignorieren' &&
          !notifiedAt &&
          view.visibility_preference !== 'hidden' &&
          view.job_state !== 'closed'
        );
      })
    : [];

  const newIgnoredRows = newIgnoredViews.map(view => view.masterRow);

  if (!newRecommendedRowsDedup.length && !newIgnoredRows.length) return;

  const relevant = [];
  const maybe = [];

  newRecommendedRowsDedup.forEach(row => {
    const uniqueKey = jobsIdx.unique_key != null ? String(row[jobsIdx.unique_key] || '') : '';
    const view = derivedByKey.get(uniqueKey);

    const metaParts = [];

    if (jobsIdx.percent_or_workload != null && row[jobsIdx.percent_or_workload]) {
      metaParts.push(row[jobsIdx.percent_or_workload]);
    }
    if (jobsIdx.grade != null && row[jobsIdx.grade]) {
      metaParts.push(row[jobsIdx.grade]);
    }
    if (jobsIdx.employer != null && row[jobsIdx.employer]) {
      metaParts.push(row[jobsIdx.employer]);
    }
    if (jobsIdx.source != null && row[jobsIdx.source]) {
      metaParts.push(row[jobsIdx.source]);
    }
    if (jobsIdx.location != null && row[jobsIdx.location]) {
      metaParts.push(row[jobsIdx.location]);
    }
    if (jobsIdx.domain != null && row[jobsIdx.domain]) {
      metaParts.push(`Domain: ${row[jobsIdx.domain]}`);
    }
    if (jobsIdx.dg != null && row[jobsIdx.dg]) {
      metaParts.push(`DG: ${row[jobsIdx.dg]}`);
    }
    if (jobsIdx.deadline != null && row[jobsIdx.deadline]) {
      metaParts.push(`Deadline: ${formatDateForMail_(row[jobsIdx.deadline])}`);
    }

    const finalScore = view ? view.final_score : '';
    const finalCategory = view ? view.final_category : '';

    const line = [
      `• ${jobsIdx.title != null ? (row[jobsIdx.title] || 'Ohne Titel') : 'Ohne Titel'}`,
      `  ${metaParts.join(' | ')}`,
      `  Score: ${finalScore}`,
      `  ${jobsIdx.url != null ? (row[jobsIdx.url] || '') : ''}`,
    ].join('\n');

    if (finalCategory === 'Relevant') relevant.push(line);
    if (finalCategory === 'Vielleicht') maybe.push(line);
  });

  const sheetUrl = ss.getUrl() + '#gid=' + jobsSheet.getSheetId();

  let body = 'Neue gefilterte Job-Übersicht\n\n';
  body += buildScanSummarySinceLastMail_(runId);
  body += 'Übersicht im Sheet:\n' + sheetUrl + '\n\n';

  if (relevant.length) {
    body += 'RELEVANT\n\n' + relevant.join('\n\n') + '\n\n';
  }

  if (maybe.length) {
    body += 'VIELLEICHT\n\n' + maybe.join('\n\n') + '\n\n';
  }

  body += '---\nAutomatisch generiert.\n\n\n';

  const pdfBlob = newRecommendedRowsDedup.length
    ? buildJobsPdfBlobFromRows_(newRecommendedRowsDedup, jobsHeaders, 30)
    : null;

  const mailOptions = {};
  if (pdfBlob) {
    mailOptions.attachments = [pdfBlob];
  }

  const ignoredDebugSection = buildIgnoredJobsDebugSectionFromRows_(newIgnoredRows, jobsHeaders);
  if (ignoredDebugSection) {
    body += ignoredDebugSection + '\n';
  }

  GmailApp.sendEmail(
    CONFIG.notification.recipient,
    `${CONFIG.notification.subjectPrefix} ${newRecommendedRowsDedup.length} neue Jobs`,
    body,
    mailOptions
  );

  const now = new Date();
  const allSentRows = newRecommendedRowsDedup.concat(newIgnoredRows);

  try {
    if (notifiedSheet && newRecommendedRowsDedup.length) {
      appendNotifiedRows_(notifiedSheet, newRecommendedRowsDedup, jobsIdx, now);
    } else {
      Logger.log('appendNotifiedRows_ skipped: notifiedSheet=' + !!notifiedSheet + ', rows=' + newRecommendedRowsDedup.length);
    }
  } catch (e) {
    Logger.log('appendNotifiedRows_ failed: ' + e);
  }

  try {
    if (allSentRows.length) {
      stampNotifiedAtInJobsAll_(jobsSheet, allSentRows, jobsIdx, now);
    } else {
      Logger.log('stampNotifiedAtInJobsAll_ skipped: no rows');
    }
  } catch (e) {
    Logger.log('stampNotifiedAtInJobsAll_ failed: ' + e);
  }
}


function selectJobsForNotification_(derivedRows, jobsIdx) {
  return derivedRows.filter(view => {
    const notifiedAt = jobsIdx.notified_at != null
      ? view.masterRow[jobsIdx.notified_at]
      : '';

    return (
      (view.final_category === 'Relevant' || view.final_category === 'Vielleicht') &&
      !notifiedAt &&
      view.visibility_preference !== 'hidden' &&
      view.job_state !== 'closed'
    );
  });
}



//builds list of ignored jobs for mail (for debug purposes)
function buildIgnoredJobsDebugSectionFromRows_(rows, headers) {
  if (!CONFIG.debugMail || !CONFIG.debugMail.includeIgnoredJobs) return '';

  const idx = indexMap_(headers);
  const maxPerSource = CONFIG.debugMail.maxIgnoredPerSource || 15;

  const ignoredRows = rows.filter(row => String(row[idx.category] || '') === 'Ignorieren');
  if (!ignoredRows.length) return '';

  const grouped = {};

  ignoredRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    if (!grouped[source]) grouped[source] = [];
    grouped[source].push(row);
  });

  let out = 'IGNORIEREN (Debug)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const rowsForSource = grouped[source]
      .slice()
      .sort((a, b) => Number(b[idx.score] || 0) - Number(a[idx.score] || 0))
      .slice(0, maxPerSource);

    out += '[' + source + ']\n\n';

    rowsForSource.forEach(row => {
      const metaParts = [];
      if (row[idx.location]) metaParts.push(row[idx.location]);
      if (row[idx.employer]) metaParts.push(row[idx.employer]);

      out += '• ' + (row[idx.title] || 'Ohne Titel') + '\n';
      if (metaParts.length) out += '  ' + metaParts.join(' | ') + '\n';
      out += '  Score: ' + String(row[idx.score] ?? '') + '\n';

      if (row[idx.positive_hits]) out += '  + ' + row[idx.positive_hits] + '\n';
      if (row[idx.negative_hits]) out += '  - ' + row[idx.negative_hits] + '\n';
      if (row[idx.url]) out += '  ' + row[idx.url] + '\n';

      out += '\n';
    });
  });

  return out;
}



//outdated, doesn't fit current content anymore
function formatJobsAllSheet_(sheet) {

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h || '').trim());

  const idx = indexMap_(headers);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastCol < 1) return;

  // --- Column widths ---
  const widths = {
    new_flag: 34,
    quick_flag: 26,

    title: 297,
    employer: 212,
    location: 104,
    source: 62,
    mail_date: 67,
    deadline: 59,
    score: 41,
    score_normalized: 54,
    category: 90,
    final_score: 54,
    final_category: 90,

    percent_or_workload: 58,
    grade: 61,
    domain: 45,
    dg: 63,
    first_seen_at: 67,
    last_seen_at: 70,
    notified_at: 53,

    application_status: 123,
    status: 72,
    manual_category_override: 118,
    manual_score_delta: 70,
    learn_from_feedback: 95,
    notes: 160,
    feedback_learned_at: 110,
    feedback_learning_version: 110,

    positive_hits: 57,
    negative_hits: 65,

    url: 90,
    unique_key: 61,
    hard_reject_hit: 238,
    hard_reject_hits: 238,
    source_label: 90,
    gmail_message_id: 148,
    gmail_thread_id: 114,
    raw_snippet: 247,
    detail_text: 247,
    raw_source_id: 247,
    run_id: 247
  };

  Object.keys(widths).forEach(name => {
    if (idx[name] != null) {
      sheet.setColumnWidth(idx[name] + 1, widths[name]);
    }
  });

  if (lastRow <= 1) return;

  const setFormat = (name, format) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setNumberFormat(format);
  };

  const setAlign = (name, align) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setHorizontalAlignment(align);
  };

  // --- Date formats (short) ---
  setFormat('mail_date', 'd.M.');
  setFormat('deadline', 'd.M.');
  setFormat('first_seen_at', 'd.M.');
  setFormat('last_seen_at', 'd.M.');
  setFormat('notified_at', 'd.M.');
  setFormat('feedback_learned_at', 'd.M.');

  // --- Numeric formats ---
  setFormat('score', '0');
  setFormat('score_normalized', '0.0');
  setFormat('final_score', '0.0');
  setFormat('manual_score_delta', '0.0;-0.0;');

  // --- Alignment ---
  [
    'mail_date',
    'deadline',
    'first_seen_at',
    'last_seen_at',
    'notified_at',
    'feedback_learned_at'
  ].forEach(c => setAlign(c, 'right'));

  [
    'score',
    'score_normalized',
    'final_score',
    'manual_score_delta'
  ].forEach(c => setAlign(c, 'right'));

  //Format new_flag column
  if (idx.new_flag != null && lastRow > 1) {
    const range = sheet.getRange(2, idx.new_flag + 1, lastRow - 1, 1);
    range.setFontColor('#cc0000');
    range.setFontWeight('bold');
    range.setFontSize(8);
    range.setHorizontalAlignment('center');
  }
}





function formatAllSheets() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsAll = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (jobsAll) {
    //formatJobsAllSheet_(jobsAll); doesn't work well anymore: outdated
    formatSheetByCategory_(jobsAll);
  }


}

function rebuildConditionalFormatting_(sheet) {

  const range = sheet.getRange("B2:B2000");

  const rules = [];

  // Regel 1: Zelle = "x" → grau + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("x")
      .setBackground("#888888")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  // Regel 2: Zelle nicht leer UND nicht "x" → dunkelrot + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($B2<>"",$B2<>"x")')
      .setBackground("#8b0000")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}


//new function to replace formatAllSheets(),
//minimal, formats mainly date formats 
function formatJobsAllScoreColumns_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Jobs_All');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return;

  const headers = data[0];
  const scoreCol = headers.indexOf('score') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const bodyRows = Math.max(sheet.getLastRow() - 1, 0);

  if (bodyRows < 1) return;

  if (scoreCol > 0) {
    sheet.getRange(2, scoreCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }
}



function formatSheetByCategory_(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  const range = sheet.getDataRange();
  range.setVerticalAlignment('top');

  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);

  const sheetName = sheet.getName();
  //const frozenCols =
  //  sheetName === CONFIG.sheets.jobsAll ? 7 :
  //  sheetName === CONFIG.sheets.relevantAll ? 3 : //set to zero for no column freeze
  //  0;
  //sheet.setFrozenColumns(Math.min(frozenCols, lastCol));
  //sheet.autoResizeColumns(1, lastCol);

  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = indexMap_(headers);
  const categoryCol = idx.final_category != null ? idx.final_category : idx.category;
  const categories = sheet.getRange(2, categoryCol + 1, lastRow - 1, 1).getValues();

  const backgrounds = categories.map(row => {
    const cat = row[0];

    const color =
      cat === 'Relevant' ? '#e6f4ea' :
      cat === 'Vielleicht' ? '#fff8e1' :
      cat === 'Ignorieren' ? '#fce8e6' :
      '#ffffff';

    return new Array(lastCol).fill(color);
  });

  sheet.getRange(2, 1, backgrounds.length, lastCol).setBackgrounds(backgrounds);


  // QUICK FLAG formatting
  if (idx.quick_flag != null && lastRow > 1) {

    const qRange = sheet.getRange(2, idx.quick_flag + 1, lastRow - 1, 1);
    const values = qRange.getValues();

    const backgrounds = values.map(r => {
      return [String(r[0]).trim() ? '#dbeafe' : '#ffffff'];
    });

    qRange.setBackgrounds(backgrounds);
    qRange.setFontWeight('bold');
    qRange.setHorizontalAlignment('center');
  }

  rebuildConditionalFormatting_(sheet);

}














function formatCompactDate_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

function compactHitsForPdf_(hits, maxItems) {
  const limit = maxItems || 5;
  return String(hits || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}



function buildJobsPdfBlobFromRows_(rows, headers, maxJobs) {
  const limit = maxJobs || 30;
  const idx = indexMap_(headers);
  const selectedRows = rows.slice(0, limit);

  const doc = DocumentApp.create('Neue Jobs Report');
  const body = doc.getBody();

  body.clear();

  body.appendParagraph('Neue Jobs')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingAfter(4);

  body.appendParagraph(
    'Stand: ' + formatCompactDate_(new Date()) +
    ' · Neue Jobs: ' + selectedRows.length
  ).setFontSize(9).setForegroundColor('#666666');

  selectedRows.forEach((row, i) => {
    const title = String(row[idx.title] || '').trim();
    const employer = String(row[idx.employer] || '').trim();
    const location = String(row[idx.location] || '').trim();
    const workload = String(row[idx.percent_or_workload] || '').trim();
    const score = String(row[idx.score] || '').trim();
    const source = String(row[idx.source] || '').trim();
    const deadline = formatCompactDate_(row[idx.deadline]);
    const hits = compactHitsForPdf_(row[idx.positive_hits], 5);
    const url = String(row[idx.url] || '').trim();

    const metaParts = [];
    if (employer) metaParts.push(employer);
    if (location) metaParts.push(location);
    if (workload) metaParts.push(workload);
    if (score) metaParts.push('Score ' + score);
    if (source) metaParts.push(source);
    if (deadline) metaParts.push('Deadline ' + deadline);

    body.appendParagraph(title || '(Ohne Titel)')
      .setBold(true)
      .setFontSize(11);

    body.appendParagraph(metaParts.join(' · '))
      .setFontSize(9)
      .setForegroundColor('#444444');

    if (hits) {
      body.appendParagraph(hits)
        .setFontSize(8)
        .setForegroundColor('#666666');
    }

    if (url) {
      body.appendParagraph(url)
        .setFontSize(8)
        .setForegroundColor('#1155cc');
    }

    if (i < selectedRows.length - 1) {
      body.appendHorizontalRule();
    }
  });

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF).setName(
    'Neue-Jobs-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf'
  );

  file.setTrashed(true);
  return pdfBlob;
}


// *****************************************
// 2A. NEUE FUNKTIONEN 17.3.2026, NEUE DATENSTRUKTUR
// *****************************************

function onEdit(e) {
  try {
    handleEditableCockpitEdit_(e);
  } catch (err) {
    console.error('onEdit error', err);
  }
}

function handleEditableCockpitEdit_(e) {
  const range = e && e.range;
  if (!range) return;

  const sheet = range.getSheet();
  if (!sheet) return;

  const sheetName = sheet.getName();
  const allowedSheets = ['Jobs_Cockpit', 'Scoring_Cockpit'];
  if (!allowedSheets.includes(sheetName)) return;

  const row = range.getRow();
  const col = range.getColumn();

  if (row < 2) return;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const field = headers[col - 1];

  const editableFields = [
    'quick_flag',
    'application_status',
    'visibility_preference',
    'job_state',
    'notes',
    'manual_category',
    'manual_score_delta',
    'learn_from_feedback',
    'manual_title',
  ];

  if (!editableFields.includes(field)) return;

  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  if (uniqueKeyCol < 1) return;

  const uniqueKey = sheet.getRange(row, uniqueKeyCol).getValue();
  if (!uniqueKey) return;

  const newValue = sheet.getRange(row, col).getValue();

  upsertUserField_(uniqueKey, field, newValue);
}


function upsertUserField_(uniqueKey, field, value) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Jobs_User');
  if (!sheet) throw new Error('Sheet "Jobs_User" not found.');

  const data = sheet.getDataRange().getValues();
  if (!data || !data.length) throw new Error('Jobs_User is empty.');

  const headers = data[0];

  const keyIdx = headers.indexOf('unique_key');
  const fieldIdx = headers.indexOf(field);
  const updatedAtIdx = headers.indexOf('updated_at');
  const createdAtIdx = headers.indexOf('created_at');

  if (keyIdx === -1) throw new Error('Jobs_User missing column "unique_key".');
  if (fieldIdx === -1) throw new Error('Jobs_User missing column "' + field + '".');
  if (updatedAtIdx === -1) throw new Error('Jobs_User missing column "updated_at".');
  if (createdAtIdx === -1) throw new Error('Jobs_User missing column "created_at".');

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === uniqueKey) {
      rowIndex = i + 1;
      break;
    }
  }

  const now = new Date();

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, fieldIdx + 1).setValue(value);
    sheet.getRange(rowIndex, updatedAtIdx + 1).setValue(now);
  } else {
    const newRow = new Array(headers.length).fill('');
    newRow[keyIdx] = uniqueKey;
    newRow[fieldIdx] = value;
    newRow[createdAtIdx] = now;
    newRow[updatedAtIdx] = now;
    sheet.appendRow(newRow);
  }
}



function categoryFromNormalizedScore_(score) {
  if (score === '' || score === null || isNaN(score)) return '';

  if (score >= 10) return 'Relevant';
  if (score >= 0) return 'Vielleicht';
  return 'Ignorieren';
}



// *****************************************
// JOBS_COCKPIT
// *****************************************
function buildJobsCockpit() {
  buildJobsCockpit_()
}

function buildJobsCockpit_() {
  Logger.log('buildJobsCockpit_ START');

  const ss = SpreadsheetApp.getActive();
  const cockpitSheet = ss.getSheetByName('Jobs_Cockpit');

  const derived = buildDerivedJobViews_();

  const masterIdx = derived.masterIdx;

  const cockpitHeaders = [
    'new_flag',
    'quick_flag',
    'source',
    'location',
    'job_state',

    'title',
    'employer',
    'first_seen',
    'job_age',
    'deadline',
    'days_to_deadline',
    'url',

    'score_normalized',
    'final_score',
    'category',
    'final_category',

    'application_status',
    'visibility_preference',
    'manual_category',
    'manual_score_delta',
    'learn_from_feedback',
    'manual_title',
    'notes',

    'visibility_rank',
    'work_rank',
    'job_state_rank',
    'category_rank',
    'unique_key'
  ];

  const output = [cockpitHeaders];

  derived.rows.forEach(view => {
    const row = view.masterRow;

    const source = masterIdx.source != null ? (row[masterIdx.source] || '') : '';
    const location = masterIdx.location != null ? (row[masterIdx.location] || '') : '';
    const originalTitle = masterIdx.title != null ? (row[masterIdx.title] || '') : '';
    const employer = masterIdx.employer != null ? (row[masterIdx.employer] || '') : '';
    const deadline = masterIdx.deadline != null ? row[masterIdx.deadline] : '';
    const url = masterIdx.url != null ? (row[masterIdx.url] || '') : '';

    const mailDate = masterIdx.mail_date != null ? row[masterIdx.mail_date] : '';
    const firstSeenAt = masterIdx.first_seen_at != null ? row[masterIdx.first_seen_at] : '';
    const firstSeenDisplay = mailDate || firstSeenAt || '';

    const manualTitle = view.manual_title || '';
    const cleanManualTitle = manualTitle ? manualTitle.trim() : '';

    const displayTitle = cleanManualTitle
      ? cleanManualTitle + ' *'
      : originalTitle;

    output.push([
      '',
      view.quick_flag,
      source,
      location,
      view.job_state,

      displayTitle,
      employer,
      firstSeenDisplay,
      view.job_age,
      deadline,
      view.days_to_deadline,
      url,

      view.score_normalized,
      view.final_score,
      view.category,
      view.final_category,

      view.application_status,
      view.visibility_preference,
      view.manual_category,
      view.manual_score_delta,
      view.learn_from_feedback,
      manualTitle,
      view.notes,

      view.visibility_rank,
      view.work_rank,
      view.job_state_rank,
      view.category_rank,
      view.unique_key
    ]);
  });

  cockpitSheet.clearContents();
  cockpitSheet.getRange(1, 1, output.length, output[0].length).setValues(output);

  applyNewFlagFormulas_(cockpitSheet);
  sortJobsCockpit_(cockpitSheet);
  formatJobsCockpit_(cockpitSheet);

  Logger.log('buildJobsCockpit_ DONE');
}


function computeDerivedStatus_(statusOverride, applicationStatus, manualRating, deadline) {
  if (statusOverride) return statusOverride;

  const app = (applicationStatus || '').toLowerCase();

  // Bewerbungsstatus
  if (app === 'applied' || app === 'beworben') return 'applied';
  if (app === 'interview') return 'open';
  if (app === 'offer') return 'open';

  if (app === 'rejection' || app === 'absage') return 'rejected';
  if (app === 'done' || app === 'erledigt') return 'closed';

  // Deadline abgelaufen
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate) && deadlineDate < today) {
      return 'closed';
    }
  }

  // manuelle Ablehnung
  if (manualRating === 'low' || manualRating === 'reject') {
    return 'rejected';
  }

  return 'open';
}

//für sortierung
function computeWorkRank_(visibilityPreference, applicationStatus, jobState) {
  const vis = String(visibilityPreference || '').trim().toLowerCase();
  const app = String(applicationStatus || '').trim().toLowerCase();
  const state = String(jobState || '').trim().toLowerCase();

  // 🔴 Bucket 3 – ganz nach unten (User will ihn nicht sehen)
  if (vis === 'hidden') {
    return 3;
  }

  // 🟠 Bucket 2 – closed oder bereits bearbeitet (Bewerbung läuft / abgeschlossen)
  if (state === 'closed') {
    return 2;
  }

  if (app && app !== 'none') {
    return 2;
  }

  // 🟢 Bucket 1 – aktiver Fokus
  return 1;
}

function computeCategoryRank_(category) {
  switch (String(category || '').trim()) {
    case 'Relevant': return 1;
    case 'Vielleicht': return 2;
    case 'Ignorieren': return 3;
    default: return 4;
  }
}

function computeVisibilityRank_(visibilityPreference) {
  switch (String(visibilityPreference || '').trim().toLowerCase()) {
    case 'hidden': return 2;
    case 'active':
    case '':
      return 1;
    default:
      return 1;
  }
}


function computeJobState_(deadline) {
  if (!deadline) return 'open';

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'open';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d < today ? 'closed' : 'open';
}

function computeJobStateRank_(jobState) {
  switch (String(jobState || '').trim().toLowerCase()) {
    case 'closed': return 2;
    case 'open':
    case '':
      return 1;
    default:
      return 1;
  }
}







//sortierung cockpit
function sortJobsCockpit_(sheet) {
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];

const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
const workRankCol = headers.indexOf('work_rank') + 1;
const jobStateRankCol = headers.indexOf('job_state_rank') + 1;
const categoryRankCol = headers.indexOf('category_rank') + 1;
const scoreCol = headers.indexOf('final_score') + 1;
const daysCol = headers.indexOf('days_to_deadline') + 1;

  if (range.getNumRows() <= 1) return;

  const sortSpecs = [];

  if (visibilityRankCol > 0) {
    sortSpecs.push({ column: visibilityRankCol, ascending: true });
  }

  if (workRankCol > 0) {
    sortSpecs.push({ column: workRankCol, ascending: true });
  }


  if (jobStateRankCol > 0) {
    sortSpecs.push({ column: jobStateRankCol, ascending: true });
  }

  if (categoryRankCol > 0) {
    sortSpecs.push({ column: categoryRankCol, ascending: true });
  }

  if (scoreCol > 0) {
    sortSpecs.push({ column: scoreCol, ascending: false });
  }

  if (daysCol > 0) {
    sortSpecs.push({ column: daysCol, ascending: true });
  }

  range.offset(1, 0, range.getNumRows() - 1).sort(sortSpecs);
}



//derived functions for both cockpit and mail

//loads data and indices
function loadJobsAllAndUserContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const masterSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const userSheet = ss.getSheetByName(CONFIG.sheets.jobsUser);

  if (!masterSheet) throw new Error('Jobs_All fehlt.');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0] || [];
  const masterRows = masterData.slice(1);
  const masterIdx = indexMap_(masterHeaders);

  const userData = userSheet ? userSheet.getDataRange().getValues() : [];
  const userHeaders = userData.length ? userData[0] : [];
  const userRows = userData.length ? userData.slice(1) : [];
  const userIdx = indexMap_(userHeaders);

  const userMap = new Map();
  userRows.forEach(row => {
    const key = String(row[userIdx.unique_key] || '');
    if (key) userMap.set(key, row);
  });

  return {
    ss,
    masterSheet,
    userSheet,
    masterHeaders,
    masterRows,
    masterIdx,
    userHeaders,
    userRows,
    userIdx,
    userMap
  };
}


//translate master-row plus optional user-row into final view
//translate master-row plus optional user-row into final view
function buildDerivedJobViewRow_(masterRow, ctx) {
  const { masterIdx, userIdx, userMap } = ctx;

  const uniqueKey = String(masterRow[masterIdx.unique_key] || '');
  const userRow = userMap.get(uniqueKey) || [];

  // --- MASTER ---
  const rawScoreNormalized = masterIdx.score_normalized != null
    ? masterRow[masterIdx.score_normalized]
    : '';

  let scoreNormalized = 0;
  if (rawScoreNormalized instanceof Date) {
    const sheetEpoch = new Date(Date.UTC(1899, 11, 30));
    scoreNormalized = (rawScoreNormalized.getTime() - sheetEpoch.getTime()) / (1000 * 60 * 60 * 24);
  } else if (rawScoreNormalized !== '' && rawScoreNormalized !== null) {
    scoreNormalized = Number(rawScoreNormalized);
  }

  const category = masterIdx.category != null
    ? (masterRow[masterIdx.category] || '')
    : '';

  const mailDate = masterIdx.mail_date != null
    ? masterRow[masterIdx.mail_date]
    : '';

  const firstSeen = masterIdx.first_seen_at != null
    ? masterRow[masterIdx.first_seen_at]
    : '';

  const deadline = masterIdx.deadline != null
    ? masterRow[masterIdx.deadline]
    : '';

  // --- USER ---
  const manualScoreDelta = userIdx.manual_score_delta != null
    ? Number(userRow[userIdx.manual_score_delta] || 0)
    : 0;

  const manualCategory = userIdx.manual_category != null
    ? String(userRow[userIdx.manual_category] || '').trim()
    : '';

  const applicationStatus = userIdx.application_status != null
    ? String(userRow[userIdx.application_status] || '').trim()
    : '';

  const visibilityPreference = userIdx.visibility_preference != null
    ? String(userRow[userIdx.visibility_preference] || '').trim().toLowerCase()
    : 'active';

  const userJobState = userIdx.job_state != null
    ? String(userRow[userIdx.job_state] || '').trim().toLowerCase()
    : '';

  const quickFlag = userIdx.quick_flag != null
    ? String(userRow[userIdx.quick_flag] || '').trim()
    : '';

  const notes = userIdx.notes != null
    ? String(userRow[userIdx.notes] || '')
    : '';

  const learnFromFeedback = userIdx.learn_from_feedback != null
    ? String(userRow[userIdx.learn_from_feedback] || '').trim()
    : '';

  const manualTitle = userIdx.manual_title != null
    ? String(userRow[userIdx.manual_title] || '').trim()
    : '';

  // --- DERIVED: SCORE / CATEGORY ---
  const finalScore = scoreNormalized + manualScoreDelta;
  const finalCategory = manualCategory || categoryFromNormalizedScore_(finalScore);

  // --- DERIVED: JOB STATE ---
  const inferredJobState = computeJobState_(deadline);
  const jobState = userJobState || inferredJobState;

  // --- DERIVED: JOB AGE ---
  const today = new Date();
  let baseDate = mailDate || firstSeen;
  let jobAge = '';

  if (baseDate) {
    const diff = today - new Date(baseDate);
    jobAge = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // --- DERIVED: DEADLINE ---
  let daysToDeadline = '';

  if (deadline) {
    const todayClean = new Date();
    todayClean.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate)) {
      const diff = deadlineDate - todayClean;
      daysToDeadline = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
  }

  // --- DERIVED: RANKS ---
  const visibilityRank = computeVisibilityRank_(visibilityPreference);
  const jobStateRank = computeJobStateRank_(jobState);
  const categoryRank = computeCategoryRank_(finalCategory);
  const workRank = computeWorkRank_(visibilityPreference, applicationStatus, jobState, finalCategory);

  return {
    unique_key: uniqueKey,

    masterRow,
    userRow,

    // master passthrough
    score_normalized: scoreNormalized,
    category: category,

    // derived core
    final_score: finalScore,
    final_category: finalCategory,

    // user fields
    manual_score_delta: manualScoreDelta,
    manual_category: manualCategory,
    application_status: applicationStatus,
    visibility_preference: visibilityPreference,
    job_state: jobState,
    quick_flag: quickFlag,
    notes: notes,
    learn_from_feedback: learnFromFeedback,
    manual_title: manualTitle,

    // derived extras
    job_age: jobAge,
    days_to_deadline: daysToDeadline,

    // ranks
    visibility_rank: visibilityRank,
    job_state_rank: jobStateRank,
    category_rank: categoryRank,
    work_rank: workRank
  };
}





//loop over master rows
function buildDerivedJobViews_() {
  const ctx = loadJobsAllAndUserContext_();

  const rows = ctx.masterRows.map(masterRow => buildDerivedJobViewRow_(masterRow, ctx));

  return {
    ...ctx,
    rows
  };
}






function formatJobsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs_Cockpit');
  if (!sheet) throw new Error('Jobs_Cockpit sheet not found');
  formatJobsCockpit_(sheet);
}


function formatJobsCockpit_(sheet) {
  if (!sheet) {
    throw new Error('formatJobsCockpit_: sheet is undefined');
  }
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];
  const numRows = range.getNumRows();
  const numCols = headers.length;

  const headerRow = 1;
  const bodyRows = Math.max(numRows - 1, 0);

  const newCol = headers.indexOf('new_flag') + 1;
  const quickFlagCol = headers.indexOf('quick_flag') + 1;
  const sourceCol = headers.indexOf('source') + 1;
  const locationCol = headers.indexOf('location') + 1;
  const titleCol = headers.indexOf('title') + 1;
  const employerCol = headers.indexOf('employer') + 1;
  const firstSeenCol = headers.indexOf('first_seen') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;
  const deadlineCol = headers.indexOf('deadline') + 1;
  const daysCol = headers.indexOf('days_to_deadline') + 1;
  const urlCol = headers.indexOf('url') + 1;
  const appStatusCol = headers.indexOf('application_status') + 1;
  const visibilityPrefCol = headers.indexOf('visibility_preference') + 1;
  const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
  const manualCategoryCol = headers.indexOf('manual_category') + 1;
  const manualDeltaCol = headers.indexOf('manual_score_delta') + 1;
  const learnCol = headers.indexOf('learn_from_feedback') + 1;
  const manualTitleCol = headers.indexOf('manual_title') + 1;
  const notesCol = headers.indexOf('notes') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const finalScoreCol = headers.indexOf('final_score') + 1;
  const workRankCol = headers.indexOf('work_rank') + 1;
  const categoryRankCol = headers.indexOf('category_rank') + 1;
  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  const jobStateCol = headers.indexOf('job_state') + 1;
  const jobStateRankCol = headers.indexOf('job_state_rank') + 1;

  // --- Conditional rules sauber neu setzen ---
  sheet.clearConditionalFormatRules();

  // --- Freeze ---
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4); // new_flag, quick_flag, source, location

  // --- Filter ---
  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  if (numRows > 1 && numCols > 0) {
    sheet.getRange(1, 1, numRows, numCols).createFilter();
  }

  // --- Header ---
  const headerRange = sheet.getRange(headerRow, 1, 1, numCols);
  headerRange
    .setFontWeight('bold')
    .setWrap(false);

  // --- Grundformat Body ---
  if (bodyRows > 0) {
    const bodyRange = sheet.getRange(2, 1, bodyRows, numCols);
    bodyRange
      .setFontColor('black')
      .setFontWeight('normal')
      .setFontSize(10)
      .setWrap(false)
      .setBackground(null);
  }

  // --- Editierbare Spalten leicht einfärben ---
  const editableCols = [
    quickFlagCol,
    jobStateCol,
    appStatusCol,
    visibilityPrefCol,
    manualCategoryCol,
    manualDeltaCol,
    learnCol,
    manualTitleCol,
    notesCol
  ].filter(c => c > 0);

  editableCols.forEach(col => {
    if (bodyRows > 0) {
      sheet.getRange(2, col, bodyRows, 1).setBackground('#eef4ff');
    }
  });

  // --- Zahl-/Datumsformate ---
  if (firstSeenCol > 0 && bodyRows > 0) {
    sheet.getRange(2, firstSeenCol, bodyRows, 1).setNumberFormat('dd.mm.yyyy');
  }

  if (jobAgeCol > 0 && bodyRows > 0) {
    sheet.getRange(2, jobAgeCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0 && bodyRows > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (finalScoreCol > 0 && bodyRows > 0) {
    sheet.getRange(2, finalScoreCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (manualDeltaCol > 0 && bodyRows > 0) {
    sheet.getRange(2, manualDeltaCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (deadlineCol > 0 && bodyRows > 0) {
    sheet.getRange(2, deadlineCol, bodyRows, 1).setNumberFormat('dd.mm.yyyy');
  }

  if (daysCol > 0 && bodyRows > 0) {
    sheet.getRange(2, daysCol, bodyRows, 1).setNumberFormat('0');
  }

  // --- NEW-Spalte kleiner ---
  if (newCol > 0 && bodyRows > 0) {
    sheet.getRange(2, newCol, bodyRows, 1).setFontSize(9);
  }

  // --- Spaltenbreiten (pragmatisch) ---
  if (newCol > 0) sheet.setColumnWidth(newCol, 32);
  if (quickFlagCol > 0) sheet.setColumnWidth(quickFlagCol, 20);
  if (sourceCol > 0) sheet.setColumnWidth(sourceCol, 50);
  if (locationCol > 0) sheet.setColumnWidth(locationCol, 85);
  if (jobStateCol > 0) sheet.setColumnWidth(jobStateCol, 55);
  if (visibilityPrefCol > 0) sheet.setColumnWidth(visibilityPrefCol, 85);
  if (visibilityRankCol > 0) sheet.setColumnWidth(visibilityRankCol, 70);
  if (jobStateRankCol > 0) sheet.setColumnWidth(jobStateRankCol, 70);
  if (titleCol > 0) sheet.setColumnWidth(titleCol, 260);
  if (employerCol > 0) sheet.setColumnWidth(employerCol, 150);
  if (firstSeenCol > 0) sheet.setColumnWidth(firstSeenCol, 80);
  if (jobAgeCol > 0) sheet.setColumnWidth(jobAgeCol, 55);
  if (deadlineCol > 0) sheet.setColumnWidth(deadlineCol, 80);
  if (daysCol > 0) sheet.setColumnWidth(daysCol, 30);

  if (urlCol > 0) sheet.setColumnWidth(urlCol, 65);
  if (scoreNormCol > 0) sheet.setColumnWidth(scoreNormCol, 70);
  if (finalScoreCol > 0) sheet.setColumnWidth(finalScoreCol, 70);
  if (manualCategoryCol > 0) sheet.setColumnWidth(manualCategoryCol, 70);
  if (manualDeltaCol > 0) sheet.setColumnWidth(manualDeltaCol, 70);
  if (learnCol > 0) sheet.setColumnWidth(learnCol, 70);
  if (manualTitleCol > 0) sheet.setColumnWidth(manualTitleCol, 180);
  if (notesCol > 0) sheet.setColumnWidth(notesCol, 220);
  if (workRankCol > 0) sheet.setColumnWidth(workRankCol, 70);
  if (categoryRankCol > 0) sheet.setColumnWidth(categoryRankCol, 70);
  if (uniqueKeyCol > 0) sheet.setColumnWidth(uniqueKeyCol, 160);

  // --- Conditional formatting Regeln ---
  const rules = [];

  // NEW = rot + fett
  if (newCol > 0 && bodyRows > 0) {
    const newRange = sheet.getRange(2, newCol, bodyRows, 1);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('NEW')
        .setFontColor('#d93025')
        .setBold(true)
        .setRanges([newRange])
        .build()
    );
  }

  // Quick-Flag: A = rot, B = orange, ! = blau, X = grau
  if (quickFlagCol > 0 && bodyRows > 0) {
    const quickRange = sheet.getRange(2, quickFlagCol, bodyRows, 1);
    const qCol = columnToLetter_(quickFlagCol);

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="A"`)
        .setBackground('#8b0000')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="B"`)
        .setBackground('#f59e0b')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="!"`)
        .setBackground('#2563eb')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="X"`)
        .setBackground('#6b7280')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($${qCol}2<>"",$${qCol}2<>"A",$${qCol}2<>"B",$${qCol}2<>"!",$${qCol}2<>"X")`)
        .setBackground('#dbeafe')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );
  }

  // Ganze Zeile dimmen abhängig von job_state / application_status
  if (bodyRows > 0) {
    const fullBodyRange = sheet.getRange(2, 1, bodyRows, numCols);

    if (jobStateCol > 0) {
      const jobStateLetter = columnToLetter_(jobStateCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=$${jobStateLetter}2="closed"`)
          .setFontColor('#bbbbbb')
          .setRanges([fullBodyRange])
          .build()
      );
    }

    if (appStatusCol > 0) {
      const appStatusLetter = columnToLetter_(appStatusCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=AND($${appStatusLetter}2<>"",$${appStatusLetter}2<>"none")`)
          .setFontColor('#999999')
          .setRanges([fullBodyRange])
          .build()
      );
    }
  }

  if (visibilityPrefCol > 0 && bodyRows > 0) {
    const visRange = sheet.getRange(2, visibilityPrefCol, bodyRows, 1);
    const visLetter = columnToLetter_(visibilityPrefCol);

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${visLetter}2="hidden"`)
        .setBackground('#e5e7eb')
        .setFontColor('#374151')
        .setRanges([visRange])
        .build()
    );
  }

  // days_to_deadline: bald fällig / überfällig
  if (daysCol > 0 && bodyRows > 0) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThanOrEqualTo(3)
        .setBackground('#fdecea')
        .setRanges([sheet.getRange(2, daysCol, bodyRows, 1)])
        .build()
    );
  }

  sheet.setConditionalFormatRules(rules);
}



function applyNewFlagFormulas_(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const numRows = values.length;

  if (numRows < 2) return;

  const headers = values[0];

  const newCol = headers.indexOf('new_flag') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;

  if (newCol < 1 || jobAgeCol < 1) return;

  const jobAgeLetter = columnToLetter_(jobAgeCol);

  // Settings!B2 enthält new_threshold_days
  const formulas = [];
  for (let r = 2; r <= numRows; r++) {
    formulas.push([
      `=IF(AND(${jobAgeLetter}${r}<>"",${jobAgeLetter}${r}<=Settings!$B$2),"NEW","")`
    ]);
  }

  sheet.getRange(2, newCol, numRows - 1, 1).setFormulas(formulas);
}


function columnToLetter_(column) {
  let temp = '';
  let letter = '';

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}


function getSettingValue_(key, defaultValue) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return defaultValue;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return defaultValue;

  const headers = data[0];
  const keyIdx = headers.indexOf('key');
  const valueIdx = headers.indexOf('value');

  if (keyIdx === -1 || valueIdx === -1) return defaultValue;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === key) {
      const value = data[i][valueIdx];
      return value === '' || value === null ? defaultValue : value;
    }
  }

  return defaultValue;
}

// *****************************************
// SOURCE HEALTH
// *****************************************
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

    //delme
if (uniqueKey === 'b717c5829cf007a3ce85b30c536cfcea') {
  Logger.log(JSON.stringify({
    sample_unique_key: uniqueKey,
    raw_hard_reject_hit: row[mIdx.hard_reject_hit],
    raw_hard_reject_hits: row[mIdx.hard_reject_hits],
    title: row[mIdx.title],
    source: row[mIdx.source]
  }, null, 2));
}

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
function normalizeJobRecord_(job) {
  const scoring = scoreJobBySource_(job);
  const uniqueKey = buildUniqueKey_(
    job.source,
    job.title,
    job.employer,
    job.location,
    job.url,
    job.raw_source_id
  );

  const rowObj = {
    unique_key: uniqueKey,
    source: job.source || '',
    source_label: job.source_label || '',
    raw_source_id: job.raw_source_id || '',
    url: job.url || '',

    title: job.title || '',
    employer: job.employer || '',
    location: job.location || '',
    mail_date: asDateOrBlank_(job.mail_date),
    deadline: asDateOrBlank_(job.deadline),
    percent_or_workload: job.percent_or_workload || '',
    grade: job.grade || '',
    domain: job.domain || '',
    dg: job.dg || '',

    raw_snippet: job.raw_snippet || '',
    detail_text: job.detail_text || '',

    score: scoring.score,
    score_normalized: scoring.normalizedScore,
    category: scoring.category,
    positive_hits: scoring.positive.join(', '),
    negative_hits: scoring.negative.join(', '),
    hard_reject_hit: scoring.hardRejectHit || '',
    hard_reject_hits: (scoring.hardRejectHits || []).join(', '),

    first_seen_at: asDateOrBlank_(job.first_seen_at),
    last_seen_at: asDateOrBlank_(job.last_seen_at),
    notified_at: '',
    run_id: job.run_id || '',

    archived_at: '',
    archive_reason: '',
  };

  return JOBS_ALL_COLUMNS.map(col => rowObj[col] != null ? rowObj[col] : '');
}

function upsertJobsToAll_(newRows) {
  const idx = indexMap_(JOBS_ALL_COLUMNS);
  newRows = dedupeRowsByUniqueKey_(newRows, idx);

  if (!newRows.length) {
    return {
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt. Bitte setupJobSheets() ausführen.');

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

      // Preserve stable system/history fields
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

      // Preserve archive fields
      if (idx.archived_at != null && sheetIdx.archived_at != null) {
        newRow[idx.archived_at] =
          existing.row[sheetIdx.archived_at] || '';
      }

      if (idx.archive_reason != null && sheetIdx.archive_reason != null) {
        newRow[idx.archive_reason] =
          existing.row[sheetIdx.archive_reason] || '';
      }

      sheet.getRange(rowNumber, 1, 1, newRow.length).setValues([newRow]);
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


function appendNotifiedRows_(sheet, rows, idx, notifiedAt) {
  const out = rows.map(row => [
    row[idx.unique_key] || '',
    notifiedAt,
    row[idx.category] || '',
    row[idx.score] || '',
    row[idx.title] || '',
    row[idx.employer] || '',
    row[idx.location] || '',
    row[idx.url] || '',
    row[idx.source] || '',
  ]);

  if (!out.length) return;

  sheet.getRange(sheet.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
}

function stampNotifiedAtInJobsAll_(jobsSheet, relevantRows, relIdx, notifiedAt) {
  const data = jobsSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  const targetKeys = new Set(
    relevantRows.map(row => String(row[relIdx.unique_key] || '')).filter(Boolean)
  );

  if (!targetKeys.size) return;

  const notifiedCol = idx.notified_at;
  if (notifiedCol == null) {
    throw new Error('Column notified_at not found in Jobs_All');
  }

  const output = data.slice(1).map(row => {
    const key = String(row[idx.unique_key] || '');
    return [targetKeys.has(key) ? notifiedAt : row[notifiedCol]];
  });

Logger.log('notified_at col index: ' + notifiedCol);
Logger.log('header at notified_at col: ' + headers[notifiedCol]);

Logger.log('score_normalized col index: ' + idx.score_normalized);
Logger.log('header at score_normalized col: ' + headers[idx.score_normalized]);  

  jobsSheet
    .getRange(2, notifiedCol + 1, output.length, 1)
    .setValues(output);
}



function getNotifiedKeySet_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return new Set();
  const idx = indexMap_(data[0]);
  return new Set(data.slice(1).map(row => String(row[idx.unique_key] || '')).filter(Boolean));
}


function endOfDay_(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}


function formatDateForMail_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
}



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


function refreshLearningCache_() {
  LEARNING_CACHE = buildLearningProfile_();
}

function buildLearningProfile_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { tokenScores: {}, sourceScores: {} };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const tokenScores = {};
  const sourceScores = {};
  
  data.slice(1).forEach(row => {
    const manualRating = normalizeText_(row[idx.manual_rating] || '');
    const clicked = normalizeText_(row[idx.clicked_or_applied] || '');
    const source = String(row[idx.source] || '').toLowerCase();
    const text = [row[idx.title], row[idx.employer], row[idx.location]]
    .filter(Boolean)
    .join(' ');
    
    let weight = 0;
    
    if (manualRating === 'gut') weight += 4;
    else if (manualRating === 'vielleicht') weight += 1;
    else if (manualRating === 'nein') weight -= 5;
    
    if (clicked === 'ja' || clicked === 'yes' || clicked === 'applied' || clicked === 'clicked') {
      weight += 3;
    }
    
    if (!weight) return;
    
    const tokens = tokenizeForLearning_(text);
    
    tokens.forEach(token => {
      tokenScores[token] = (tokenScores[token] || 0) + weight;
    });
    
    if (source) {
      sourceScores[source] = (sourceScores[source] || 0) + Math.sign(weight);
    }
  });
  
  return { tokenScores, sourceScores };
}

function tokenizeForLearning_(text) {
  const stopwords = new Set([
  'und','oder','mit','der','die','das','für','fuer','von','im','in','am','an','auf','des','dem','den',
  'the','and','with','job','jobs','stelle','stellen','bereich','senior','junior','professional',
  'leiter','leiterin','mitarbeiter','mitarbeiterin','spezialist','spezialistin','manager','managerin',
  'bundesamt','bundesverwaltung','schweiz','bern','zuerich','wien','oebb','bundch','sbb', 'deutschschweiz', 'online', 'seit'
  ]);
  
  return [...new Set(
  normalizeText_(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .split(/\s+/)
  .filter(token => token && token.length >= 4 && !stopwords.has(token))
  )];
}

function getLearningAdjustment_(job) {
  const profile = LEARNING_CACHE || { tokenScores: {}, sourceScores: {} };
  const source = String(job.source || '').toLowerCase();
  const text = [job.title, job.employer, job.location]
  .filter(Boolean)
  .join(' ');
  const tokens = tokenizeForLearning_(text);
  
  let delta = 0;
  const positive = [];
  const negative = [];
  
  tokens.forEach(token => {
    const tokenScore = profile.tokenScores[token] || 0;
    if (!tokenScore) return;
    
    const contribution = Math.max(-3, Math.min(3, tokenScore));
    delta += contribution;
    
    if (contribution > 0) positive.push(`LEARN:${token}(+${contribution})`);
    if (contribution < 0) negative.push(`LEARN:${token}(${contribution})`);
  });
  
  if (profile.sourceScores[source]) {
    const sourceContribution = Math.max(-2, Math.min(2, profile.sourceScores[source]));
    delta += sourceContribution;
    
    if (sourceContribution > 0) positive.push(`LEARN:source(+${sourceContribution})`);
    if (sourceContribution < 0) negative.push(`LEARN:source(${sourceContribution})`);
  }
  
  delta = Math.max(-8, Math.min(8, delta));
  
  return {
    delta,
    positive: [...new Set(positive)].slice(0, 6),
    negative: [...new Set(negative)].slice(0, 6),
  };
}



