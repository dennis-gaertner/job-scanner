// core/sheet-utils.js — extracted without changing function implementations.

function assertSheetHeadersExact_(sheet, expectedHeaders) {
  if (!sheet) throw new Error('Sheet is missing');

  const lastCol = sheet.getLastColumn();
  const width = Math.max(lastCol, expectedHeaders.length);

  const actualHeaders = sheet.getRange(1, 1, 1, width).getValues()[0]
    .slice(0, expectedHeaders.length)
    .map(h => String(h || '').trim());

  const expected = expectedHeaders.map(h => String(h || '').trim());

  const sameLength = actualHeaders.length === expected.length;
  const sameValues = sameLength && expected.every((h, i) => actualHeaders[i] === h);

  if (!sameValues) {
    const diffs = [];
    for (let i = 0; i < expected.length; i++) {
      if (actualHeaders[i] !== expected[i]) {
        diffs.push(
          (i + 1) + ': expected="' + expected[i] + '" actual="' + (actualHeaders[i] || '') + '"'
        );
      }
      if (diffs.length >= 8) break;
    }

    throw new Error(
      'Header mismatch in sheet "' + sheet.getName() + '". ' +
      'Migration or manual repair required. ' +
      'Differences: ' + diffs.join(' | ')
    );
  }
}



function ensureSheetWithHeaders_(ss, name, headers) {
  if (!name || !String(name).trim()) {
    throw new Error('ensureSheetWithHeaders_: invalid sheet name: ' + name);
  }

  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  assertSheetHeadersExact_(sheet, headers);
}

function rewriteSheet_(sheet, allRows) {
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
}

function indexMap_(headers) {
  return headers.reduce((acc, h, i) => {
    acc[h] = i;
    return acc;
  }, {});
}

function asDateOrBlank_(value) {
  return value instanceof Date ? value : (value ? new Date(value) : '');
}

