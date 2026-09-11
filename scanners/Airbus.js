// scanners/Airbus.js — extracted without changing function implementations.

function isAirbusMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');

  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;

  return (
    from.includes('@myworkday.com') &&
    /ag\.wd3\.myworkdayjobs\.com\/Airbus\//i.test(html + ' ' + plain)
  );
}


function extractAirbusJobsFromHtml_(html) {
  const jobs = [];
  const cleaned = cleanWorkdayMailHtml_(html);

  const linkRegex = /<a[^>]*href="(https:\/\/[^"]*myworkdayjobs\.com\/[^"]*JR\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(cleaned)) !== null) {
    const fullMatch = match[0];
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(stripHtml_(match[2]).trim());
    const rawSourceId = extractWorkdayJobIdFromUrl_(url);

    if (!title || !url || !rawSourceId) continue;

    const afterAnchor = cleaned.slice(linkRegex.lastIndex, linkRegex.lastIndex + 220);
    const location = extractAirbusLocationFromFollowingHtml_(afterAnchor);

    jobs.push({
      title,
      location,
      employer: 'Airbus',
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, location].filter(Boolean).join(' | '),
      raw_source_id: rawSourceId
    });
  }

  return dedupeJobsByMiniKey_(jobs);
}


function shouldFetchAirbusDetail_(job) {
  const text = normalizeText_([
    job.title,
    job.location,
    job.employer
  ].filter(Boolean).join(' '));

  const hardSkip = [
    'apprentice',
    'apprenti',
    'alternant',
    'working student',
    'werkstudent',
    'internship',
    'intern',
    'stagiaire',
    'student',
    'trainee'
  ];

  if (containsHardReject_(text, hardSkip)) return false;

  const fetchSignals = [
    'analyst',
    'analysis',
    'data',
    'strategy',
    'strategic',
    'lean',
    'performance',
    'improvement',
    'business',
    'innovation',
    'quality',
    'transformation',
    'planning'
  ];

  return fetchSignals.some(signal => text.includes(signal));
}


function enrichAirbusJobFromDetailPage_(job) {
  if (!job || !job.url) return job;
  if (!shouldFetchAirbusDetail_(job)) return job;

  try {
    const html = fetchWithRetry_(job.url).getContentText();
    const detail = extractWorkdayDetailFromHtml_(html, {
      fallbackEmployer: 'Airbus',
      departmentLabels: ['Department', 'Organization', 'Organisation', 'Job Family'],
      employmentTypeLabels: ['Employment type', 'Worker Type', 'Time Type']
    });

    return Object.assign({}, job, {
      detail_text: detail.detail_text || '',
      employer: detail.employer || job.employer || 'Airbus',
      domain: detail.department || job.domain || '',
      //percent_or_workload: detail.employmentType || job.percent_or_workload || ''
    });
  } catch (e) {
    Logger.log('Airbus detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}


function scanAirbusJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.airbus;
  const messages = getMessagesForLabel_(labelName)
    .filter(isAirbusMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.airbusLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractAirbusJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      let finalJob = {
        source: 'AIRBUS',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Airbus',
        percent_or_workload: '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        detail_text: '',
        raw_source_id: job.raw_source_id || extractWorkdayJobIdFromUrl_(job.url),
        run_id: runId
      };

      const shouldFetch =
        CONFIG.airbusDetail &&
        CONFIG.airbusDetail.enabled &&
        detailFetchCount < CONFIG.airbusDetail.maxFetchesPerRun &&
        shouldFetchAirbusDetail_(finalJob);

      if (shouldFetch) {
        detailFetchAttempted++;
        const beforeDetail = finalJob.detail_text || '';
        finalJob = enrichAirbusJobFromDetailPage_(finalJob);
        const afterDetail = finalJob.detail_text || '';
        if (afterDetail && afterDetail !== beforeDetail) {
          detailFetchCount++;
        }
      }

      rows.push(normalizeJobRecord_(finalJob));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  return {
    source: 'Airbus',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    ...buildScanStats_(rows, upsertStats, idx),
    detail_fetch_attempted: detailFetchAttempted,
    detail_fetch_count: detailFetchCount,
    status: 'ok',
    message: ''
  };
}


function testAirbusParser() {
  const threads = GmailApp.search('label:Jobs/Airbus', 0, 1);
  if (!threads.length) {
    Logger.log('Keine Threads mit Label Jobs/Airbus gefunden.');
    return;
  }

  const message = threads[0].getMessages()[0];
  const jobs = extractAirbusJobsFromHtml_(message.getBody() || '');

  Logger.log('Airbus jobs found: ' + jobs.length);
  jobs.slice(0, 20).forEach((job, i) => {
    Logger.log(
      (i + 1) + '. ' +
      JSON.stringify(job)
    );
  });
}


function testAirbusFirstPromisingDetail() {
  const threads = GmailApp.search('label:Jobs/Airbus', 0, 1);
  if (!threads.length) {
    Logger.log('Keine Threads mit Label Jobs/Airbus gefunden.');
    return;
  }

  const message = threads[0].getMessages()[0];
  const jobs = extractAirbusJobsFromHtml_(message.getBody() || '');

  const promising = jobs.find(job => shouldFetchAirbusDetail_(job));

  if (!promising) {
    Logger.log('Kein promising Airbus-Job gefunden.');
    return;
  }

  Logger.log('Testing detail fetch for: ' + promising.title + ' | ' + promising.url);

  const enriched = enrichAirbusJobFromDetailPage_(promising);
  Logger.log(JSON.stringify(enriched, null, 2));
}


function rescoreAirbus() {
  const result = rescoreJobsAllForSource_('AIRBUS');
  Logger.log(JSON.stringify(result, null, 2));
}


// *****************************************
// 8. CRAWLER / API-QUELLEN
// *****************************************


// *****************************************
// JOBROOM
// *****************************************


