function zzz_ADMIN_enrichExistingEuTitles() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All not found.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  ['source', 'title', 'domain', 'raw_source_id'].forEach(col => {
    if (idx[col] == null) {
      throw new Error('Jobs_All missing column "' + col + '".');
    }
  });

  let changed = 0;

  for (let r = 1; r < data.length; r++) {
    const source = String(data[r][idx.source] || '').trim();
    if (source !== 'EUCAREERS') continue;

    const oldTitle = String(data[r][idx.title] || '').trim();
    const domain = String(data[r][idx.domain] || '').trim();
    const rawSourceId = String(data[r][idx.raw_source_id] || '').trim();

    const newTitle = buildEuDisplayTitle_(oldTitle, domain, rawSourceId);

    if (newTitle && newTitle !== oldTitle) {
      sheet.getRange(r + 1, idx.title + 1).setValue(newTitle);
      changed++;
    }
  }

  Logger.log('EU titles enriched: ' + changed);
}


function zzz_ADMIN_cleanExistingJobTitlesHtmlDELME() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All not found.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  if (idx.title == null) throw new Error('Jobs_All missing title column.');

  let changed = 0;

  for (let r = 1; r < data.length; r++) {
    const oldTitle = data[r][idx.title];
    const newTitle = stripHtml_(oldTitle);

    if (String(oldTitle || '') !== String(newTitle || '')) {
      sheet.getRange(r + 1, idx.title + 1).setValue(newTitle);
      changed++;
    }
  }

  Logger.log('Cleaned existing Jobs_All titles: ' + changed);
}


function zzz_ADMIN_reorderJobsAllToCurrentSchema() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Diese Funktion sortiert Jobs_All neu, in Übereinstimmung mit JOBS_ALL_COLUMNS',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  reorderJobsAllToCurrentSchema_();
}

/**
 * Utility: Reorders Jobs_All to match JOBS_ALL_COLUMNS.
 * Safe to run after changing column order in JOBS_ALL_COLUMNS.
 * Not used in normal pipeline.
 */
function reorderJobsAllToCurrentSchema_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All not found');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length).setValues([JOBS_ALL_COLUMNS]);
    return;
  }

  const currentHeaders = data[0].map(h => String(h || '').trim());
  const currentIdx = indexMap_(currentHeaders);
  const rows = data.slice(1);

  const reorderedRows = rows.map(row => {
    return JOBS_ALL_COLUMNS.map(col => {
      const pos = currentIdx[col];
      return pos == null ? '' : row[pos];
    });
  });

  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length).setValues([JOBS_ALL_COLUMNS]);

  if (reorderedRows.length) {
    sheet.getRange(2, 1, reorderedRows.length, reorderedRows[0].length).setValues(reorderedRows);
  }

  formatSheetByCategory_(sheet);
}


function zzz_ADMIN_setupJobSheets() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  setupJobSheets_();
}






function zzz_ADMIN_resetNotifiedAll() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  resetNotifiedAll_();
}

function resetNotifiedAll_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);
  if (!sheet) return;
  sheet.clearContents();
  sheet.getRange(1, 1, 1, NOTIFIED_COLUMNS.length).setValues([NOTIFIED_COLUMNS]);
}


function zzz_ADMIN_hardResetAllJobData() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Diese Funktion löscht oder ersetzt grosse Teile der Jobdaten. Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  hardResetAllJobData_();
}


function hardResetAllJobData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const specs = [
  { name: CONFIG.sheets.jobsAll, headers: JOBS_ALL_COLUMNS },
  { name: CONFIG.sheets.notifiedAll, headers: NOTIFIED_COLUMNS },
  ];
  
  specs.forEach(spec => {
    const sheet = ss.getSheetByName(spec.name);
    if (!sheet) return;
    sheet.clearContents();
    sheet.clearFormats();
    sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
  });
  
  LEARNING_CACHE = null;
}





function zzz_ADMIN_purgeOldLowValueJobs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Diese Funktion entfernt Jobs dauerhaft aus der aktiven Liste. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  purgeOldLowValueJobs_();
}




function purgeOldLowValueJobs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol <= 0) return;

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = data.slice(1).filter(row => {
    const uniqueKey = idx.unique_key != null ? String(row[idx.unique_key] || '').trim() : '';
    const title = idx.title != null ? String(row[idx.title] || '').trim() : '';
    const url = idx.url != null ? String(row[idx.url] || '').trim() : '';
    const source = idx.source != null ? String(row[idx.source] || '').trim() : '';
    return !!(uniqueKey || title || url || source);
  });

  const keptRows = rows.filter(row => {
    const category = String(row[idx.category] || '');
    const mailDate = row[idx.mail_date] instanceof Date ? row[idx.mail_date] : new Date(row[idx.mail_date]);
    const isOld = mailDate < daysAgo_(CONFIG.recency.staleIrrelevantDays);

    if (category === 'Relevant') return true;
    if (category === 'Vielleicht' && !isOld) return true;
    if (category === 'Ignorieren' && !isOld) return true;

    return false;
  });

  keptRows.forEach(row => {
    if (idx.new_flag != null) row[idx.new_flag] = '';
  });

  rewriteSheet_(sheet, [headers].concat(keptRows));
  ensureNewFlagFormulaJobsAll_();
  //buildRelevantViewAll();
  formatAllSheets();
}


function zzz_ADMIN_rebuildScoresFromManualFeedback() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Gefährlicher Lauf',
    'Diese Funktion bewertet alle Jobs neu und überschreibt berechnete Felder in Jobs_All. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  rebuildScoresFromManualFeedback_();
}


function rebuildScoresFromManualFeedback_() {
  Logger.log('Running rebuildScoresFromManualFeedback on ' + new Date());
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  refreshLearningCache_();

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  if (headers.length !== JOBS_ALL_COLUMNS.length) {
    throw new Error(
      `Header length mismatch: sheet has ${headers.length} columns, ` +
      `JOBS_ALL_COLUMNS has ${JOBS_ALL_COLUMNS.length}. Aborting rebuild.`
    );
  }

  for (let i = 0; i < JOBS_ALL_COLUMNS.length; i++) {
    if (headers[i] !== JOBS_ALL_COLUMNS[i]) {
      throw new Error(
        `Header mismatch at column ${i + 1}: sheet='${headers[i]}', expected='${JOBS_ALL_COLUMNS[i]}'.`
      );
    }
  }


  const updatedRows = rows.map(row => {
    const job = {
      source: row[idx.source],
      source_label: row[idx.source_label],
      mail_date: row[idx.mail_date],
      deadline: row[idx.deadline],
      first_seen_at: row[idx.first_seen_at],
      last_seen_at: row[idx.last_seen_at],
      gmail_message_id: row[idx.gmail_message_id],
      gmail_thread_id: row[idx.gmail_thread_id],
      title: row[idx.title],
      location: row[idx.location],
      employer: row[idx.employer],
      percent_or_workload: row[idx.percent_or_workload],
      grade: row[idx.grade],
      domain: row[idx.domain],
      dg: row[idx.dg],
      url: row[idx.url],
      raw_snippet: row[idx.raw_snippet],
      detail_text: row[idx.detail_text],
      raw_source_id: row[idx.raw_source_id],
    };

    const rescored = normalizeJobRecord_(job);

    [
      'quick_flag',
      'first_seen_at',
      'unique_key',
      'notified_at',
      'application_status',
      'status',
      'manual_category_override',
      'manual_score_delta',
      'learn_from_feedback',
      'notes',
      'feedback_learned_at',
      'feedback_learning_version',
      'archived_at',
      'archive_reason',
      'archive_batch_id',
      'archived_by'
    ].forEach(col => {
      if (idx[col] != null) rescored[idx[col]] = row[idx[col]];
    });

    if (idx.new_flag != null) {
      rescored[idx.new_flag] = '';
    }

    rescored[idx.last_seen_at] = new Date();

    return rescored;
  });

  if (!updatedRows.length) return;

  const expectedLen = JOBS_ALL_COLUMNS.length;

  const badRowIndex = updatedRows.findIndex(
    r => !Array.isArray(r) || r.length !== expectedLen
  );

  if (badRowIndex !== -1) {
    throw new Error(
      `Row ${badRowIndex + 2} has length ${updatedRows[badRowIndex]?.length}, expected ${expectedLen}. Aborting rebuild.`
    );
  }

  sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
  ensureNewFlagFormulaJobsAll_();
  //buildRelevantViewAll();
  formatAllSheets();
}