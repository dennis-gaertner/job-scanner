// scanners/ZRH.js — extracted without changing function implementations.

function isZrhMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('no-reply@prospective.ch')
  && /job-newsletter vom flughafen z/i.test(subject)
  && /jobs-karriere\.flughafen-zuerich\.ch\/offene-stellen\//i.test(html);
}




function extractZrhJobsFromHtml_(html) {
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
  
  const itemRegex = /<a[^>]*href="(https:\/\/jobs-karriere\.flughafen-zuerich\.ch\/offene-stellen\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?(?=<tr>\s*<td width="24"|<a class="button"|Du erhältst diese E-Mail|$)/gi;
  
  let match;
  while ((match = itemRegex.exec(cleaned)) !== null) {
    const block = match[0];
    
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    
    const descMatch = block.match(/<span class="shortdescription"[^>]*>([\s\S]*?)<\/span>/i);
    const description = descMatch ? htmlDecode_(stripHtml_(descMatch[1])) : '';
    
    const tagMatches = [...block.matchAll(/<span style="display:inline-block;[\s\S]*?>([\s\S]*?)<\/span>/gi)]
    .map(m => htmlDecode_(stripHtml_(m[1])))
    .map(s => s.trim())
    .filter(Boolean);
    
    const domain = tagMatches[0] || '';
    const grade = tagMatches[1] || '';
    const percent_or_workload = tagMatches[2] || '';
    
    jobs.push({
      title,
      location: '',
      employer: 'Flughafen Zürich AG',
      percent_or_workload,
      grade,
      domain,
      dg: '',
      description,
      url,
      rawSnippet: `${title} | ${domain} | ${grade} | ${percent_or_workload} | ${description}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanZrhJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.zrh;
  const messages = getMessagesForLabel_(labelName)
    .filter(isZrhMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.zrhLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractZrhJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'ZRH',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Flughafen Zürich AG',
        percent_or_workload: job.percent_or_workload || '',
        grade: job.grade || '',
        domain: job.domain || '',
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
    source: 'ZRH',
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
// AIRBUS
// *****************************************

