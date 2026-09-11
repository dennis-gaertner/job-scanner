const LH_QUERIES = [
  'analyst',
  'revenue',
  'revenue management',
  'procurement',
  'transformation'
];



// scanners/LH-crawler.js — extracted without changing function implementations.

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

  return {
    source: 'LH-Crawler',
    mode: 'api',
    label_or_endpoint: 'Crawler/LH',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    ...buildScanStats_(rows, upsertStats, jobsIdx),
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
  return htmlDecode_(stripHtml_(text))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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



