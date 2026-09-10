// core/text-and-dedupe.js — extracted without changing function implementations.

function normalizeText_(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlDecode_(text) {
  return String(text || '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&uuml;/g, 'ü')
  .replace(/&ouml;/g, 'ö')
  .replace(/&auml;/g, 'ä')
  .replace(/&szlig;/g, 'ß')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

function dedupeJobsByMiniKey_(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = [job.title, job.location, job.url].map(v => normalizeKeyPart_(v)).join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function dedupeRowsByUniqueKey_(rows, idx) {
  const seen = new Set();
  const result = [];

  rows.forEach(row => {
    const key = String(row[idx.unique_key] || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });

  return result;
}


function dedupeRowsForMail_(rows, idx) {
  const seen = new Set();
  const result = [];

  rows.forEach(row => {
    const key =
      String(row[idx.url] || '').trim() ||
      String(row[idx.unique_key] || '').trim() ||
      [
        row[idx.title] || '',
        row[idx.employer] || '',
        row[idx.location] || ''
      ].join('|');

    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(row);
  });

  return result;
}


// *****************************************
// 9b. WORKDAY-HELPER
// *****************************************

