// scanners/DB.js — extracted without changing function implementations.

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
    const title = htmlDecode_(stripHtml_(titleMatch[1])).trim();
    const url = absolutizeDbUrl_(htmlDecode_(hrefMatch[1]));
    
    if (!title || !url) return;
    
    const liTexts = [...block.matchAll(/<li class="m-search-hit__item"[\s\S]*?>([\s\S]*?)<\/li>/gi)]
    .map(m => htmlDecode_(stripHtml_(m[1])).replace(/\s+/g, ' ').trim())
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

  return {
    source: 'DB',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.db,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    ...buildScanStats_(rows, upsertStats, idx),
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}

// *****************************************
// LH CRAWLER (NEU)
// *****************************************

