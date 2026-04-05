// *****************************************
// KN MAIL SCANNER
// *****************************************



function isAaKnMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return (
  from.includes('jobsuche@arbeitsagentur.de') ||
  from.includes('@arbeitsagentur.de') ||
  /neues zu ihrer stellensuche/i.test(subject) ||
  /arbeitsagentur\.de\/jobsuche\/jobdetail\//i.test(html) ||
  /arbeitsagentur\.de\/jobsuche\/jobdetail\//i.test(plain)
  );
}








function scanAaKnJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.kn;
  const messages = getMessagesForLabel_(labelName)
    .filter(isAaKnMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.knLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractAaJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      let finalJob = {
        source: 'AA-KN',
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
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: extractAaJobIdFromUrl_(job.url) || job.url,
        run_id: runId,
      };

      if (looksTruncatedAaTitle_(finalJob.title)) {
        detailFetchAttempted++;
        const oldTitle = String(finalJob.title || '');
        finalJob = enrichAaJobFromDetailPage_(finalJob);
        if (String(finalJob.title || '') !== oldTitle) {
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
    source: 'AA-KN',
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


function rescoreAaKN() {
  const result = rescoreJobsAllForSource_('AA-KN');
  Logger.log(JSON.stringify(result, null, 2));
}





// *****************************************
// KN CRAWLER
// *****************************************


function scanAaKnCrawlerJobsToAll(runId) {

  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];

  const pageSize = 100;
  const maxPagesLimit = 10;

  const searchUrls = [
    'https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&wo=Konstanz&umkreis=10&arbeitszeit=vz;tz;ho&arbeitsort=Konstanz&zeitarbeit=true&veroeffentlichtseit=1'
  ];

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  searchUrls.forEach(searchUrl => {

    const params = parseUrlQueryParams_(searchUrl);

    const apiSearchParams = {
      was: params.was || '',
      wo: params.wo || '',
      umkreis: params.umkreis || '',
      arbeitszeit: params.arbeitszeit || '',
      veroeffentlichtseit: params.veroeffentlichtseit || '',
      angebotsart: params.angebotsart || '',
      befristung: params.befristung || '',
      behinderung: params.behinderung || '',
      corona: params.corona || ''
    };

    // zeitarbeit bewusst NICHT übergeben
    // obwohl es im Web-Link vorkommt
    // da die API damit stark einschränkt

    let page = 1;
    let maxPages = 1;

    do {

      const json = fetchAaApiPage_(apiSearchParams, page, pageSize);
      const jobs = extractAaJobsFromApiResponse_(json);

      Logger.log('KN page=' + page + ' maxErgebnisse=' + json.maxErgebnisse);
      Logger.log('KN jobs on page ' + page + ': ' + jobs.length);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      const total = Number(json.maxErgebnisse || 0);

      if (total > 0) {
        maxPages = Math.min(
          maxPagesLimit,
          Math.max(1, Math.ceil(total / pageSize))
        );
      }

      jobs.forEach(job => {

        rows.push(normalizeJobRecord_({
          source: 'AA-KN',
          source_label: 'Crawler/AA-KN',

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
          domain: '',
          dg: '',

          url: job.url,
          raw_snippet: job.rawSnippet || '',

          raw_source_id:
            job.raw_source_id ||
            extractAaJobIdFromUrl_(job.url) ||
            job.url,

          run_id: runId
        }));

      });

      page++;

    } while (page <= maxPages);

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
    source: 'AA-KN',
    mode: 'api',
    label_or_endpoint: 'Crawler/AA-KN',

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
// AA-CITIES CRAWLER
// *****************************************

const AA_CITIES_SEARCH_CONFIGS = [
  {
    name: 'Berlin',
    params: {
      wo: 'Berlin',
      umkreis: '10',
      arbeitszeit: 'vz;tz;ho',
      veroeffentlichtseit: '1',
      angebotsart: '1'
    }
  },
  {
    name: 'Hamburg',
    params: {
      wo: 'Hamburg',
      umkreis: '10',
      arbeitszeit: 'vz;tz;ho',
      veroeffentlichtseit: '1',
      angebotsart: '1'
    }
  },
  {
    name: 'München',
    params: {
      wo: 'München',
      umkreis: '10',
      arbeitszeit: 'vz;tz;ho',
      veroeffentlichtseit: '1',
      angebotsart: '1'
    }
  },
  {
    name: 'Stuttgart',
    params: {
      wo: 'Stuttgart',
      umkreis: '10',
      arbeitszeit: 'vz;tz;ho',
      veroeffentlichtseit: '1',
      angebotsart: '1'
    }
  }
];



function scanAaCitiesCrawlerJobsToAll(runId) {

  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];

  const pageSize = 100;
  const maxPagesLimit = 5; // erstmal konservativ

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  AA_CITIES_SEARCH_CONFIGS.forEach(cfg => {

    let page = 1;
    let maxPages = 1;

    do {

      const json = fetchAaApiPage_(cfg.params, page, pageSize);
      const jobs = extractAaJobsFromApiResponse_(json);

      Logger.log(`AA-Cities ${cfg.name} page=${page} total=${json.maxErgebnisse}`);
      Logger.log(`AA-Cities ${cfg.name} jobs on page ${page}: ${jobs.length}`);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      const total = Number(json.maxErgebnisse || 0);

      if (total > 0) {
        maxPages = Math.min(
          maxPagesLimit,
          Math.max(1, Math.ceil(total / pageSize))
        );
      }

      jobs.forEach(job => {

        rows.push(normalizeJobRecord_({
          source: 'AA-Cities',
          source_label: 'Crawler/AA-Cities',

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
          domain: '',
          dg: '',

          url: job.url,
          raw_snippet: job.rawSnippet || '',

          raw_source_id:
            job.raw_source_id ||
            extractAaJobIdFromUrl_(job.url) ||
            job.url,

          run_id: runId
        }));

      });

      page++;

    } while (page <= maxPages);

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
    source: 'AA-Cities',
    mode: 'api',
    label_or_endpoint: 'Crawler/AA-Cities',

    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,

    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,

    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,

    status: 'ok',
    message: ''
  };
}




// ***********************************
// COMMON UTILITIES
// ***********************************

function extractAaJobsFromHtml_(html) {
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
    .replace(/\s+/g, ' ')
    .trim();
  
  const blocks = cleaned.match(
    /<h2[\s\S]*?<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+"[\s\S]*?(?=<h2[\s\S]*?<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/|Alle aktuellen Stellen ansehen|Ihre Stellensuchen verwalten|<\/body>|$)/gi
  ) || [];
  
  blocks.forEach(block => {
    const urlMatch = block.match(/<a[^>]*href="(https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+)"/i);
    if (!urlMatch) return;
    
    const url = htmlDecode_(urlMatch[1].trim());
    
    const titleAnchorMatch = block.match(/<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleAnchorMatch
      ? htmlDecode_(stripHtmlKn_(titleAnchorMatch[1]).replace(/^\d+\.\s*/, '').trim())
      : '';
    
    const employerMatch = block.match(/<p[^>]*>\s*([^<]+?)\s*<\/p>/i);
    const employer = employerMatch ? htmlDecode_(employerMatch[1].trim()) : '';
    
    const metaValues = [...block.matchAll(/<span>([^<]+)<\/span>/gi)]
      .map(m => htmlDecode_(m[1].trim()))
      .filter(Boolean)
      .filter(v =>
        !/^stelle ansehen$/i.test(v) &&
        !/^\d+\.$/.test(v)
      );
    
    let location = '';
    let workload = '';
    let contractType = '';
    
    metaValues.forEach(v => {
      if (!location && /\(\d+\s*km\)|konstanz|kreuzlingen|radolfzell|singen|friedrichshafen/i.test(v)) {
        location = v;
        return;
      }
      
      if (!workload && /(vollzeit|teilzeit|minijob|homeoffice|schicht|nachtarbeit|wochenende)/i.test(v)) {
        workload = v;
        return;
      }
      
      if (!contractType && /(unbefristet|befristet|festanstellung|praktikum|ausbildung|duales studium)/i.test(v)) {
        contractType = v;
      }
    });
    
    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: [workload, contractType].filter(Boolean).join(' | '),
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, employer, location, workload, contractType].filter(Boolean).join(' | ')
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}


function extractAaJobIdFromUrl_(url) {
  const m = String(url || '').match(/\/jobsuche\/jobdetail\/([^/?#]+)/i);
  return m ? m[1].trim() : '';
}



function looksTruncatedAaTitle_(title) {
  const t = String(title || '').trim();
  if (!t) return false;
  
  return (
  t.length >= 45 &&
  !/[.!?:)]$/.test(t) &&
  /\b(i|im|in|für|mit|am|an|der|die|das)\s*$/i.test(t)
  );
}


function extractAaTitleFromDetailHtml_(html) {
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/\s+/g, ' ')
  .trim();
  
  const genericTitles = new Set([
  'Detailansicht des Stellenangebots',
  'Stellenangebot',
  'Jobsuche',
  'Detailansicht'
  ]);
  
  // 1) JSON-LD / strukturierte Daten versuchen
  const jsonLdMatches = [...cleaned.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const text = htmlDecode_(m[1]);
      const data = JSON.parse(text);
      
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        const title = item && (item.title || item.name);
        if (title && !genericTitles.has(String(title).trim())) {
          return String(title).trim();
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // 2) Meta property / og:title
  const ogTitleMatch = cleaned.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  || cleaned.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (ogTitleMatch) {
    const title = htmlDecode_(ogTitleMatch[1]).trim();
    if (title && !genericTitles.has(title)) {
      return title.replace(/\s*[-|–]\s*Jobsuche.*$/i, '').trim();
    }
  }
  
  // 3) Document title
  const titleMatch = cleaned.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  if (titleMatch) {
    const title = htmlDecode_(titleMatch[1])
    .replace(/\s*[-|–]\s*Jobsuche.*$/i, '')
    .trim();
    
    if (title && !genericTitles.has(title)) {
      return title;
    }
  }
  
  // 4) h1 nur verwenden, wenn nicht generisch
  const h1Match = cleaned.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i);
  if (h1Match) {
    const title = htmlDecode_(h1Match[1]).trim();
    if (title && !genericTitles.has(title)) {
      return title;
    }
  }
  
  return '';
}


function enrichAaJobFromDetailPage_(job) {
  if (!job || !job.url) return job;
  
  try {
    const html = fetchWithRetry_(job.url).getContentText();
    const fullTitle = extractAaTitleFromDetailHtml_(html);
    
    //Logger.log('KN DETAIL URL: ' + job.url);
    //Logger.log('KN DETAIL TITLE: ' + fullTitle);
    
    const oldTitle = String(job.title || '').trim();
    const newTitle = String(fullTitle || '').trim();
    const employer = String(job.employer || '').trim();
    
    if (!newTitle) return job;
    if (/^detailansicht des stellenangebots$/i.test(newTitle)) return job;
    if (newTitle.length <= oldTitle.length) return job;
    
    const normalizedOld = normalizeText_(oldTitle);
    const normalizedNew = normalizeText_(newTitle);
    const normalizedEmployer = normalizeText_(employer);
    
    if (
    normalizedEmployer &&
    normalizedNew === `${normalizedOld} bei ${normalizedEmployer}`
    ) {
      return job;
    }
    
    return Object.assign({}, job, {
      title: newTitle,
      raw_snippet: [newTitle, job.employer, job.location, job.percent_or_workload]
      .filter(Boolean)
      .join(' | ')
    });
  } catch (e) {
    //Logger.log('KN detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}


function buildAaApiSearchUrl_(searchParams, page, size) {
  const base = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs';

  const params = Object.assign({}, searchParams || {});
  params.page = page || 1;
  params.size = size || 100;

  const allowedKeys = [
    'was',
    'wo',
    'berufsfeld',
    'arbeitgeber',
    'veroeffentlichtseit',
    'zeitarbeit',
    'pav',
    'angebotsart',
    'befristung',
    'arbeitszeit',
    'behinderung',
    'corona',
    'umkreis'
  ];

  const query = allowedKeys
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .concat(['page', 'size'])
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    .join('&');

  return base + '?' + query;
}




function fetchAaApiPage_(searchParams, page, size) {
  const url = buildAaApiSearchUrl_(searchParams, page, size);

  const res = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'X-API-Key': 'jobboerse-jobsuche'
    }
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('KN API failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 800));
  }

  return JSON.parse(res.getContentText() || '{}');
}





function extractAaJobsFromApiResponse_(json) {
  const jobs = [];
  const items = (json && json.stellenangebote) || [];

  items.forEach(item => {
    const refnr = String(item.refnr || '').trim();
    const hashId = String(item.hashId || '').trim();

    const ort = item.arbeitsort || {};
    const location = [
      ort.plz,
      ort.ort,
      ort.region
    ].filter(Boolean).join(' ').trim();

    const title = String(item.titel || item.beruf || '').trim();
    const employer = String(item.arbeitgeber || '').trim();
    const publicationDate = item.aktuelleVeroeffentlichungsdatum
      ? new Date(item.aktuelleVeroeffentlichungsdatum)
      : new Date();

    const url = refnr
      ? 'https://www.arbeitsagentur.de/jobsuche/jobdetail/' + encodeURIComponent(refnr)
      : '';

    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      deadline: '',
      publication_date: publicationDate,
      url,
      rawSnippet: JSON.stringify({
        titel: item.titel,
        beruf: item.beruf,
        arbeitgeber: item.arbeitgeber,
        refnr: item.refnr
      }),
      raw_source_id: refnr || hashId || url
    });
  });

  return dedupeAaJobsBySourceId_(jobs);
}

function dedupeAaJobsBySourceId_(jobs) {
  const seen = new Set();

  return jobs.filter(job => {
    const key = String(job.raw_source_id || '').trim()
      || [job.title, job.employer, job.location].map(v => normalizeKeyPart_(v)).join('|');

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
