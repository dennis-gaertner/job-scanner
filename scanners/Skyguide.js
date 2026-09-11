// scanners/Skyguide.js — extracted without changing function implementations.

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
    const title = stripHtml_(match[2]);
    
    if (!url || !title) continue;
    
    const tdValues = [...rowHtml.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)]
    .map(m => stripHtml_(m[1]))
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

  return {
    source: 'Skyguide',
    mode: 'crawler',
    label_or_endpoint: 'Crawler/Skyguide',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: jobs.length,
    jobs_parsed: jobs.length,
    ...buildScanStats_(rows, upsertStats, idx),
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// EUROCONTROL
// *****************************************

