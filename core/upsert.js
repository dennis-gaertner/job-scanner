/**
 * Shared storage implementation for production and test job sheets.
 * Resolves the destination only after deduplication and the empty-input check.
 * Preserves existing merge precedence, input-row mutation, write order and totals.
 * Test destinations retain their existing warning for updated rows without a URL.
 */
function upsertJobRows_(newRows, resolveSheet, warnOnEmptyUrl) {
  const idx = indexMap_(JOBS_ALL_COLUMNS);
  newRows = dedupeRowsByUniqueKey_(newRows, idx);

  if (!newRows.length) {
    return {
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0
    };
  }

  const sheet = resolveSheet();

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
      if (warnOnEmptyUrl && !newRow[idx.url]) {
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
