


function scanAllJobSources() {
  BUND_DETAIL_FETCH_COUNT = 0;
  setupJobSheets_();
  refreshLearningCache_();

  const runId = Utilities.getUuid();

  function safeRun_(fn, name) {
    const startedAt = new Date();
    try {
      const result = fn() || {};
      const finishedAt = new Date();

      appendScanLogRow_(Object.assign({
        run_at: startedAt,
        run_id: runId,
        source: name,
        mode: '',
        label_or_endpoint: '',
        mail_threads: 0,
        mail_messages: 0,
        items_seen: 0,
        jobs_parsed: 0,
        rows_input_to_upsert: 0,
        jobs_upserted: 0,
        new_jobs: 0,
        updated_jobs: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        detail_fetch_attempted: 0,
        detail_fetch_count: 0,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        status: 'ok',
        message: ''
      }, result));
    } catch (e) {
      const finishedAt = new Date();

      Logger.log('ERROR in ' + name + ': ' + e);
      appendScanLogRow_({
        run_at: startedAt,
        run_id: runId,
        source: name,
        mode: '',
        label_or_endpoint: '',
        mail_threads: 0,
        mail_messages: 0,
        items_seen: 0,
        jobs_parsed: 0,
        rows_input_to_upsert: 0,
        jobs_upserted: 0,
        new_jobs: 0,
        updated_jobs: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        detail_fetch_attempted: 0,
        detail_fetch_count: 0,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        status: 'error',
        message: String(e)
      });
    }
  }

  safeRun_(() => scanBundDeRssToAll(runId), 'BundDE');
  safeRun_(() => scanBundJobsToAll(runId), 'BundCH');
  safeRun_(() => scanOebbJobsToAll(runId), 'OEBB');
  safeRun_(() => scanSbbJobsToAll(runId), 'SBB');
  safeRun_(() => scanLhJobsToAll(runId), 'LH');
  safeRun_(() => scanLhApiJobsToAll(runId), 'LH-Crawler');
  safeRun_(() => scanAirbusJobsToAll(runId), 'Airbus');
  safeRun_(() => scanAaKnJobsToAll(runId), 'AA-KN-Mail');
  safeRun_(() => scanAaKnCrawlerJobsToAll(runId), 'AA-KN-Crawler');
  safeRun_(() => scanEuCareersJobsToAll(runId), 'EU');
  safeRun_(() => scanSkyguideJobsToAll(runId), 'Skyguide');
  safeRun_(() => scanZrhJobsToAll(runId), 'ZRH');
  safeRun_(() => scanEurocontrolJobsToAll(runId), 'Eurocontrol');
  safeRun_(() => scanJobRoomJobsToAll(runId), 'JobRoom');
  safeRun_(() => scanDbJobsToAll(runId), 'DB');

  emailNewRelevantJobs(runId);

  formatJobsAllScoreColumns_();
  SpreadsheetApp.flush();
Logger.log('Before buildJobsCockpit_');
  safeRun_(() => buildJobsCockpit_(), 'SYSTEM: Cockpit');
  //buildJobsCockpit_();
Logger.log('After buildJobsCockpit_');

  buildSourceHealthView_();

  buildScoringCockpit_();

  if (ENABLE_AUTO_ARCHIVE) {
    safeRun_(() => archiveCandidatesAfterScan_(), 'SYSTEM: Archive');
  }

  //formatAllSheets();
}



function archiveCandidatesAfterScan_() {
  validateArchiveTarget_();
  zzz_ADMIN_archiveCandidates_TO_EXTERNAL();
}


// *****************************************
// 6A. NEUE, KANONISCHE SCANNER-ARCHITEKTUR
// *****************************************

function buildCanonicalJob_(fields) {
  return {
    source: fields.source || '',
    source_label: fields.source_label || '',
    raw_source_id: fields.raw_source_id || '',
    url: fields.url || '',

    title: fields.title || '',
    employer: fields.employer || '',
    location: fields.location || '',
    mail_date: fields.mail_date || '',
    deadline: fields.deadline || '',
    percent_or_workload: fields.percent_or_workload || '',
    grade: fields.grade || '',
    domain: fields.domain || '',
    dg: fields.dg || '',

    raw_snippet: fields.raw_snippet || '',
    detail_text: fields.detail_text || '',

    first_seen_at: fields.first_seen_at || '',
    last_seen_at: fields.last_seen_at || '',
    run_id: fields.run_id || ''
  };
}


// *****************************************
// 7. MAILQUELLEN
// *****************************************

// *****************************************
// OEBB
// *****************************************


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
    source: 'LH',
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
// ZRH
// *****************************************

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
    const description = descMatch ? htmlDecode_(stripHtmlZrh_(descMatch[1])) : '';
    
    const tagMatches = [...block.matchAll(/<span style="display:inline-block;[\s\S]*?>([\s\S]*?)<\/span>/gi)]
    .map(m => htmlDecode_(stripHtmlZrh_(m[1])))
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
    source: 'ZRH',
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
// AIRBUS
// *****************************************

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
    const title = htmlDecode_(stripHtmlKn_(match[2]).trim());
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
    source: 'Airbus',
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
// EU
// *****************************************


function buildEuCareersUrl_(page) {
  return `https://eu-careers.europa.eu/en/non-permanent-contract-ec?domain=&field_epso_type_of_contract_target_id=All&field_epso_location_target_id=All&order=created&sort=desc&page=${page}`;
}

function buildEuOtherUrl_(page) {
  const base = 'https://eu-careers.europa.eu/en/temporary-agents-other-institutions-vacancies';
  const params =
  '?domain=' +
  '&field_epso_type_of_contract_target_id=All' +
  '&field_epso_location_target_id=All' +
  '&institution=All' +
  '&order=created' +
  '&sort=desc';
  
  if (!page) return base + params;
  return base + params + '&page=' + page;
}



function extractEuCareersJobsFromHtml_(html, kind) {
  const jobs = [];
  
  const inferredKind = kind || (
  /temporary-agents-other-institutions-vacancies/i.test(String(html || ''))
  ? 'other'
  : 'commission'
  );
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ');
  
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/gi;
  
  let match;
  
  while ((match = rowRegex.exec(cleaned)) !== null) {
    const rowHtml = match[0];
    const url = absolutizeEuUrl_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    
    if (!title || title.length < 5) continue;
    if (/cookies policy|privacy policy/i.test(title)) continue;
    if (!/eu-careers\.europa\.eu\/en\/job-opportunities\//i.test(url)) continue;
    
    const tdValues = [...rowHtml.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)]
    .map(m => htmlDecode_(stripHtmlEu_(m[1])).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let domain = '';
    let dg = '';
    let grade = '';
    let location = '';
    let publicationDate = '';
    let deadline = '';
    let employer = '';
    
    if (inferredKind === 'commission') {
      // Bestehende Commission-Logik weitgehend behalten
      tdValues.forEach(value => {
        if (!grade && /\b(FG\s*[IVX]+|AD\s*\d|AST(?:-SC)?(?:\s*\d)?(?:,\s*AST(?:-SC)?\s*\d)*)/i.test(value)) {
          grade = value;
          return;
        }
        
        if (!publicationDate && /\b\d{2}\/\d{2}\/\d{4}\b/.test(value) && !/\d{2}:\d{2}/.test(value)) {
          publicationDate = value;
          return;
        }
        
        if (!deadline && /\b\d{2}\/\d{2}\/\d{4}\b/.test(value) && /\d{2}:\d{2}/.test(value)) {
          deadline = value;
          return;
        }
        
        if (
        !location &&
        /\([A-Za-z]+\)$/.test(value) &&
        !/^\([A-Z]+\)/.test(value)
        ) {
          location = value;
          return;
        }
      });
      
      const urlTail = url.toLowerCase();
      
      if (/ecfin/.test(urlTail)) dg = dg || 'ECFIN';
      else if (/digit/.test(urlTail)) dg = dg || 'DIGIT';
      else if (/cnect/.test(urlTail)) dg = dg || 'CNECT';
      else if (/budg/.test(urlTail)) dg = dg || 'BUDG';
      else if (/comp/.test(urlTail)) dg = dg || 'COMP';
      else if (/move/.test(urlTail)) dg = dg || 'MOVE';
      else if (/trade/.test(urlTail)) dg = dg || 'TRADE';
      else if (/sj-/.test(urlTail)) dg = dg || 'SJ';
      else if (/sg-/.test(urlTail)) dg = dg || 'SG';
      else if (/intpa/.test(urlTail)) dg = dg || 'INTPA';
      
      if (/\b(economist|economic|finance|statistics|statistician)\b/i.test(title)) {
        domain = 'Economics, Finance and Statistics';
      } else if (/\b(legal|law)\b/i.test(title)) {
        domain = 'Legal Affairs';
      } else if (/\b(ict|it|security|digital|project)\b/i.test(title)) {
        domain = 'Information Technologies';
      }
      
      employer = 'European Commission';
      
    } else {
      // EU-other: positionsbasiert + leichte Fallbacks
      // Typische Reihenfolge:
      // [domain?] [institution?] [grade?] [location?] [publication date] [deadline]
      
      tdValues.forEach(value => {
        if (!grade && /\b(FG\s*[IVX]+|AD\s*\d+|AST(?:-SC)?\s*\d+)\b/i.test(value)) {
          grade = value;
          return;
        }
        
        if (!publicationDate && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          publicationDate = value;
          return;
        }
        
        if (!deadline && /^\d{2}\/\d{2}\/\d{4}(?:\s*-\s*\d{2}:\d{2})?$/.test(value)) {
          // Wenn publicationDate schon belegt ist, ist ein zweites Datumsfeld sehr wahrscheinlich deadline
          if (publicationDate) {
            deadline = value;
            return;
          }
        }
        
        if (
        !location &&
        /\([A-Za-z]+\)$/.test(value) &&
        !/^\([A-Z]+\)/.test(value)
        ) {
          location = value;
          return;
        }
        
        if (
        !employer &&
        /^\([A-Z]+\)\s+/.test(value)
        ) {
          employer = value;
          return;
        }
        
        if (
        !domain &&
        /economics|finance|statistics|legal affairs|information technologies/i.test(value)
        ) {
          domain = value;
          return;
        }
      });
      
      // Falls domain aus Tabelle nicht sauber kam: Titelheuristik
      if (!domain) {
        if (/\b(economist|economic|finance|statistics|statistician)\b/i.test(title)) {
          domain = 'Economics, Finance and Statistics';
        } else if (/\b(legal|law)\b/i.test(title)) {
          domain = 'Legal Affairs';
        } else if (/\b(ict|it|security|digital|project)\b/i.test(title)) {
          domain = 'Information Technologies';
        }
      }
      
      // Fallback: employer aus URL nicht ideal, daher lieber generisch
      // Employer-Erkennung für EU-other
      if (!employer) {
        
        // 1. Klassische EU-Agentur-Schreibweise: "(EDA) European Defence Agency"
        const agencyMatch = tdValues.find(v =>
        /^\([A-Z]+\)\s+/.test(v)
        );
        
        if (agencyMatch) {
          employer = agencyMatch;
        }
      }
      
      // 2. Fallback: Institution ohne Klammerkürzel
      if (!employer) {
        
        const employerFallback = tdValues.find(value => {
          if (value === title) return false;
          if (value === domain) return false;
          if (value === grade) return false;
          if (value === location) return false;
          if (value === publicationDate) return false;
          if (value === deadline) return false;
          
          if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return false;
          if (/\b(FG\s*[IVX]+|AD\s*\d+|AST(?:-SC)?\s*\d+)\b/i.test(value)) return false;
          if (/\([A-Za-z]+\)$/.test(value)) return false;
          
          return value.length > 4;
        });
        
        if (employerFallback) {
          employer = employerFallback;
        }
      }
      
      // 3. letzter Fallback
      if (!employer) {
        employer = 'EU Agency';
      }
    }
    
    jobs.push({
      title,
      domain,
      dg,
      grade,
      location,
      publication_date: parseEuDate_(publicationDate),
      deadline: parseEuDeadline_(deadline || publicationDate),
      employer,
      url,
      rawSnippet: [title, employer, location, domain, dg, grade, publicationDate, deadline]
      .filter(Boolean)
      .join(' | ')
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}




function absolutizeEuUrl_(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return "https://eu-careers.europa.eu" + url;
  return "https://eu-careers.europa.eu/" + url;
}

function parseEuDate_(text) {
  if (!text) return "";
  
  const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return "";
  
  return new Date(
  Number(m[3]),
  Number(m[2]) - 1,
  Number(m[1])
  );
}

function parseEuDeadline_(text) {
  if (!text) return "";
  
  const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?/);
  if (!m) return "";
  
  return new Date(
  Number(m[3]),
  Number(m[2]) - 1,
  Number(m[1]),
  Number(m[4] || 0),
  Number(m[5] || 0),
  0
  );
}



function scanEuCareersJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 3;
  let itemsSeen = 0;
  let parsedJobsCount = 0;

  const sources = [
    {
      label: 'Crawler/EU',
      buildUrl: buildEuCareersUrl_,
      kind: 'commission'
    },
    {
      label: 'Crawler/EU-other',
      buildUrl: buildEuOtherUrl_,
      kind: 'other'
    }
  ];

  sources.forEach(src => {
    for (let page = 0; page < pagesToScan; page++) {
      const url = src.buildUrl(page);
      const html = fetchWithRetry_(url).getContentText();

      const jobs = extractEuCareersJobsFromHtml_(html, src.kind);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
        rows.push(normalizeJobRecord_({
          source: 'EUCAREERS',
          source_label: src.label,
          mail_date: job.publication_date || new Date(),
          deadline: job.deadline || '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: '',
          gmail_thread_id: '',
          title: job.title,
          location: job.location,
          employer: job.employer || '',
          percent_or_workload: '',
          grade: job.grade || '',
          domain: job.domain || '',
          dg: job.dg || '',
          url: job.url,
          raw_snippet: job.rawSnippet || '',
          raw_source_id: job.url,
          run_id: runId,
        }));
      });
    }
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
    source: 'EU',
    mode: 'crawler',
    label_or_endpoint: 'EU Careers / EU Other',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
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

function rescoreEUCareers() {
  const result = rescoreJobsAllForSource_('EUCAREERS');
  Logger.log(JSON.stringify(result, null, 2));
}

// *****************************************
// JOBROOM
// *****************************************


function buildJobRoomSearchPayload_(keywords) {
  return {
    cantonCodes: [],
    communalCodes: [],
    companyName: null,
    displayRestricted: false,
    keywords: keywords || [],
    onlineSince: 5,
    permanent: null,
    professionCodes: [],
    workloadPercentageMax: 100,
    workloadPercentageMin: 10
  };
}

function fetchJobRoomJobsPage_(keywords, page, size) {
  const p = page || 0;
  const s = size || 20;
  
  const url =
    'https://www.job-room.ch/jobadservice/api/jobAdvertisements/_search' +
    '?page=' + p +
    '&size=' + s +
    '&sort=date_desc&_ng=ZGU=';
  
  const payload = buildJobRoomSearchPayload_(keywords);
  
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  
  const code = res.getResponseCode();
  const body = res.getContentText();

  if (/maintenance/i.test(body)) {
    throw new Error('JobRoom temporarily in maintenance');
  }

  if (code !== 200) {
    throw new Error('JobRoom API failed: HTTP ' + code + ' | body=' + body.slice(0, 1000));
  }
  
  return JSON.parse(body || '[]');
}

function extractJobRoomJobsFromJson_(items) {
  const jobs = [];
  
  (items || []).forEach(item => {
    const ad = item && item.jobAdvertisement;
    const jc = ad && ad.jobContent;
    if (!ad || !jc) return;
    
    const descs = Array.isArray(jc.jobDescriptions) ? jc.jobDescriptions : [];
    const deDesc =
    descs.find(d => String(d.languageIsoCode || '').toLowerCase() === 'de') ||
    descs[0] ||
    {};
    
    const title = String(deDesc.title || '').trim();
    const description = stripHtmlKn_(String(deDesc.description || ''));
    
    const company = jc.company || {};
    const employment = jc.employment || {};
    const location = jc.location || {};
    const publication = ad.publication || {};
    
    const employer = String(company.name || '').trim();
    
    const locationText = [
    location.postalCode,
    location.city
    ].filter(Boolean).join(' ');
    
    let percent = '';
    if (employment.workloadPercentageMin || employment.workloadPercentageMax) {
      const min = String(employment.workloadPercentageMin || '').trim();
      const max = String(employment.workloadPercentageMax || '').trim();
      
      if (min && max && min !== max) percent = min + ' - ' + max + '%';
      else if (min) percent = min + '%';
      else if (max) percent = max + '%';
    }
    
    const id = String(ad.id || '').trim();
    const externalUrl = String(jc.externalUrl || '').trim();
    
    const jobUrl = externalUrl || (
    id ? 'https://www.job-room.ch/job-publication-detail/' + encodeURIComponent(id) : ''
    );
    
    jobs.push({
      title,
      location: locationText,
      employer,
      percent_or_workload: percent,
      grade: '',
      domain: '',
      dg: '',
      deadline: '',
      description,
      url: jobUrl,
      rawSnippet: [title, employer, locationText, percent]
        .filter(Boolean)
        .join(' | ')
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanJobRoomJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 1;

  const queries = [
    ['ökonom'],
    ['pricing'],
    ['strategie'],
    ['regulierung']
  ];

  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 3;

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  queries.forEach(keywords => {
    for (let page = 0; page < pagesToScan; page++) {
      const items = fetchJobRoomJobsPage_(keywords, page, 20);
      const jobs = extractJobRoomJobsFromJson_(items);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'JOBROOM',
        source_label: CONFIG.gmailLabels.jobroom,
        mail_date: new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        detail_text: job.description || '',
        raw_source_id: job.url,
        run_id: runId,
      });

        const score = Number(normalized[jobsIdx.score] || 0);

        if (score >= minScoreToKeep) {
          rows.push(normalized);
        }
      });
    }
  });

  const upsertStats = upsertJobsToAll_(rows);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[jobsIdx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'JobRoom',
    mode: 'api',
    label_or_endpoint: CONFIG.gmailLabels.jobroom,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
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


function rescoreJobroom() {
  const result = rescoreJobsAllForSource_('JOBROOM');
  Logger.log(JSON.stringify(result, null, 2));
}


// *****************************************
// SKYGUIDE
// *****************************************



function buildSkyguideUrl_() {
  return 'https://jobs.skyguide.ch/search?locale=de_DE';
}


function absolutizeSkyguideUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://jobs.skyguide.ch' + url;
  return 'https://jobs.skyguide.ch/' + url;
}

function parseSwissDate_(text) {
  const m = String(text || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return '';
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}


function extractSkyguideJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
  
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*class="jobTitle-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;
  
  let match;
  while ((match = rowRegex.exec(cleaned)) !== null) {
    const rowHtml = match[0];
    const url = absolutizeSkyguideUrl_(match[1].trim());
    const title = stripHtmlSkyguide_(match[2]);
    
    if (!url || !title) continue;
    
    const tdValues = [...rowHtml.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)]
    .map(m => stripHtmlSkyguide_(m[1]))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let location = '';
    let department = '';
    let publicationDate = '';
    
    if (tdValues.length >= 2) location = tdValues[1] || '';
    if (tdValues.length >= 3) department = tdValues[2] || '';
    if (tdValues.length >= 4) publicationDate = tdValues[3] || '';
    
    jobs.push({
      title: htmlDecode_(title),
      location: htmlDecode_(location),
      employer: 'Skyguide',
      department: htmlDecode_(department),
      publication_date: parseSwissDate_(publicationDate),
      url,
      rawSnippet: `${title} | ${location} | ${department} | ${publicationDate}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanSkyguideJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const url = buildSkyguideUrl_();
  const html = fetchWithRetry_(url).getContentText();

  const jobs = extractSkyguideJobsFromHtml_(html);

  const rows = jobs.map(job => normalizeJobRecord_({
    source: 'SKYGUIDE',
    source_label: 'Crawler/Skyguide',
    mail_date: job.publication_date || new Date(),
    deadline: '',
    first_seen_at: new Date(),
    last_seen_at: new Date(),
    gmail_message_id: '',
    gmail_thread_id: '',
    title: job.title,
    location: job.location,
    employer: job.employer,
    percent_or_workload: '',
    grade: '',
    domain: job.department || '',
    dg: '',
    url: job.url,
    raw_snippet: job.rawSnippet || '',
    raw_source_id: job.url,
    run_id: runId,
  }));

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
    source: 'Skyguide',
    mode: 'crawler',
    label_or_endpoint: 'Crawler/Skyguide',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: jobs.length,
    jobs_parsed: jobs.length,
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
// EUROCONTROL
// *****************************************

function fetchEurocontrolAjaxHtml_(pageJob) {
  const url = 'https://jobs.eurocontrol.int/wp-admin/admin-ajax.php';
  
  const payload = {
    action: 'lumesse_ajax_modern_list',
    lanugage: '1',
    sendEvent: 'false',
    'params[0][key]': 'per_page',
    'params[0][val]': '100'
  };
  
  if (pageJob && pageJob > 1) {
    payload['params[1][key]'] = 'page_job';
    payload['params[1][val]'] = String(pageJob);
  }
  
  let lastError = null;
  
  for (let i = 0; i < 3; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        payload,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error('EUROCONTROL AJAX failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 500));
      }
      
      const data = JSON.parse(res.getContentText() || '{}');
      if (!data || !data.advertsHtml) {
        throw new Error('EUROCONTROL AJAX returned no advertsHtml');
      }
      
      return data.advertsHtml;
    } catch (e) {
      lastError = e;
      Utilities.sleep(1500);
    }
  }
  
  throw lastError;
}


function extractEurocontrolField_(itemHtml, fieldLabel) {
  const liMatches = [...String(itemHtml || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  
  for (const m of liMatches) {
    const liHtml = m[1];
    
    const labelMatch = liHtml.match(/<span[^>]*>\s*([^<]+?)\s*<\/span>\s*([\s\S]*)/i);
    if (!labelMatch) continue;
    
    const label = htmlDecode_(stripHtmlZrh_(labelMatch[1])).trim();
    const value = htmlDecode_(stripHtmlZrh_(labelMatch[2])).trim();
    
    if (normalizeText_(label) === normalizeText_(fieldLabel)) {
      return value;
    }
  }
  
  return '';
}


function parseEurocontrolDate_(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}



function extractEurocontrolJobsFromAjaxHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\\\//g, '/')
  .replace(/\\"/g, '"')
  .replace(/\\n/g, ' ')
  .replace(/\\t/g, ' ')
  .replace(/\s+/g, ' ');
  
  const itemRegex = /<li>\s*<div class="jobs-content"[\s\S]*?(?=<li>\s*<div class="jobs-content"|<\/ul>)/gi;
  const items = cleaned.match(itemRegex) || [];
  
  items.forEach(item => {
    const titleMatch = item.match(/<h3[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!titleMatch) return;
    
    const url = htmlDecode_(titleMatch[1].trim());
    const title = htmlDecode_(titleMatch[2].trim());
    
    const reference = extractEurocontrolField_(item, 'Reference Number');
    const closingDateText = extractEurocontrolField_(item, 'Closing date');
    const location = extractEurocontrolField_(item, 'Location');
    
    const pMatches = [...item.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => htmlDecode_(stripHtmlZrh_(m[1])))
    .map(s => s.trim())
    .filter(Boolean);
    
    const description = pMatches.join(' | ');
    
    let grade = '';
    const refUpper = String(reference || '').toUpperCase();
    const gradeMatch = refUpper.match(/(?:^|[-/ ])(AD|AST|FG)(?:[-/ ]|$)/);
    if (gradeMatch) grade = gradeMatch[1];
    
    jobs.push({
      title,
      location: location || '',
      employer: 'EUROCONTROL',
      percent_or_workload: '',
      grade,
      domain: '',
      dg: '',
      deadline: parseEurocontrolDate_(closingDateText),
      description,
      reference,
      url,
      rawSnippet: [title, reference, location, closingDateText, description]
      .filter(Boolean)
      .join(' | ')
    });
  });
  
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanEurocontrolJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 2;
  let itemsSeen = 0;
  let parsedJobsCount = 0;

  for (let page = 1; page <= pagesToScan; page++) {
    const ajaxHtml = fetchEurocontrolAjaxHtml_(page);
    const jobs = extractEurocontrolJobsFromAjaxHtml_(ajaxHtml);

    itemsSeen += jobs.length;
    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'EUROCONTROL',
        source_label: CONFIG.gmailLabels.eurocontrol,
        mail_date: new Date(),
        deadline: job.deadline || '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'EUROCONTROL',
        percent_or_workload: '',
        grade: job.grade || '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        raw_source_id: job.url,
        run_id: runId,
      }));
    });
  }

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
    source: 'Eurocontrol',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.eurocontrol,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
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
// DB
// *****************************************


function buildDbSearchResultUrl_(query, pageNum, itemsPerPage) {
  return 'https://db.jobs/service/search/de-de/5441588' +
  '?qli=true' +
  '&query=' + encodeURIComponent(query || '') +
  '&queryJoined=' +
  '&itemsPerPage=' + encodeURIComponent(itemsPerPage || 20) +
  '&pageNum=' + encodeURIComponent(pageNum || 0) +
  '&view=asSearchResult' +
  '&isMapTabDefault=false';
}




function absolutizeDbUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://db.jobs' + url;
  return 'https://db.jobs/' + url;
}


function extractDbJobsFromSearchResultHtml_(html) {
  const jobs = [];
  const source = String(html || '');
  
  const blocks = source.match(
  /<div class="o-searchpage__item o-searchpage__item--careers[\s\S]*?<\/a>\s*<\/div>/gi
  ) || [];
  
  blocks.forEach(block => {
    const jobIdMatch = block.match(/data-job-id="(\d+)"/i);
    const hrefMatch = block.match(/<a[^>]*href="([^"]+)"/i);
    const titleMatch = block.match(
    /<span class="m-search-hit__title-text"[^>]*>([\s\S]*?)<\/span>/i
    );
    
    if (!hrefMatch || !titleMatch) return;
    
    const jobId = jobIdMatch ? jobIdMatch[1] : '';
    const title = htmlDecode_(stripHtmlKn_(titleMatch[1])).trim();
    const url = absolutizeDbUrl_(htmlDecode_(hrefMatch[1]));
    
    if (!title || !url) return;
    
    const liTexts = [...block.matchAll(/<li class="m-search-hit__item"[\s\S]*?>([\s\S]*?)<\/li>/gi)]
    .map(m => htmlDecode_(stripHtmlKn_(m[1])).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let location = '';
    let employer = 'Deutsche Bahn';
    let percent = '';
    
    if (liTexts.length >= 1) location = liTexts[0];
    if (liTexts.length >= 2) employer = liTexts[1] || 'Deutsche Bahn';
    if (liTexts.length >= 4) percent = liTexts[3];
    
    const rawSnippet = [title, location, employer, percent].filter(Boolean).join(' | ');
    
    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: percent,
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet,
      raw_source_id: jobId || url
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}




function scanDbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 2;
  const queries = [
    'Strategie',
    'Analyst',
    'Regulierung',
    'Fachreferent',
    'Markt',
    'Wettbewerb',
    'Transformation',
    'Tarif'
  ];

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  queries.forEach(query => {
    for (let page = 0; page < pagesToScan; page++) {
      const url = buildDbSearchResultUrl_(query, page, 20);

      const html = fetchWithRetry_(url, 3, {
        method: 'get',
        muteHttpExceptions: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://db.jobs/de-de/Suche?query=' + encodeURIComponent(query),
          'Accept': 'text/html, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0'
        }
      }).getContentText();

      const jobs = extractDbJobsFromSearchResultHtml_(html);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
        rows.push(normalizeJobRecord_({
          source: 'DB',
          source_label: CONFIG.gmailLabels.db,
          mail_date: new Date(),
          deadline: '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: '',
          gmail_thread_id: '',
          title: job.title,
          location: job.location,
          employer: job.employer,
          percent_or_workload: job.percent_or_workload || '',
          grade: '',
          domain: '',
          dg: '',
          url: job.url,
          raw_snippet: job.rawSnippet || '',
          raw_source_id: job.raw_source_id || job.url,
          run_id: runId,
        }));
      });
    }
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
    source: 'DB',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.db,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
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
// LH CRAWLER (NEU)
// *****************************************

const LH_QUERIES = [
  'analyst',
  'revenue',
  'revenue management',
  'procurement',
  'transformation'
];


function isLhInternship_(title) {

  const t = normalizeText_(title);

  return (
    /praktikum/.test(t) ||
    /praktikant/.test(t) ||
    /internship/.test(t) ||
    /working student/.test(t) ||
    /werkstudent/.test(t) ||
    /student/.test(t)
  );

}


function buildLhApiUrl_(query) {

  const payload = {
    LanguageCode: "DE",
    SearchParameters: {
      Sort: [{
        Criterion: "PublicationStartDate",
        Direction: "DESC"
      }]
    },
    SearchCriteria: [
      {
        CriterionName: "PositionFormattedDescription.Content",
        CriterionValue: [query]
      }
    ]
  };

  return "https://api-apply.lufthansagroup.careers/search/?data=" +
    encodeURIComponent(JSON.stringify(payload));

}


function extractLhJobsFromApi_(json) {

  const jobs = [];

  const items =
    json?.SearchResult?.SearchResultItems || [];

  items.forEach(item => {

    const d = item.MatchedObjectDescriptor;

    if (!d) return;

    const title = cleanLhText_(d.PositionTitle);

    if (isLhInternship_(title)) return;

    const employer =
      d.ParentOrganizationName || "Lufthansa Group";

    const locationObj =
      (d.PositionLocation || [])[0] || {};

    const location =
      [
        locationObj.CityName,
        locationObj.CountryName
      ].filter(Boolean).join(', ');

    const percent =
      (d.PositionSchedule || [])
        .map(x => x.Name)
        .join(' / ');

    const date =
      d.PublicationStartDate
        ? new Date(d.PublicationStartDate)
        : '';

    const url =
      d.PositionURI || '';

    const jobId =
      d.ID || url;

    jobs.push({
      title,
      employer,
      location,
      percent_or_workload: percent,
      publication_date: date,
      url,
      rawSnippet: [
        title,
        location,
        employer,
        percent
      ].filter(Boolean).join(' | '),
      raw_source_id: jobId
    });

  });

  return dedupeJobsByMiniKey_(jobs);

}

function scanLhApiJobsToAll(runId) {
  runId = runId || Utilities.getUuid();

  setupJobSheets_();

  const rows = [];
  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 4;

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  LH_QUERIES.forEach(query => {
    const url = buildLhApiUrl_(query);

    const response = fetchWithRetry_(url, 3, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const json = JSON.parse(response.getContentText());
    const jobs = extractLhJobsFromApi_(json);

    itemsSeen += jobs.length;
    parsedJobsCount += jobs.length;

    Logger.log(
      'LH query="' + query + '" => jobs: ' + jobs.length
    );

    jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'LH',
        source_label: 'Crawler/LH',
        mail_date: job.publication_date || new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.percent_or_workload,
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet,
        raw_source_id: job.raw_source_id,
        run_id: runId,
      });

      const score = Number(normalized[jobsIdx.score] || 0);

      if (score >= minScoreToKeep) {
        rows.push(normalized);
      }
    });
  });

  const upsertStats = upsertJobsToAll_(rows);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[jobsIdx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'LH-Crawler',
    mode: 'api',
    label_or_endpoint: 'Crawler/LH',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
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


function rescoreLh() {
  const result = rescoreJobsAllForSource_('LH');
  Logger.log(JSON.stringify(result, null, 2));
}




// *****************************************
// LH CRAWLER (PAUSIERT)
// *****************************************
// Status:
// - search_result liefert im Apps-Script-Fetch nur JS/Cookie-Shell
// - keine stabil parsbaren Jobkarten im HTML
// - Detailseiten (jobad&id=...) wären parsbar, aber es fehlt aktuell
//   eine robuste Quelle für direkte Job-URLs
// => daher vorerst deaktiviert; Mailquelle bleibt aktiv

function buildLhSearchResultUrl_(opts) {
  opts = opts || {};

  const language = opts.language || 2;
  const query = opts.query || '';
  const page = opts.page || 1;
  const itemsPerPage = opts.itemsPerPage || 100;
  const orderCriterion = opts.orderCriterion || 'date';
  const orderDirection = opts.orderDirection || 'DESC';

  let url =
    'https://apply.lufthansagroup.careers/index.php?ac=search_result' +
    '&language=' + encodeURIComponent(language) +
    '&search_parameter_page_current=' + encodeURIComponent(page) +
    '&search_parameter_item_per_page=' + encodeURIComponent(itemsPerPage) +
    '&search_parameter_order_criterion=' + encodeURIComponent(orderCriterion) +
    '&search_parameter_order_direction=' + encodeURIComponent(orderDirection);

  if (query) {
    url += '&search_criterion_keyword=' + encodeURIComponent(query);
  }

  return url;
}

function absolutizeLhUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://apply.lufthansagroup.careers' + url;
  return 'https://apply.lufthansagroup.careers/' + url;
}

function parseLhDate_(text) {
  const s = String(text || '').trim();

  let m = s.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  m = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  return '';
}

function cleanLhText_(text) {
  return htmlDecode_(stripHtmlKn_(text))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLhJobIdFromUrl_(url) {
  const m = String(url || '').match(/[?&]id=(\d+)/i);
  return m ? m[1] : '';
}

function normalizeLhTitle_(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*Read more$/i, '')
    .trim();
}

function looksLikeLhDate_(text) {
  return /\b\d{2}[./]\d{2}[./]\d{4}\b/.test(String(text || ''));
}

function looksLikeLhWorkload_(text) {
  return /(vollzeit|teilzeit|full[- ]?time|part[- ]?time|[0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)/i.test(String(text || ''));
}

function getLhEmployerRegex_() {
  return new RegExp(
    '\\b(' +
      'lufthansa(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'swiss(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'austrian airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'brussels airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'eurowings(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'lufthansa technik(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'lufthansa cargo(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'discover airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'airplus(?:\\s+[a-z0-9&.\\- ]+)?' +
    ')\\b',
    'i'
  );
}

function getLhLocationRegex_() {
  return new RegExp(
    '\\b(' +
      'frankfurt(?:\\s*\\/\\s*main)?|' +
      'hamburg|' +
      'münchen|munich|' +
      'zürich(?:\\/kloten)?|zurich(?:\\/kloten)?|kloten|' +
      'wien|vienna|' +
      'köln|cologne|' +
      'berlin|' +
      'brussels|' +
      'bremen|' +
      'sofia|' +
      'malta|' +
      'bangalore|' +
      'delhi|' +
      'basel|' +
      'geneva|genf' +
    ')\\b',
    'i'
  );
}

function looksLikeLhEmployer_(text, title) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (looksLikeLhDate_(s)) return false;
  if (looksLikeLhWorkload_(s)) return false;
  if (normalizeText_(s) === normalizeText_(title)) return false;

  return getLhEmployerRegex_().test(s);
}

function looksLikeLhLocation_(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (looksLikeLhDate_(s)) return false;
  if (looksLikeLhWorkload_(s)) return false;

  return getLhLocationRegex_().test(s);
}

function isLikelyLhNoiseTitle_(title) {
  const t = normalizeText_(title);
  if (!t) return true;

  return (
    /^job portal$/.test(t) ||
    /^stellenmarkt$/.test(t) ||
    /^career opportunities$/.test(t) ||
    /^help$/.test(t) ||
    /^data privacy/.test(t) ||
    /^imprint$/.test(t) ||
    /^accessibility$/.test(t) ||
    /^faqs?$/.test(t) ||
    /^read more$/.test(t)
  );
}

function splitLhMetaCandidates_(blockText) {
  return String(blockText || '')
    .split(/\s*[|·•]\s*|\s{2,}/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => s.length >= 2);
}

function extractLhJobsFromSearchResultHtml_(html, debug) {
  const jobs = [];
  const cleaned = String(html || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\\\//g, '/')
    .trim();

  const blocks = cleaned.match(
    /<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?(?=<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+|$)/gi
  ) || [];

  if (debug) {
    Logger.log('LH raw candidate blocks: ' + blocks.length);
  }

  blocks.forEach((block, i) => {
    const urlMatch = block.match(/href="([^"]*index\.php\?ac=jobad&id=\d+[^"]*)"/i);
    if (!urlMatch) return;

    const url = absolutizeLhUrl_(htmlDecode_(urlMatch[1]).trim());
    const jobId = extractLhJobIdFromUrl_(url);

    const anchorTextMatch = block.match(
      /<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+[^"]*"[^>]*>([\s\S]*?)<\/a>/i
    );

    const title = anchorTextMatch
      ? normalizeLhTitle_(cleanLhText_(anchorTextMatch[1]))
      : '';

    if (!title || title.length < 4 || isLikelyLhNoiseTitle_(title)) {
      if (debug) Logger.log('LH skip block ' + i + ' | bad title | ' + title);
      return;
    }

    const blockText = cleanLhText_(block);
    const metaParts = splitLhMetaCandidates_(blockText);

    let employer = '';
    let location = '';
    let percent = '';
    let publicationDate = '';

    metaParts.forEach(part => {
      if (!publicationDate && looksLikeLhDate_(part)) {
        const m = part.match(/\b\d{2}[./]\d{2}[./]\d{4}\b/);
        if (m) publicationDate = m[0];
        return;
      }

      if (!percent && looksLikeLhWorkload_(part)) {
        percent = part;
        return;
      }

      if (!employer && looksLikeLhEmployer_(part, title)) {
        employer = part;
        return;
      }

      if (!location && looksLikeLhLocation_(part) && !looksLikeLhEmployer_(part, title)) {
        location = part;
      }
    });

    if (!employer) {
      const employerMatch = blockText.match(getLhEmployerRegex_());
      if (employerMatch) employer = employerMatch[1].trim();
    }

    if (!location) {
      const locationMatch = blockText.match(getLhLocationRegex_());
      if (locationMatch) location = locationMatch[1].trim();
    }

    const rawSnippet = [title, employer, location, publicationDate, percent]
      .filter(Boolean)
      .join(' | ');

    const job = {
      title,
      employer: employer || 'Lufthansa Group',
      location,
      percent_or_workload: percent,
      publication_date: parseLhDate_(publicationDate),
      url,
      rawSnippet,
      raw_source_id: jobId || url
    };

    if (debug) {
      Logger.log('LH parsed job ' + i + ': ' + JSON.stringify(job));
    }

    jobs.push(job);
  });

  return dedupeJobsByMiniKey_(jobs);
}

function scanLhCrawlerJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 4;

  const queries = [
    'strategy',
    'pricing',
    'analyst',
    'policy',
    'regulation',
    'competition',
    'market',
    'transformation'
  ];

  queries.forEach(query => {
    const url = buildLhSearchResultUrl_({
      query: query,
      language: 2,
      page: 1,
      itemsPerPage: 100
    });

    const html = fetchWithRetry_(url, 3, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }).getContentText();

    const jobs = extractLhJobsFromSearchResultHtml_(html, false);

    Logger.log('LH query="' + query + '" => parsed jobs: ' + jobs.length);

    jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'LH',
        source_label: 'Crawler/LH',
        mail_date: job.publication_date || new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Lufthansa Group',
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        raw_source_id: job.raw_source_id || job.url,
        run_id: runId,
      });

      const score = Number(normalized[jobsIdx.score] || 0);
      if (score >= minScoreToKeep) {
        rows.push(normalized);
      }
    });
  });

  upsertJobsToAll_(rows);
}

function testLhCrawlerParser_() {
  const url = buildLhSearchResultUrl_({
    query: 'strategy',
    language: 2,
    page: 1,
    itemsPerPage: 100
  });

  const html = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }).getContentText();

  const jobs = extractLhJobsFromSearchResultHtml_(html, true);

  Logger.log('LH test parser jobs found: ' + jobs.length);
  jobs.slice(0, 15).forEach(job => Logger.log(JSON.stringify(job)));
}


function testLhCrawlerParser() {
  return testLhCrawlerParser_();
}

function testLhFetchShell() {
  const url = buildLhSearchResultUrl_({
    query: 'strategy',
    language: 2,
    page: 1,
    itemsPerPage: 100
  });

  const html = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }).getContentText();

  Logger.log('LH html length: ' + html.length);
  Logger.log('contains jobad?id=: ' + /jobad&id=\d+/i.test(html));
  Logger.log('contains please wait: ' + /please wait/i.test(html));
  Logger.log('contains activate javascript: ' + /activate javascript/i.test(html));
  Logger.log('contains use of cookies: ' + /use of cookies/i.test(html));
  Logger.log(html.slice(0, 2000));
}






// *****************************************
// 9. GEMEINSAME UTILITIES
// *****************************************



function daysAgo_(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}


function isMessageRecentEnough_(messageDate, maxAgeDays) {
  if (!(messageDate instanceof Date)) return false;
  return messageDate >= daysAgo_(maxAgeDays);
}


function getMessagesForLabel_(labelName, maxThreads) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) throw new Error('Label nicht gefunden: ' + labelName);
  
  const limit = maxThreads || 200;
  const batchSize = 100;
  const messages = [];
  
  for (let start = 0; start < limit; start += batchSize) {
    const threads = label.getThreads(start, Math.min(batchSize, limit - start));
    if (!threads.length) break;
    
    threads.forEach(thread => {
      thread.getMessages().forEach(message => messages.push(message));
    });
  }
  
  return messages;
}


function fetchWithRetry_(url, attempts, options) {

  const maxAttempts = attempts || 3;

  for (let i = 0; i < maxAttempts; i++) {

    try {

      const res = UrlFetchApp.fetch(url, options || {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const code = res.getResponseCode();

      if (code >= 200 && code < 300) return res;

      throw new Error('HTTP ' + code);

    } catch (e) {

      if (i === maxAttempts - 1) throw e;

      Utilities.sleep(2000);
    }
  }
}



function buildShortSnippet_(message) {
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
  
  if (plain) return plain.slice(0, 300);
  
  const html = String(message.getBody ? (message.getBody() || '') : '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
  
  return html.slice(0, 300);
}



function normalizeUrlForKey_(source, url) {
  let u = String(url || '').trim();
  if (!u) return '';
  
  if (String(source || '').toLowerCase() === 'jobroom') {
    u = u.replace(/([?&])cache=[^&]+/gi, '$1');
    u = u.replace(/[?&]$/g, '');
  }
  
  return u;
}


function extractLhJobIdFromUrl_(url) {
  const u = String(url || '').trim();
  if (!u) return '';

  const m = u.match(/[?&]id=(\d+)/i);
  return m ? m[1] : '';
}


function buildUniqueKey_(source, title, employer, location, url, rawSourceId) {
  const src = canonicalSourceForIdentity_(source);
  const normalizedUrl = normalizeUrlForKey_(src, url);
  const rawId = String(rawSourceId || '').trim();

  // LH: prefer stable job id from URL over rawSourceId
  if (src === 'lh') {
    const lhJobId = extractLhJobIdFromUrl_(url) || rawId;
    if (lhJobId) {
      const raw = [src, lhJobId].map(v => normalizeKeyPart_(v)).join('|');
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
      return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    }
  }

  if (rawId && ['airbus', 'kn', 'aa-kn', 'aa-cities'].includes(src)) {
    const raw = [src, rawId].map(v => normalizeKeyPart_(v)).join('|');
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
    return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  }

  const raw = [src, title, employer, location, normalizedUrl]
    .map(v => normalizeKeyPart_(v))
    .join('|');

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function normalizeKeyPart_(value) {
  return String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/https?:\/\//g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
}


function canonicalSourceForIdentity_(source) {
  const src = String(source || '').toLowerCase().trim();

  if (src === 'aa-kn') return 'kn';

  return src;
}


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

function cleanWorkdayMailHtml_(html) {
  return String(html || '')
    .replace(/=\r?\n/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/=3D/g, '=')
    .replace(/=C3=BC/gi, 'ü')
    .replace(/=C3=A4/gi, 'ä')
    .replace(/=C3=B6/gi, 'ö')
    .replace(/=C3=9F/gi, 'ß')
    .replace(/=C3=A9/gi, 'é')
    .replace(/=20/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function extractWorkdayJobIdFromUrl_(url) {
  const m = String(url || '').match(/(JR\d+)/i);
  return m ? m[1].toUpperCase() : '';
}


function findJobPostingJsonLdFromHtml_(html) {
  const matches = [...String(html || '').matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of arr) {
        if (!item) continue;

        if (item['@type'] === 'JobPosting') return item;

        if (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')) {
          return item;
        }

        if (item.mainEntity && item.mainEntity['@type'] === 'JobPosting') {
          return item.mainEntity;
        }
      }
    } catch (e) {
      // ignore malformed JSON-LD
    }
  }

  return null;
}


function extractMetaContentByNameGeneric_(html, name) {
  const re = new RegExp(
    '<meta[^>]+name="' + escapeRegexGeneric_(name) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractMetaContentByPropertyGeneric_(html, property) {
  const re = new RegExp(
    '<meta[^>]+property="' + escapeRegexGeneric_(property) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractLabeledValueFromHtmlTextGeneric_(html, label) {
  const text = stripHtmlKn_(html);
  const re = new RegExp(
    escapeRegexGeneric_(label) + '\\s*[:|-]?\\s*([^|\\n\\r]{1,120})',
    'i'
  );
  const m = text.match(re);
  return m ? String(m[1] || '').trim() : '';
}


function cleanWorkdayDetailText_(text, maxLen) {
  const cleaned = stripHtmlKn_(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return cleaned.slice(0, maxLen || 5000);
}


function escapeRegexGeneric_(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function extractWorkdayLocationFromTrailingText_(text) {
  let t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return '';

  let m = t.match(/^\(([^)]+)\)/);
  if (m) return m[1].trim();

  m = t.match(/^[-–—:,]\s*(.+)$/);
  if (m) return m[1].trim();

  m = t.match(/^([A-Z][A-Za-zÀ-ÿ' .\/-]{1,80})$/);
  if (m) return m[1].trim();

  return '';
}


/**
 * Generischer Workday-Newsletter-Parser:
 * <a href=".../JR12345678">Job Title</a> (Location)
 */
function extractWorkdayJobsFromHtml_(html, sourceOptions) {
  const opts = sourceOptions || {};
  const urlPattern = opts.urlPattern || 'https:\\/\\/[^"]*myworkdayjobs\\.com\\/[^"]*\\/JR\\d+[^"]*';
  const employer = opts.employer || '';
  const cleaned = cleanWorkdayMailHtml_(html);

  const regex = new RegExp(
    '<a[^>]*href="(' + urlPattern + ')"[^>]*>([\\s\\S]*?)<\\/a>\\s*([\\s\\S]{0,180}?)(?=<a\\b|<br\\b|<\\/td>|<\\/div>|<\\/p>|<\\/tr>|$)',
    'gi'
  );

  const jobs = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(stripHtmlKn_(match[2]).trim());
    const trailing = htmlDecode_(stripHtmlKn_(match[3]).trim());

    const rawSourceId = extractWorkdayJobIdFromUrl_(url);
    const location = extractWorkdayLocationFromTrailingText_(trailing);

    if (!title || !url || !rawSourceId) continue;

    jobs.push({
      title,
      location,
      employer,
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


function extractWorkdayDetailFromHtml_(html, options) {
  const opts = options || {};
  const fallbackEmployer = opts.fallbackEmployer || '';
  const departmentLabels = opts.departmentLabels || [
    'Department',
    'Organization',
    'Organisation',
    'Job Family'
  ];

  const employmentTypeLabels = opts.employmentTypeLabels || [
    'Employment Type',
    'Employment type',
    'Worker Type',
    'Time Type'
  ];
  const jobPosting = findJobPostingJsonLdFromHtml_(html);

  let detailText = '';
  let department = '';
  let employmentType = '';
  let employer = fallbackEmployer;
  let postingDate = '';

  if (jobPosting) {
    detailText = cleanWorkdayDetailText_(jobPosting.description || '', 5000);
    employmentType = String(jobPosting.employmentType || '').trim();
    postingDate = String(jobPosting.datePosted || '').trim();

    if (jobPosting.hiringOrganization) {
      if (typeof jobPosting.hiringOrganization === 'string') {
        employer = jobPosting.hiringOrganization.trim();
      } else if (jobPosting.hiringOrganization.name) {
        employer = String(jobPosting.hiringOrganization.name).trim();
      }
    }
  }

  if (!detailText) {
    const metaDesc =
      extractMetaContentByNameGeneric_(html, 'description') ||
      extractMetaContentByPropertyGeneric_(html, 'og:description') ||
      '';
    detailText = cleanWorkdayDetailText_(metaDesc, 5000);
  }

  if (!employmentType) {
    const m = stripHtmlKn_(html).match(/Employment Type:\s*([^\-|]{1,80})/i);
    if (m) employmentType = String(m[1] || '').trim();
  }

  if (!department) {
    const m = stripHtmlKn_(html).match(/Job Family:\s*([^\-|]{1,80})/i);
    if (m) department = String(m[1] || '').trim();
  }

  return {
    detail_text: detailText,
    department,
    employmentType,
    employer,
    postingDate
  };
}




// *****************************************
// 10. HTML-/Text-Helfer
// *****************************************


function stripHtmlZrh_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
}


function extractAirbusLocationFromFollowingHtml_(htmlFragment) {
  const text = htmlDecode_(stripHtmlKn_(htmlFragment))
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  // typischer Airbus-Fall: "(Brasov (30 Hermann))"
  const parenStart = text.indexOf('(');
  if (parenStart !== -1) {
    let depth = 0;
    let out = '';

    for (let i = parenStart; i < text.length; i++) {
      const ch = text[i];
      out += ch;

      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          return out.slice(1, -1).trim();
        }
      }
    }
  }

  // Fallback: bis zum ersten stärkeren Trenner
  const fallback = text.split(/(?:\bWenn Sie\b|Mit freundlichen Grüßen|Folgen Sie uns auf|Stellen-Alerts verwalten)/i)[0]
    .trim();

  return fallback.slice(0, 100).trim();
}


function stripHtmlKn_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&uuml;/gi, 'ü')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&auml;/gi, 'ä')
  .replace(/&szlig;/gi, 'ß')
  .replace(/\s+/g, ' ')
  .trim();
}



function stripHtmlSkyguide_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&uuml;/gi, 'ü')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&auml;/gi, 'ä')
  .replace(/\s+/g, ' ')
  .trim();
}



function stripHtmlEu_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
}


function parseUrlQueryParams_(url) {
  const out = {};
  const q = String(url || '').split('?')[1] || '';
  if (!q) return out;

  q.split('&').forEach(pair => {
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '').trim();
    const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' ')).trim();
    if (key) out[key] = value;
  });

  return out;
}
