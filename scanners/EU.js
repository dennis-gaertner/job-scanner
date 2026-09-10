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
          title: buildEuDisplayTitle_(job.title, job.unit, job.dg),
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