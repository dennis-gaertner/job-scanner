/**
 * Generic staging -> Jobs_All importer.
 *
 * Only explicitly requested staging sheets are imported. No scanner calls,
 * notifications, cockpit rebuilds, archiving, or changes to staging sheets.
 * Existing Jobs_All history fields are preserved by upsertJobsToAll_().
 */
function prepareStagedSourceImport_(stageSheetName, expectedSource) {
  if (!stageSheetName || !/^Stage_[A-Za-z0-9_-]+$/.test(stageSheetName)) {
    throw new Error('Invalid staging sheet name: ' + stageSheetName);
  }
  if (!expectedSource || !String(expectedSource).trim()) {
    throw new Error('Expected source must be specified');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stage = ss.getSheetByName(stageSheetName);
  if (!stage) throw new Error('Missing staging sheet: ' + stageSheetName);
  const master = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!master) throw new Error('Missing Jobs_All sheet');

  assertSheetHeadersExact_(stage, JOBS_ALL_COLUMNS);
  assertSheetHeadersExact_(master, JOBS_ALL_COLUMNS);

  const idx = indexMap_(JOBS_ALL_COLUMNS);
  const stagedData = stage.getDataRange().getValues();
  const jobs = [];

  stagedData.slice(1).forEach((row, offset) => {
    if (row.every(v => v === '' || v === null)) return;

    const actualSource = String(row[idx.source] || '');
    if (actualSource !== expectedSource) {
      throw new Error(stageSheetName + ' row ' + (offset + 2) +
        ': expected source ' + expectedSource + ', got ' + actualSource);
    }

    const job = buildCanonicalJob_(Object.fromEntries(
      JOBS_ALL_COLUMNS.map((column, i) => [column, row[i]])
    ));
    const expectedKey = buildUniqueKey_(job.source, job.title,
      job.employer, job.location, job.url, job.raw_source_id);
    const storedKey = String(row[idx.unique_key] || '');
    if (!storedKey || storedKey !== expectedKey) {
      throw new Error(stageSheetName + ' row ' + (offset + 2) +
        ': unique_key mismatch');
    }
    jobs.push(job);
  });

  const scoredRows = dedupeRowsByUniqueKey_(jobs.map(normalizeJobRecord_), idx);
  const masterData = master.getDataRange().getValues();
  const existingKeys = new Map();
  for (let i = 1; i < masterData.length; i++) {
    const key = String(masterData[i][idx.unique_key] || '');
    if (key) existingKeys.set(key, masterData[i]);
  }

  let newJobs = 0;
  let existingJobs = 0;
  let existingNotified = 0;
  scoredRows.forEach(row => {
    const key = String(row[idx.unique_key] || '');
    if (!key) throw new Error('Scored staging row is missing unique_key');
    const previous = existingKeys.get(key);
    if (previous) {
      existingJobs++;
      if (previous[idx.notified_at]) existingNotified++;
    } else {
      newJobs++;
    }
  });

  return {
    scoredRows,
    summary: {
      staging_sheet: stageSheetName,
      source: expectedSource,
      stage_rows: jobs.length,
      unique_jobs: scoredRows.length,
      new_jobs: newJobs,
      existing_jobs: existingJobs,
      existing_notified_at_to_preserve: existingNotified
    }
  };
}

/** Read-only validation and counts for one explicitly named source. */
function previewStagedSourceImport(stageSheetName, expectedSource) {
  const prepared = prepareStagedSourceImport_(stageSheetName, expectedSource);
  Logger.log('Staging import preview: ' + JSON.stringify(prepared.summary));
  return prepared.summary;
}

/**
 * Upsert one explicitly named source into Jobs_All.
 * WARNING: This is a real production write; preview before running.
 */
function importStagedSourceToJobsAll(stageSheetName, expectedSource) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const prepared = prepareStagedSourceImport_(stageSheetName, expectedSource);
    if (!prepared.scoredRows.length) {
      Logger.log('Staging import: no rows for ' + stageSheetName);
      return { jobs_upserted: 0, new_jobs: 0, updated_jobs: 0 };
    }

    const stats = upsertJobsToAll_(prepared.scoredRows);
    if (stats.new_jobs !== prepared.summary.new_jobs ||
        stats.updated_jobs !== prepared.summary.existing_jobs) {
      throw new Error('Staging import count mismatch for ' + stageSheetName +
        ': expected ' + JSON.stringify(prepared.summary) +
        ', got ' + JSON.stringify(stats));
    }
    Logger.log('Staging import: ' + JSON.stringify({
      sheet: stageSheetName, source: expectedSource, stats
    }));
    return stats;
  } finally {
    lock.releaseLock();
  }
}

// Apps Script editor entry points for the tested pilot source.
function previewGenericBundAtImport() {
  return previewStagedSourceImport('Stage_BundAT', 'BundAT');
}
function importGenericBundAtToJobsAll() {
  return importStagedSourceToJobsAll('Stage_BundAT', 'BundAT');
}
