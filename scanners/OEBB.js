// scanners/OEBB.js — extracted without changing function implementations.

function isOebbMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return /oebb\.csod\.com/i.test(html)
  || /oebb\.csod\.com/i.test(plain)
  || /job-alert@oebb\.recruitmail\.com/i.test(from);
}


function extractOebbJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const regex = /<p[^>]*font-weight:700[^>]*>([^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>[\s\S]*?<a[^>]*href=['"](https:\/\/oebb\.csod\.com\/[^'"]+)['"]/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      title: htmlDecode_(match[1].trim()),
      location: htmlDecode_(match[2].trim()),
      url: htmlDecode_(match[3].trim()),
      rawSnippet: `${match[1]} | ${match[2]}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanOebbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.oebb;
  const messages = getMessagesForLabel_(labelName)
    .filter(isOebbMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.oebbLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractOebbJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'OEBB',
        source_label: labelName,
        mail_date: mailDate,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: 'ÖBB',
        percent_or_workload: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: message.getId(),
        run_id: runId,
      }));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'OEBB',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// SBB
// *****************************************


