// core/job-store.js — extracted without changing function implementations.

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



function deleteJobsBySource_(source) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const rowsToKeep = [headers];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSource = String(row[idx.source] || '');

    if (rowSource !== source) {
      rowsToKeep.push(row);
    }
  }

  sheet.clearContents();
  sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length)
    .setValues(rowsToKeep);
}



