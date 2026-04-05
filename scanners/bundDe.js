// *****************************************
// 6B. bund.de Crawler RSS
// - has location boost
// *****************************************


const BUNDDE_TARGET_STATES = [
  'berlin',
  'brandenburg',
  'hamburg',
  'baden-württemberg',
  'bayern'
];

const BUNDDE_QUERIES = [
  'ökonom',
  'referent',
  //'wissenschaftlich',
  //'analyst'
];

function scanBundDeRssToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const states = BUNDDE_TARGET_STATES;
  const queries = BUNDDE_QUERIES;

  const collectedJobs = [];
  let itemsSeen = 0;

  queries.forEach(query => {
    const rssUrl = buildBundDeRssUrl_(query, states);
    const items = fetchBundDeRssItems_(rssUrl);

    itemsSeen += items.length;

    items.forEach(item => {
      const title = cleanBundDeText_(htmlDecode_(item.getChildText('title') || ''));
      const link = cleanBundDeUrl_(item.getChildText('link') || '');
      const guid = cleanBundDeUrl_(item.getChildText('guid') || link);
      const pubDateRaw = item.getChildText('pubDate') || '';
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : '';

      const descriptionRaw = item.getChildText('description') || '';
      const parsed = parseBundDeRssDescription_(descriptionRaw);

      collectedJobs.push(
        buildCanonicalJob_({
          source: 'BundDE',
          source_label: 'RSS/BundDE',
          raw_source_id: guid,
          url: guid,

          title: title,
          employer: parsed.employer || '',
          location: parsed.location || '',
          mail_date: pubDate || '',
          deadline: parsed.deadline || '',

          percent_or_workload: '',
          grade: '',
          domain: '',
          dg: '',

          raw_snippet: parsed.raw_snippet || '',
          detail_text: '',

          first_seen_at: new Date(),
          last_seen_at: new Date(),
          run_id: runId
        })
      );
    });
  });

  const dedupedJobs = dedupeBundDeRssJobsByGuid_(collectedJobs);
  const normalizedRows = dedupedJobs.map(job => normalizeJobRecord_(job));
  const upsertStats = upsertJobsToAll_(normalizedRows);

  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  normalizedRows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'BundDE',
    mode: 'rss',
    label_or_endpoint: 'RSS/BundDE',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: dedupedJobs.length,
    rows_input_to_upsert: normalizedRows.length,
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


function buildBundDeRssUrl_(query, states) {
  query = query || 'ökonom';
  states = states || [];

  const base = 'https://www.service.bund.de/Content/DE/Stellen/Suche/Formular.html';

  const params = [
    'nn=4642046',
    'type=0',
    'resultsPerPage=100',
    'templateQueryString=' + encodeURIComponent(query),
    'cl2Categories_AnstellungsdauerNeu=' + encodeURIComponent('_unbefristet'),
    'sortOrder=' + encodeURIComponent('dateOfIssue_dt desc'),
    'jobsrss=true'
  ];

  states.forEach(state => {
    params.push('cl2Addresses_Adresse_State=' + encodeURIComponent(state));
  });

  return base + '?' + params.join('&');
}


function fetchBundDeRssItems_(rssUrl) {
  const xml = UrlFetchApp.fetch(rssUrl, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  }).getContentText();

  const doc = XmlService.parse(xml);
  const root = doc.getRootElement();
  const channel = root.getChild('channel');
  if (!channel) return [];

  return channel.getChildren('item') || [];
}

function parseBundDeRssDescription_(html) {
  const clean = String(html || '');

  const employerMatch = clean.match(/Arbeitgeber:\s*<strong>(.*?)<\/strong>/i);
  const locationMatch = clean.match(/Ort:\s*<strong>(.*?)<\/strong>/i);
  const deadlineMatch = clean.match(/Bewerbungsfrist:\s*<strong>(.*?)<\/strong>/i);

  const employer = employerMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(stripHtmlZrh_(employerMatch[1]))))
    : '';

  const location = locationMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(stripHtmlZrh_(locationMatch[1]))))
    : '';

  const deadlineText = deadlineMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(deadlineMatch[1])))
    : '';

  return {
    employer,
    location,
    deadline: parseBundDeDate_(deadlineText),
    raw_snippet: [
      employer ? ('Arbeitgeber: ' + employer) : '',
      location ? ('Ort: ' + location) : '',
      deadlineText ? ('Bewerbungsfrist: ' + deadlineText) : ''
    ].filter(Boolean).join(' | ')
  };
}

function cleanBundDeUrl_(url) {
  let s = String(url || '').trim();
  if (!s) return '';
  s = s.replace(/#.*$/, '');
  return s;
}


function dedupeBundDeRssJobsByGuid_(jobs) {
  const seen = new Map();

  jobs.forEach(job => {
    const key = cleanBundDeUrl_(job.raw_source_id || job.url || '');
    if (!key) return;

    if (!seen.has(key)) {
      seen.set(key, job);
    }
  });

  return Array.from(seen.values());
}

function decodeNumericHtmlEntities_(text) {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function getBundDeLocationBoost_(location) {
  const loc = normalizeText_(location);

  if (!loc) {
    return { delta: 0, positive: [], negative: [] };
  }

  if (loc.includes('berlin')) {
    return { delta: 2.5, positive: ['LOC:berlin'], negative: [] };
  }
  if (loc.includes('potsdam')) {
    return { delta: 2.0, positive: ['LOC:potsdam'], negative: [] };
  }
  if (loc.includes('hamburg')) {
    return { delta: 2.0, positive: ['LOC:hamburg'], negative: [] };
  }
  if (loc.includes('münchen') || loc.includes('muenchen')) {
    return { delta: 1.5, positive: ['LOC:münchen'], negative: [] };
  }
  if (loc.includes('stuttgart')) {
    return { delta: 1.5, positive: ['LOC:stuttgart'], negative: [] };
  }

  return { delta: 0, positive: [], negative: [] };
}


//for scoring
function getBundDeLocationPositiveHits_(location) {
  const loc = normalizeText_(location);
  if (!loc) return [];

  if (loc.includes('berlin')) return [formatWeightedHit_('LOC:berlin', 2.5)];
  if (loc.includes('potsdam')) return [formatWeightedHit_('LOC:potsdam', 2.0)];
  if (loc.includes('hamburg')) return [formatWeightedHit_('LOC:hamburg', 2.0)];
  if (loc.includes('münchen') || loc.includes('muenchen')) return [formatWeightedHit_('LOC:münchen', 1.5)];
  if (loc.includes('stuttgart')) return [formatWeightedHit_('LOC:stuttgart', 1.5)];

  return [];
}


// *****************************************
// 6C. bund.de Crawler (ALT bzw. BACKUP)
// *****************************************




function scanBundDeJobsToAllRELICT(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const states = BUNDDE_TARGET_STATES;
  const queries = BUNDDE_QUERIES;

  const extractedJobs = [];
  let itemsSeen = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  queries.forEach(query => {
    const firstPageHtml = fetchBundDeSearchResultsRaw_(query, 1, states);
    const totalPages = extractBundDeTotalPages_(firstPageHtml);
    const maxPages = Math.min(totalPages, 3);

    for (let page = 1; page <= maxPages; page++) {
      const html = page === 1
        ? firstPageHtml
        : fetchBundDeSearchResultsRaw_(query, page, states);

      const pageJobs = extractBundDeJobsFromRaw_(html);

      itemsSeen += pageJobs.length;
      extractedJobs.push.apply(extractedJobs, pageJobs);
    }
  });

  const dedupedJobs = dedupeBundDeJobsByCanonicalUrl_(extractedJobs);

  const enrichedJobs = dedupedJobs.map(job => {
    if (!shouldFetchBundDeDetail_(job)) return job;

    detailFetchAttempted++;
    const enriched = enrichBundDeJobFromDetailPage_(job);
    if (enriched && enriched.location) detailFetchCount++;
    return enriched;
  });

  const canonicalJobs = enrichedJobs.map(job =>
    buildCanonicalJob_({
      source: 'BundDE',
      source_label: 'Crawler/BundDE',
      raw_source_id: job.raw_source_id || job.url || '',
      url: job.url || '',

      title: job.title || '',
      employer: job.employer || '',
      location: job.location || '',
      mail_date: job.mail_date || new Date(),
      deadline: job.deadline || '',
      percent_or_workload: job.percent_or_workload || '',
      grade: job.grade || '',
      domain: job.domain || '',
      dg: job.dg || '',

      raw_snippet: job.raw_snippet || '',
      detail_text: job.detail_text || '',

      first_seen_at: new Date(),
      last_seen_at: new Date(),
      run_id: runId
    })
  );

  const normalizedRows = canonicalJobs.map(job => normalizeJobRecord_(job));
  const upsertStats = upsertJobsToAll_(normalizedRows);

  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  normalizedRows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'BundDE',
    mode: 'crawler',
    label_or_endpoint: 'Crawler/BundDE',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: dedupedJobs.length,
    rows_input_to_upsert: normalizedRows.length,
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


function dedupeBundDeJobsByCanonicalUrl_(jobs) {
  const seen = new Map();

  jobs.forEach(job => {
    const key = canonicalizeBundDeUrl_(job.url || job.raw_source_id || '');
    if (!key) return;
    if (!seen.has(key)) {
      seen.set(key, Object.assign({}, job, {
        url: key,
        raw_source_id: key
      }));
    }
  });

  return Array.from(seen.values());
}


function fetchBundDeSearchResultsRaw_(query, page, states) {
  query = query || 'ökonom';
  page = page || 1;
  states = states || [];

  const baseUrl = 'https://www.service.bund.de/Content/DE/Stellen/Suche/Formular.html';

  const params = [
    'nn=4642046',
    'resourceId=4642034',
    'input_=4642046',
    'pageLocale=de',
    'type=0',
    'submit=Finden',
    'resultsPerPage=100',
    'templateQueryString=' + encodeURIComponent(query),
    'gts=' + encodeURIComponent('4642266_list=dateOfIssue_dt+desc'),
    'cl2Categories_AnstellungsdauerNeu=' + encodeURIComponent('_unbefristet')
  ];

  states.forEach(state => {
    params.push('cl2Addresses_Adresse_State=' + encodeURIComponent(state));
  });

  if (page > 1) {
    params.push('gtp=' + encodeURIComponent('4642266_list=' + page));
  }

  const url = baseUrl + '?' + params.join('&');

  const res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('BundDE fetch failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 500));
  }

  return res.getContentText();
}

function extractBundDeJobsFromRaw_(raw) {
  const html = String(raw || '');
  const jobs = [];

  const listMatch = html.match(/<ul class="result-list">([\s\S]*?)<\/ul>/i);
  if (!listMatch) return jobs;

  const listHtml = listMatch[1];

  const itemRegex = /<li>\s*<a href="([^"]+)"[\s\S]*?<h3>\s*<em>Stellenbezeichnung<\/em>([\s\S]*?)<\/h3>[\s\S]*?<p>\s*<em>Arbeitgeber<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<p>\s*<em>Veröffentlicht<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<p>\s*<em>Bewerbungsfrist<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<\/a>\s*<\/li>/gi;

  let match;
  while ((match = itemRegex.exec(listHtml)) !== null) {
    const relativeUrl = htmlDecode_(match[1].trim());
    const rawUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : 'https://www.service.bund.de/' + relativeUrl.replace(/^\/+/, '');

    const url = canonicalizeBundDeUrl_(rawUrl);

    const title = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[2])));
    const employer = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[3])));
    const publishedText = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[4])));
    const deadlineText = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[5])));

    const mailDate = parseBundDeDate_(publishedText);
    const deadline = parseBundDeDate_(deadlineText);

    const rawSnippet = [
      title,
      employer,
      publishedText ? ('Veröffentlicht: ' + publishedText) : '',
      deadlineText ? ('Bewerbungsfrist: ' + deadlineText) : ''
    ].filter(Boolean).join(' | ');

    jobs.push({
      title,
      employer,
      location: '',
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      mail_date: mailDate || '',
      deadline: deadline || '',
      url,
      raw_source_id: url,
      raw_snippet: rawSnippet
    });
  }

  return jobs;
}


function cleanBundDeText_(text) {
  return String(text || '')
    .replace(/\u00AD/g, '')   // soft hyphen
    .replace(/\u200B/g, '')   // zero width space
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBundDeDate_(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
  if (!m) return '';

  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = Number(m[3]);

  if (year < 100) {
    year += 2000;
  }

  return new Date(year, month, day);
}


function extractBundDeTotalPages_(html) {
  const text = String(html || '');

  const m = text.match(/<p>\s*(\d+)\s+von\s+(\d+)\s*<\/p>/i);
  if (!m) return 1;

  return Number(m[2]) || 1;
}



function fetchBundDeDetailHtml_(url) {
  let lastError = null;

  for (let i = 0; i < 3; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error('BundDE detail fetch failed: HTTP ' + code + ' | url=' + url);
      }

      return res.getContentText();
    } catch (e) {
      lastError = e;
      Utilities.sleep(1000);
    }
  }

  throw lastError;
}

function extractBundDeLocationFromDetailHtml_(html) {
  const source = String(html || '');

  const dtMatch = source.match(/<dt>\s*Ort\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (dtMatch) {
    let raw = String(dtMatch[1] || '');

    raw = raw.replace(/<br\s*\/?>[\s\S]*$/i, ' ');
    raw = raw.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, ' ');

    const value = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(raw)));
    if (value) return value;
  }

  const mapMatch = source.match(/data-marker-tooltip="([^"]+)"/i);
  if (mapMatch) {
    const value = cleanBundDeText_(htmlDecode_(mapMatch[1]));
    if (value) return value;
  }

  return '';
}

function extractBundDeGradeFromDetailHtml_(html) {
  const source = String(html || '');

  const dtMatch = source.match(/<dt>\s*Laufbahn\s*\/\s*Entgeltgruppe\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (!dtMatch) return '';

  return cleanBundDeText_(htmlDecode_(stripHtmlZrh_(dtMatch[1])));
}

function extractBundDeDetailText_(html) {
  const text = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(String(html || ''))));
  return text ? text.slice(0, 5000) : '';
}

function enrichBundDeJobFromDetailPage_(job) {
  if (!job || !job.url) return job;

  const cleanUrl = canonicalizeBundDeUrl_(job.url);

  try {
    const html = fetchBundDeDetailHtml_(cleanUrl);

    const location = extractBundDeLocationFromDetailHtml_(html);
    const grade = extractBundDeGradeFromDetailHtml_(html);
    const detailText = extractBundDeDetailText_(html);

    return Object.assign({}, job, {
      url: cleanUrl,
      raw_source_id: cleanUrl,
      location: location || job.location || '',
      grade: grade || job.grade || '',
      detail_text: detailText || job.detail_text || ''
    });
  } catch (e) {
    Logger.log('BundDE detail fetch failed for ' + cleanUrl + ': ' + e);
    return Object.assign({}, job, {
      url: cleanUrl,
      raw_source_id: cleanUrl
    });
  }
}


function shouldFetchBundDeDetail_(job) {
  const text = normalizeText_(
    cleanBundDeText_([
      job.title,
      job.employer,
      job.raw_snippet
    ].filter(Boolean).join(' '))
  );

  const triggers = [
    'referent',
    'oekonom',
    'ökonom',
    'wissenschaftlich',
    'analyse',
    'analyst',
    'grundsatz',
    'strategie',
    'data',
    'daten',
    'modell'
  ];

  return triggers.some(t => text.includes(normalizeText_(t)));
}


function canonicalizeBundDeUrl_(url) {
  let s = String(url || '').trim();
  if (!s) return '';

  s = s.replace(/;jsessionid=[^?]+/i, '');
  s = s.replace(/(\/[^\/]+\.html).*/i, '$1');

  if (!/^https?:\/\//i.test(s)) {
    s = 'https://www.service.bund.de/' + s.replace(/^\/+/, '');
  }

  return s;
}


