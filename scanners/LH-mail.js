// scanners/LH-mail.js — extracted without changing function implementations.

function isLhMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('career@services.dlh.de')
  || from.includes('@services.dlh.de')
  || /apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=/i.test(html)
  || /apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=/i.test(plain);
}


function extractLhJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&uuml;/gi, 'ü')
  .replace(/&auml;/gi, 'ä')
  .replace(/&szlig;/gi, 'ß')
  .replace(/&amp;/gi, '&');
  
  const regex = /\d+\.\s*<a href="(https:\/\/apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=\d+)"[^>]*>([^<]+)<\/a>\s*<br \/?>\s*&nbsp;&nbsp;Gesellschaft:\s*([^<]+)\s*<br \/?>\s*&nbsp;&nbsp;Standort:\s*([^<]+)\s*<br/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      url: htmlDecode_(match[1].trim()),
      title: htmlDecode_(match[2].trim()),
      employer: htmlDecode_(match[3].trim()),
      location: htmlDecode_(match[4].trim()),
      rawSnippet: `${match[2]} | ${match[3]} | ${match[4]}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}



function scanLhJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.lh;
  const messages = getMessagesForLabel_(labelName)
    .filter(isLhMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.lhLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractLhJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'LH',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: message.getId(),
        run_id: runId,
      }));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  return {
    source: 'LH',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    ...buildScanStats_(rows, upsertStats, idx),
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// ZRH
// *****************************************

