// notifications/pdf.js — extracted without changing function implementations.

function formatCompactDate_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

function compactHitsForPdf_(hits, maxItems) {
  const limit = maxItems || 5;
  return String(hits || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}



function buildJobsPdfBlobFromRows_(rows, headers, maxJobs) {
  const limit = maxJobs || 30;
  const idx = indexMap_(headers);
  const selectedRows = rows.slice(0, limit);

  const doc = DocumentApp.create('Neue Jobs Report');
  const body = doc.getBody();

  body.clear();

  body.appendParagraph('Neue Jobs')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingAfter(4);

  body.appendParagraph(
    'Stand: ' + formatCompactDate_(new Date()) +
    ' · Neue Jobs: ' + selectedRows.length
  ).setFontSize(9).setForegroundColor('#666666');

  selectedRows.forEach((row, i) => {
    const title = String(row[idx.title] || '').trim();
    const employer = String(row[idx.employer] || '').trim();
    const location = String(row[idx.location] || '').trim();
    const workload = String(row[idx.percent_or_workload] || '').trim();
    const score = String(row[idx.score] || '').trim();
    const source = String(row[idx.source] || '').trim();
    const deadline = formatCompactDate_(row[idx.deadline]);
    const hits = compactHitsForPdf_(row[idx.positive_hits], 5);
    const url = String(row[idx.url] || '').trim();

    const metaParts = [];
    if (employer) metaParts.push(employer);
    if (location) metaParts.push(location);
    if (workload) metaParts.push(workload);
    if (score) metaParts.push('Score ' + score);
    if (source) metaParts.push(source);
    if (deadline) metaParts.push('Deadline ' + deadline);

    body.appendParagraph(title || '(Ohne Titel)')
      .setBold(true)
      .setFontSize(11);

    body.appendParagraph(metaParts.join(' · '))
      .setFontSize(9)
      .setForegroundColor('#444444');

    if (hits) {
      body.appendParagraph(hits)
        .setFontSize(8)
        .setForegroundColor('#666666');
    }

    if (url) {
      body.appendParagraph(url)
        .setFontSize(8)
        .setForegroundColor('#1155cc');
    }

    if (i < selectedRows.length - 1) {
      body.appendHorizontalRule();
    }
  });

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF).setName(
    'Neue-Jobs-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf'
  );

  file.setTrashed(true);
  return pdfBlob;
}


// *****************************************
// 2A. NEUE FUNKTIONEN 17.3.2026, NEUE DATENSTRUKTUR
// *****************************************

