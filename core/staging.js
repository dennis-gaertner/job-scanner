/**
 * Stages collected jobs without scoring or updating Jobs_All.
 *
 * Uses the existing JOBS_ALL_COLUMNS schema for compatibility,
 * leaving scoring and notification fields empty.
 */
function stageJobRecords_(sheetName, jobs) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(ss.getNumSheets());

    sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length)
        .setValues([JOBS_ALL_COLUMNS]);
    }

  const headers = sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length)
    .getValues()[0];

  if (JSON.stringify(headers) !== JSON.stringify(JOBS_ALL_COLUMNS)) {
    throw new Error('Invalid staging schema: ' + sheetName);
  }

  const rows = jobs.map(job => {
    const canonical = buildCanonicalJob_(job);

    const record = {
      ...canonical,
      unique_key: buildUniqueKey_(
        canonical.source,
        canonical.title,
        canonical.employer,
        canonical.location,
        canonical.url,
        canonical.raw_source_id
      ),
      mail_date: asDateOrBlank_(canonical.mail_date),
      deadline: asDateOrBlank_(canonical.deadline),
      first_seen_at: asDateOrBlank_(canonical.first_seen_at),
      last_seen_at: asDateOrBlank_(canonical.last_seen_at)
    };

    return JOBS_ALL_COLUMNS.map(col =>
      record[col] != null ? record[col] : ''
    );
  });

  return upsertJobRows_(rows, () => sheet, false);
}