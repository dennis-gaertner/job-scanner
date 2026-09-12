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
  return upsertJobRows_(newRows, () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
    if (!sheet) throw new Error('Jobs_All fehlt. Bitte setupJobSheets() ausführen.');
    return sheet;
  }, false);
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



