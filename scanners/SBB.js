// scanners/SBB.js — extracted without changing function implementations.

function isSbbMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('no-reply@hrs.sbb.ch')
  || from.includes('@hrs.sbb.ch')
  || /jobs\.sbb\.ch\/v2\/offene-stellen\//i.test(html)
  || /jobs\.sbb\.ch\/v2\/offene-stellen\//i.test(plain);
}



function extractSbbJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const blockRegex = /<a class="job-title"[^>]*href="(https:\/\/jobs\.sbb\.ch\/v2\/offene-stellen\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>\s*([^<]+?)\s*<\/span>[\s\S]*?(?:Online seit:|zur Jobbeschreibung)/gi;
  
  let match;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    const meta = htmlDecode_(match[3].trim());
    
    let percent = '';
    let location = meta;
    
    const metaMatch = meta.match(/([0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)\s*,\s*(.+)/);
    if (metaMatch) {
      percent = metaMatch[1].trim();
      location = metaMatch[2].trim();
    }
    
    jobs.push({
      url,
      title,
      percent_or_workload: percent,
      location,
      rawSnippet: `${title} | ${percent} | ${location}`,
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanSbbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.sbb;
  const messages = getMessagesForLabel_(labelName)
    .filter(isSbbMailCandidate_)
    .filter(message =>
      isMessageRecentEnough_(message.getDate(), CONFIG.recency.sbbLookbackDays)
    );

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';

    const jobs = extractSbbJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(
        normalizeJobRecord_({
          source: 'SBB',
          source_label: labelName,
          mail_date: mailDate,
          deadline: '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: message.getId(),
          gmail_thread_id: message.getThread().getId(),
          title: job.title,
          location: job.location,
          employer: job.employer || 'SBB',
          percent_or_workload: job.percent_or_workload || '',
          grade: '',
          domain: '',
          dg: '',
          url: job.url,
          raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
          raw_source_id: message.getId(),
          run_id: runId
        })
      );
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
    source: 'SBB',
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
// LH
// *****************************************

