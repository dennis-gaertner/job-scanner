// notifications/history.js — extracted without changing function implementations.

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


