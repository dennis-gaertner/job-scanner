

// *****************************************
// 6C. BUND
// *****************************************



function isBundMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  if (!from.includes('job@stelle.admin.ch') && !from.includes('@stelle.admin.ch')) return false;
  
  return /jobs\.admin\.ch\/offene-stellen\//i.test(html);
}


function scanBundJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();
  BUND_DETAIL_FETCH_COUNT = 0;

  const labelName = CONFIG.gmailLabels.bund;
  const messages = getMessagesForLabel_(labelName)
    .filter(isBundMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.bundLookbackDays));

  const threadIds = new Set();
  const bundle = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const snippet = buildShortSnippet_(message);
    const jobs = extractBundJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      const baseJob = {
        source: 'BundCH',
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
        percent_or_workload: job.pensum,
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: snippet,
        raw_source_id: message.getId(),
        run_id: runId,
      };

      bundle.push({
        job: baseJob,
        quickScore: quickRankBundJob_(baseJob),
      });
    });
  });

  bundle.sort((a, b) => b.quickScore - a.quickScore);

  const rows = bundle.map((entry, index) => {
    const shouldEnrich =
      CONFIG.bundDetail &&
      CONFIG.bundDetail.enabled &&
      index < CONFIG.bundDetail.maxFetchesPerRun &&
      shouldFetchBundDetail_(entry.job);

    let finalJob = entry.job;

    if (shouldEnrich) {
      detailFetchAttempted++;
      finalJob = enrichBundJobFromDetailPage_(entry.job, true);
    }

    return normalizeJobRecord_(finalJob);
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
    source: 'Bund',
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
    detail_fetch_count: BUND_DETAIL_FETCH_COUNT,
    status: 'ok',
    message: ''
  };
}



function quickRankBundJob_(job) {
  const text = [
  job.title,
  job.location,
  job.employer,
  job.percent_or_workload
  ].filter(Boolean).join(' ');
  
  const result = scoreEntry_(
  text,
  CONFIG.scoring.bundch.positiveKeywords,
  CONFIG.scoring.bundch.negativeKeywords,
  CONFIG.scoring.bundch.bonusPatterns
  );
  
  let score = result.score;
  
  const title = normalizeText_(job.title || '');
  
  // Kleine Priorisierung für potenziell "versteckt gute" Rollen
  if (title.includes('mathematik')) score += 3;
  if (title.includes('mathematisch')) score += 2;
  if (title.includes('leiter')) score += 2;
  if (title.includes('leitung')) score += 2;
  if (title.includes('modell')) score += 2;
  if (title.includes('versicherung')) score += 2;
  if (title.includes('finanz')) score += 2;
  
  return score;
}



function shouldFetchBundDetail_(job) {
  const cfg = CONFIG.bundDetail;
  if (!cfg || !cfg.enabled) return false;
  if (!job || !job.url) return false;
  
  const title = normalizeText_(job.title || '');
  
  const highPriorityPatterns = [
  'mathematik',
  'mathematisch',
  'ökonom',
  'oekonom',
  'modell',
  'versicherung',
  'finanz'
  ];
  
  const normalPatterns = cfg.triggerTitlePatterns || [];
  
  const matchedHighPriority = highPriorityPatterns.find(pattern => title.includes(pattern));
  if (matchedHighPriority) {
    Logger.log('BUND DETAIL YES: ' + job.title + ' | high-priority=' + matchedHighPriority + ' | count=' + BUND_DETAIL_FETCH_COUNT);
    return true;
  }
  
  const matchedNormal = normalPatterns.find(pattern => title.includes(pattern));
  if (!matchedNormal) {
    Logger.log('BUND DETAIL NO: ' + job.title + ' | reason=no-trigger-match');
    return false;
  }
  
  if (BUND_DETAIL_FETCH_COUNT >= cfg.maxFetchesPerRun) {
    Logger.log('BUND DETAIL NO: ' + job.title + ' | reason=limit-reached | count=' + BUND_DETAIL_FETCH_COUNT);
    return false;
  }
  
  Logger.log('BUND DETAIL YES: ' + job.title + ' | trigger=' + matchedNormal + ' | count=' + BUND_DETAIL_FETCH_COUNT);
  return true;
}


function enrichBundJobFromDetailPage_(job, forceFetch) {
  const cfg = CONFIG.bundDetail;
  if (!cfg || !cfg.enabled) return job;
  if (!job || !job.url) return job;
  
  if (!forceFetch && !shouldFetchBundDetail_(job)) return job;
  if (BUND_DETAIL_FETCH_COUNT >= cfg.maxFetchesPerRun) return job;
  
  try {
    const html = fetchWithRetry_(job.url).getContentText();
    
    const detailText = extractBundDetailText_(html);
    if (!detailText) return job;
    
    BUND_DETAIL_FETCH_COUNT++;
    
    return Object.assign({}, job, {
      detail_text: detailText
    });
    
  } catch (e) {
    Logger.log('Bund detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}

function extractBundDetailText_(html) {
  const text = String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
  
  if (!text) return '';
  
  const markers = [
  'Diesen Beitrag können Sie leisten',
  'Das macht Sie einzigartig',
  'Auf den Punkt gebracht',
  'Zusätzliche Informationen'
  ];
  
  const parts = [];
  
  markers.forEach(marker => {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      parts.push(text.slice(idx, idx + 1200));
    }
  });
  
  if (parts.length) {
    return parts.join(' ');
  }
  
  return text.slice(0, 3000);
}


function extractBundJobsFromHtml_(html) {
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
  
  const regex = /<a href="(https:\/\/jobs\.admin\.ch\/offene-stellen\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?<span[^>]*>[\s\S]*?([0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)\s*\|\s*([^|<]+)\s*\|\s*([^<]+?)\s*<\/span>/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      url: htmlDecode_(match[1].trim()),
      title: htmlDecode_(match[2].trim()),
      pensum: htmlDecode_(match[3].trim()),
      location: htmlDecode_(match[4].trim()),
      employer: htmlDecode_(match[5].trim()),
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function rescoreBundCH() {
  const result = rescoreJobsAllForSource_('BUNDCH');
  Logger.log(JSON.stringify(result, null, 2));
}
