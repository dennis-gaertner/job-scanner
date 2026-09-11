// scanners/JobRoom.js — extracted without changing function implementations.

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
    const description = stripHtml_(String(deDesc.description || ''));
    
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
        title: stripHtml_(job.title),
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

  return {
    source: 'JobRoom',
    mode: 'api',
    label_or_endpoint: CONFIG.gmailLabels.jobroom,
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


function rescoreJobroom() {
  const result = rescoreJobsAllForSource_('JOBROOM');
  Logger.log(JSON.stringify(result, null, 2));
}


// *****************************************
// SKYGUIDE
// *****************************************



