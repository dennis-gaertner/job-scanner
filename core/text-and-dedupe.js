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
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, entity) => {
      const hex = entity.toLowerCase().startsWith('x');
      const code = parseInt(hex ? entity.slice(1) : entity, hex ? 16 : 10);
      return code > 0 && code <= 0x10FFFF
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&auml;/gi, 'ä')
    .replace(/&szlig;/gi, 'ß')
    .replace(/&nbsp;/gi, ' ')
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

