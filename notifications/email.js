// notifications/email.js — extracted without changing function implementations.

function buildScanSummarySinceLastMail_(runId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) return '';

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return '';

  const headers = data[0];
  const rows = data.slice(1);
  const idx = indexMap_(headers);

  let lastMailAt = null;

  rows.forEach(row => {
    const notifiedAt = row[idx.notified_at];
    if (notifiedAt instanceof Date && !isNaN(notifiedAt.getTime())) {
      if (!lastMailAt || notifiedAt > lastMailAt) {
        lastMailAt = notifiedAt;
      }
    }
  });

  const newRows = rows.filter(row => {
    const firstSeenAt = row[idx.first_seen_at];

    if (!(firstSeenAt instanceof Date) || isNaN(firstSeenAt.getTime())) {
      return false;
    }

    if (lastMailAt) {
      return firstSeenAt > lastMailAt;
    }

    return runId
      ? String(row[idx.run_id] || '') === String(runId)
      : false;
  });

  if (!newRows.length) return '';

  const grouped = {};

  newRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    const category = String(row[idx.category] || 'Ignorieren');

    if (!grouped[source]) {
      grouped[source] = {
        total: 0,
        relevant: 0,
        maybe: 0,
        ignore: 0
      };
    }

    grouped[source].total++;

    if (category === 'Relevant') grouped[source].relevant++;
    else if (category === 'Vielleicht') grouped[source].maybe++;
    else grouped[source].ignore++;
  });

  let total = 0;
  let totalRelevant = 0;
  let totalMaybe = 0;
  let totalIgnore = 0;

  let out = 'SCAN SUMMARY (seit letzter Mail)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const g = grouped[source];

    total += g.total;
    totalRelevant += g.relevant;
    totalMaybe += g.maybe;
    totalIgnore += g.ignore;

    out +=
      source.padEnd(12) +
      ` neu:${g.total} | ` +
      `rel:${g.relevant} maybe:${g.maybe} ign:${g.ignore}\n`;
  });

  out += '\n';
  out +=
    'GESAMT'.padEnd(12) +
    ` neu:${total} | ` +
    `rel:${totalRelevant} maybe:${totalMaybe} ign:${totalIgnore}\n\n`;

  return out;
}







function emailNewRelevantJobs(runId) {
  runId = runId || '';

  const derived = buildDerivedJobViews_();
  const ss = derived.ss;
  const jobsSheet = derived.masterSheet;
  const notifiedSheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);

  if (!jobsSheet) throw new Error('Bitte zuerst setupJobSheets() ausführen.');
  if (!derived.masterRows.length) return;

  const jobsHeaders = derived.masterHeaders;
  const jobsIdx = derived.masterIdx;

  const derivedByKey = new Map();
  derived.rows.forEach(view => {
    if (view.unique_key) derivedByKey.set(view.unique_key, view);
  });

  const newRecommendedViews = selectJobsForNotification_(derived.rows, jobsIdx);

  const newRecommendedMasterRows = newRecommendedViews.map(view => view.masterRow);
  const newRecommendedRowsDedup = dedupeRowsForMail_(newRecommendedMasterRows, jobsIdx);


  //sort jobs

  newRecommendedRowsDedup.sort((a, b) => {
    const keyA = jobsIdx.unique_key != null ? String(a[jobsIdx.unique_key] || '') : '';
    const keyB = jobsIdx.unique_key != null ? String(b[jobsIdx.unique_key] || '') : '';

    const viewA = derivedByKey.get(keyA);
    const viewB = derivedByKey.get(keyB);

    const scoreA = viewA ? Number(viewA.final_score || 0) : 0;
    const scoreB = viewB ? Number(viewB.final_score || 0) : 0;

    if (scoreB !== scoreA) return scoreB - scoreA;

    const deadlineA = jobsIdx.deadline != null && a[jobsIdx.deadline]
      ? new Date(a[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    const deadlineB = jobsIdx.deadline != null && b[jobsIdx.deadline]
      ? new Date(b[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    return deadlineA - deadlineB;
  });

  const newIgnoredViews = (CONFIG.debugMail && CONFIG.debugMail.includeIgnoredJobs)
    ? derived.rows.filter(view => {
        const notifiedAt = jobsIdx.notified_at != null
          ? view.masterRow[jobsIdx.notified_at]
          : '';

        return (
          view.final_category === 'Ignorieren' &&
          !notifiedAt &&
          view.visibility_preference !== 'hidden' &&
          view.job_state !== 'closed'
        );
      })
    : [];

  const newIgnoredRows = newIgnoredViews.map(view => view.masterRow);

  if (!newRecommendedRowsDedup.length && !newIgnoredRows.length) return;

  const relevant = [];
  const maybe = [];

  newRecommendedRowsDedup.forEach(row => {
    const uniqueKey = jobsIdx.unique_key != null ? String(row[jobsIdx.unique_key] || '') : '';
    const view = derivedByKey.get(uniqueKey);

    const metaParts = [];

    if (jobsIdx.percent_or_workload != null && row[jobsIdx.percent_or_workload]) {
      metaParts.push(row[jobsIdx.percent_or_workload]);
    }
    if (jobsIdx.grade != null && row[jobsIdx.grade]) {
      metaParts.push(row[jobsIdx.grade]);
    }
    if (jobsIdx.employer != null && row[jobsIdx.employer]) {
      metaParts.push(row[jobsIdx.employer]);
    }
    if (jobsIdx.source != null && row[jobsIdx.source]) {
      metaParts.push(row[jobsIdx.source]);
    }
    if (jobsIdx.location != null && row[jobsIdx.location]) {
      metaParts.push(row[jobsIdx.location]);
    }
    if (jobsIdx.domain != null && row[jobsIdx.domain]) {
      metaParts.push(`Domain: ${row[jobsIdx.domain]}`);
    }
    if (jobsIdx.dg != null && row[jobsIdx.dg]) {
      metaParts.push(`DG: ${row[jobsIdx.dg]}`);
    }
    if (jobsIdx.deadline != null && row[jobsIdx.deadline]) {
      metaParts.push(`Deadline: ${formatDateForMail_(row[jobsIdx.deadline])}`);
    }

    const finalScore = view ? view.final_score : '';
    const finalCategory = view ? view.final_category : '';

    const line = [
      `• ${jobsIdx.title != null ? (row[jobsIdx.title] || 'Ohne Titel') : 'Ohne Titel'}`,
      `  ${metaParts.join(' | ')}`,
      `  Score: ${finalScore}`,
      `  ${jobsIdx.url != null ? (row[jobsIdx.url] || '') : ''}`,
    ].join('\n');

    if (finalCategory === 'Relevant') relevant.push(line);
    if (finalCategory === 'Vielleicht') maybe.push(line);
  });

  const sheetUrl = ss.getUrl() + '#gid=' + jobsSheet.getSheetId();

  let body = 'Neue gefilterte Job-Übersicht\n\n';
  body += buildScanSummarySinceLastMail_(runId);
  body += 'Übersicht im Sheet:\n' + sheetUrl + '\n\n';

  if (relevant.length) {
    body += 'RELEVANT\n\n' + relevant.join('\n\n') + '\n\n';
  }

  if (maybe.length) {
    body += 'VIELLEICHT\n\n' + maybe.join('\n\n') + '\n\n';
  }

  body += '---\nAutomatisch generiert.\n\n\n';

  const pdfBlob = newRecommendedRowsDedup.length
    ? buildJobsPdfBlobFromRows_(newRecommendedRowsDedup, jobsHeaders, 30)
    : null;

  const mailOptions = {};
  if (pdfBlob) {
    mailOptions.attachments = [pdfBlob];
  }

  const ignoredDebugSection = buildIgnoredJobsDebugSectionFromRows_(newIgnoredRows, jobsHeaders);
  if (ignoredDebugSection) {
    body += ignoredDebugSection + '\n';
  }

  GmailApp.sendEmail(
    CONFIG.notification.recipient,
    `${CONFIG.notification.subjectPrefix} ${newRecommendedRowsDedup.length} neue Jobs`,
    body,
    mailOptions
  );

  const now = new Date();
  const allSentRows = newRecommendedRowsDedup.concat(newIgnoredRows);

  try {
    if (notifiedSheet && newRecommendedRowsDedup.length) {
      appendNotifiedRows_(notifiedSheet, newRecommendedRowsDedup, jobsIdx, now);
    } else {
      Logger.log('appendNotifiedRows_ skipped: notifiedSheet=' + !!notifiedSheet + ', rows=' + newRecommendedRowsDedup.length);
    }
  } catch (e) {
    Logger.log('appendNotifiedRows_ failed: ' + e);
  }

  try {
    if (allSentRows.length) {
      stampNotifiedAtInJobsAll_(jobsSheet, allSentRows, jobsIdx, now);
    } else {
      Logger.log('stampNotifiedAtInJobsAll_ skipped: no rows');
    }
  } catch (e) {
    Logger.log('stampNotifiedAtInJobsAll_ failed: ' + e);
  }
}


function selectJobsForNotification_(derivedRows, jobsIdx) {
  return derivedRows.filter(view => {
    const notifiedAt = jobsIdx.notified_at != null
      ? view.masterRow[jobsIdx.notified_at]
      : '';

    return (
      (view.final_category === 'Relevant' || view.final_category === 'Vielleicht') &&
      !notifiedAt &&
      view.visibility_preference !== 'hidden' &&
      view.job_state !== 'closed'
    );
  });
}



//builds list of ignored jobs for mail (for debug purposes)
function buildIgnoredJobsDebugSectionFromRows_(rows, headers) {
  if (!CONFIG.debugMail || !CONFIG.debugMail.includeIgnoredJobs) return '';

  const idx = indexMap_(headers);
  const maxPerSource = CONFIG.debugMail.maxIgnoredPerSource || 15;

  const ignoredRows = rows.filter(row => String(row[idx.category] || '') === 'Ignorieren');
  if (!ignoredRows.length) return '';

  const grouped = {};

  ignoredRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    if (!grouped[source]) grouped[source] = [];
    grouped[source].push(row);
  });

  let out = 'IGNORIEREN (Debug)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const rowsForSource = grouped[source]
      .slice()
      .sort((a, b) => Number(b[idx.score] || 0) - Number(a[idx.score] || 0))
      .slice(0, maxPerSource);

    out += '[' + source + ']\n\n';

    rowsForSource.forEach(row => {
      const metaParts = [];
      if (row[idx.location]) metaParts.push(row[idx.location]);
      if (row[idx.employer]) metaParts.push(row[idx.employer]);

      out += '• ' + (row[idx.title] || 'Ohne Titel') + '\n';
      if (metaParts.length) out += '  ' + metaParts.join(' | ') + '\n';
      out += '  Score: ' + String(row[idx.score] ?? '') + '\n';

      if (row[idx.positive_hits]) out += '  + ' + row[idx.positive_hits] + '\n';
      if (row[idx.negative_hits]) out += '  - ' + row[idx.negative_hits] + '\n';
      if (row[idx.url]) out += '  ' + row[idx.url] + '\n';

      out += '\n';
    });
  });

  return out;
}



//outdated, doesn't fit current content anymore
