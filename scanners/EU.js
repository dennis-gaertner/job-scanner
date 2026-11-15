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
    .map(m => htmlDecode_(stripHtml_(m[1])).replace(/\s+/g, ' ').trim())
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




function extractEuJobsFromNewListing_(html) {
  const jobs = [];
  const text = String(html || '');

  // Each result starts with its own vacancy-result container.
  const startRegex = /<div\b[^>]*class="[^"]*\beujmp-vacancy-result\b[^"]*"[^>]*>/gi;
  const starts = [...text.matchAll(startRegex)];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length
      ? starts[i + 1].index
      : Math.min(text.length, start + 3000);

    const block = text.slice(start, end);

    const link = block.match(
      /<a\b[^>]*href="([^"]*\/jobs\/[^"]+_en)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!link) continue;

    const url = absolutizeEuUrl_(htmlDecode_(link[1]));
    const title = htmlDecode_(stripHtml_(link[2])).trim();

    const top = block.match(
      /<ul\b[^>]*class="[^"]*eujmp-vacancy-result__top-meta[^"]*"[^>]*>([\s\S]*?)<\/ul>/i
    );
    const bottom = block.match(
      /<ul\b[^>]*class="[^"]*eujmp-vacancy-result__bottom-meta[^"]*"[^>]*>([\s\S]*?)<\/ul>/i
    );

    const listValues = markup => markup
      ? [...markup.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
          .map(m => htmlDecode_(stripHtml_(m[1]))
            .replace(/\s+/g, ' ').trim())
      : [];

    const topValues = listValues(top && top[1]);
    const bottomValues = listValues(bottom && bottom[1]);

    const published = top && top[1].match(
      /<time\b[^>]*datetime="([^"]+)"/i
    );

    if (!title || !url) continue;

    jobs.push({
      title,
      url,
      employer: topValues[0] || '',
      publication_date: '',
        listing_deadline: published && published[1]
          ? new Date(published[1])
          : '',
      contract_type: bottomValues[0] || '',
      grade: bottomValues[1] || '',
      location: bottomValues[2] || ''
    });
  }

  return jobs;
}


function extractEuDetailField_(html, label) {
  const escapeRegex = s =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const re = new RegExp(
    '<strong>\\s*' + escapeRegex(label) +
    ':\\s*<\\/strong>\\s*([\\s\\S]*?)<\\/p>',
    'i'
  );

  const match = String(html || '').match(re);
  return match
    ? htmlDecode_(stripHtml_(match[1])).replace(/\s+/g, ' ').trim()
    : '';
}


function extractEuJobFromNewDetail_(html, listingJob) {
  const text = String(html || '');

  const deadlineMatch = text.match(
    /<strong>\s*Application deadline:\s*<\/strong>\s*<time\b[^>]*datetime="([^"]+)"/i
  );

  const deadline = deadlineMatch
    ? new Date(deadlineMatch[1])
    : listingJob.listing_deadline || '';

  const ogTitle = text.match(
    /<meta\s+property="og:title"\s+content="([^"]+)"/i
  );

  return {
    ...listingJob,
    title: ogTitle
      ? htmlDecode_(ogTitle[1]).trim()
      : listingJob.title,
    reference: extractEuDetailField_(text, 'Reference'),
    employer: extractEuDetailField_(text, 'Institution') ||
      listingJob.employer,
    location: extractEuDetailField_(text, 'Location') ||
      listingJob.location,
    domain: extractEuDetailField_(text, 'Domain'),
    contract_type: extractEuDetailField_(text, 'Contract type') ||
      listingJob.contract_type,
    grade: extractEuDetailField_(text, 'Grade') ||
      listingJob.grade,
    unit: extractEuDetailField_(text, 'Unit'),
    dg: extractEuDetailField_(
      text, 'Directorate-General or Department'
    ),
    deadline
  };
}


// Explicit DG and unit take priority over generic domains.
function buildEuDisplayTitleFromDetails_(job) {
  const title = String(job.title || '').trim();
  const dg = String(job.dg || '').trim();
  const unit = String(job.unit || '').trim();

  if (!title) return '';

  const extras = [];

  if (dg && !title.toLowerCase().includes(dg.toLowerCase())) {
    extras.push(dg);
  }

  if (unit &&
      !title.toLowerCase().includes(unit.toLowerCase())) {
    extras.push(unit);
  }

  return extras.length
    ? title + ' – ' + extras.join(' / ')
    : title;
}


// Collect rows, without writing to Jobs_All.
function collectEuCareersRows_(runId, pagesToScan) {
  const listingJobs = [];
  const seenUrls = new Set();

  for (let page = 0; page < pagesToScan; page++) {
    const url =
      'https://eu-careers.europa.eu/jobs_en' +
      '?sort%5Bname%5D=published_at' +
      '&sort%5Bdirection%5D=DESC' +
      '&page=' + page;
    const html = fetchWithRetry_(url).getContentText();
    const jobs = extractEuJobsFromNewListing_(html);

    if (!jobs.length) {
      throw new Error(
        'EU listing parser found zero jobs on page ' + page +
        ': ' + url
      );
    }

    jobs.forEach(job => {
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        listingJobs.push(job);
      }
    });
  }

  const detailedJobs = [];
  const batchSize = 10;

  for (let start = 0; start < listingJobs.length; start += batchSize) {
    const batch = listingJobs.slice(start, start + batchSize);

    const requests = batch.map(job => ({
      url: job.url,
      muteHttpExceptions: true,
      followRedirects: true
    }));

    const responses = UrlFetchApp.fetchAll(requests);

    responses.forEach((response, i) => {
      const job = batch[i];
      const status = response.getResponseCode();

      if (status !== 200) {
        Logger.log('EU detail HTTP ' + status + ': ' + job.url);
        return;
      }

      const html = response.getContentText();
      const detailed = extractEuJobFromNewDetail_(html, job);

      if (!detailed.employer) {
        Logger.log('EU detail missing institution: ' + job.url);
        return;
      }

      detailedJobs.push(detailed);
    });
  }

  if (!detailedJobs.length) {
    throw new Error('EU: no detail pages parsed successfully.');
  }

  const now = new Date();

  const rows = detailedJobs.map(job => {
    const isCommission =
      job.employer.trim().toLowerCase() === 'european commission';

    const title = buildEuDisplayTitleFromDetails_(job);

    return normalizeJobRecord_({
      source: 'EUCAREERS',
      source_label: isCommission
        ? 'Crawler/EU'
        : 'Crawler/EU-other',
      mail_date: job.publication_date || '',
      deadline: job.deadline || '',
      first_seen_at: now,
      last_seen_at: now,
      gmail_message_id: '',
      gmail_thread_id: '',
      title,
      location: job.location,
      employer: job.employer,
      percent_or_workload: '',
      grade: job.grade,
      domain: job.domain || '',
      dg: job.dg || '',
      url: job.url,
      raw_snippet: [
        job.title,
        job.employer,
        job.location,
        job.domain,
        job.dg,
        job.unit,
        job.contract_type,
        job.grade,
        job.reference
      ].filter(Boolean).join(' | '),
      raw_source_id: job.reference || job.url,
      run_id: runId
    });
  });

  return {
    rows,
    listingsFound: listingJobs.length,
    detailsParsed: detailedJobs.length
  };
}


// Retains the existing nightly scanner entry point.
function scanEuCareersJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const result = collectEuCareersRows_(runId, 3);
  const rows = result.rows;

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  return {
    source: 'EU',
    mode: 'crawler',
    label_or_endpoint: 'EU Careers / EU Other',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: result.listingsFound,
    jobs_parsed: result.detailsParsed,
    ...buildScanStats_(rows, upsertStats, idx),
    detail_fetch_attempted: result.listingsFound,
    detail_fetch_count: result.detailsParsed,
    status: 'ok',
    message: ''
  };
}


// Read-only test: does not write anything to Jobs_All.
function zzz_TEST_newEuScanner_() {
  const result = collectEuCareersRows_(
    'TEST-' + Utilities.getUuid(),
    1
  );

  const idx = indexMap_(JOBS_ALL_COLUMNS);

  Logger.log(
    'Listings: ' + result.listingsFound +
    ', details: ' + result.detailsParsed +
    ', normalized rows: ' + result.rows.length
  );

  result.rows.slice(0, 20).forEach((row, i) => {
    const fields = [
      'source_label',
      'title',
      'employer',
      'location',
      'domain',
      'dg',
      'grade',
      'mail_date',
      'deadline',
      'url',
      'raw_snippet'
    ];

    const record = {};

    fields.forEach(field => {
      record[field] = row[idx[field]];
    });

    Logger.log((i + 1) + ': ' + JSON.stringify(record));
  });
}


function rescoreEUCareers() {
  const result = rescoreJobsAllForSource_('EUCAREERS');
  Logger.log(JSON.stringify(result, null, 2));
}



// incorporate additional info such as dg into title
function buildEuDisplayTitle_(title, domain, rawSourceId) {
  const cleanTitle = String(title || '').trim();
  const cleanDomain = String(domain || '').trim();
  const cleanRawSourceId = String(rawSourceId || '').trim();

  if (!cleanTitle) return '';

  const titleLower = cleanTitle.toLowerCase();

  // 1) Prefer explicit domain when it is useful and not already contained in title.
  if (cleanDomain) {
    const domainLower = cleanDomain.toLowerCase();

    if (
      domainLower !== titleLower &&
      !titleLower.includes(domainLower)
    ) {
      return cleanTitle + ' – ' + cleanDomain;
    }
  }

  // 2) Fallback: derive EU/Commission code from raw_source_id / URL.
  const code = extractEuOrgCodeFromRawSourceId_(cleanRawSourceId);

  if (code && !titleLower.includes(code.toLowerCase())) {
    return cleanTitle + ' – ' + code;
  }

  return cleanTitle;
}


function extractEuOrgCodeFromRawSourceId_(rawSourceId) {
  const text = String(rawSourceId || '').toLowerCase();

  if (!text) return '';

  // Examples:
  // ec-2026-empl-516047 -> DG EMPL
  // ec-2026-sg-514992   -> SG
  // jrc-com-2026-828    -> JRC
  // cinea-2026-ta-ad6-15 -> CINEA

  let m = text.match(/\/ec-\d{4}-([a-z]+)-/i) || text.match(/\bec-\d{4}-([a-z]+)-/i);
  if (m && m[1]) {
    const code = m[1].toUpperCase();

    if (code === 'SG') return 'SG';

    return 'DG ' + code;
  }

  m = text.match(/\/([a-z]+)-\d{4}-/i) || text.match(/\b([a-z]+)-\d{4}-/i);
  if (m && m[1]) {
    const code = m[1].toUpperCase();

    // Avoid generic EC here; handled above.
    if (code === 'EC') return '';

    return code;
  }

  return '';
}