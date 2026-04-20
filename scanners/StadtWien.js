// to do: time stamp uses now instead of new Date()


function testScanStadtWienJobs() {
  const result = scanStadtWienJobsToAll('test-stadtwien');
  Logger.log(JSON.stringify(result));
}



function scanStadtWienJobsToAll(runId, target) {
  runId = runId || Utilities.getUuid();
  target = target || 'prod';

  if (!['prod', 'test'].includes(target)) {
    throw new Error('Invalid target: ' + target);
  }

  if (target === 'test') {
    setupTestJobSheets_();
  } else {
    setupJobSheets_();
  }

  const rawJobs = fetchStadtWienJobs_();
  Logger.log('StadtWien fetched jobs: ' + rawJobs.length);

  if (!rawJobs.length) {
    const emptyResult = {
      source: 'StadtWien',
      mode: 'api',
      label_or_endpoint: 'https://emea3.recruitmentplatform.com/fo/rest/jobs',
      items_seen: 0,
      jobs_parsed: 0,
      rows_input_to_upsert: 0,
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      status: 'ok',
      message: ''
    };
    Logger.log(JSON.stringify(emptyResult));
    return emptyResult;
  }

  const now = new Date();

  const rows = rawJobs.map(rawJob => {
    const job = mapStadtWienJobToJobRecord_(rawJob, runId, now);
    return normalizeJobRecord_(job);
  });

  const upsertStats = target === 'test'
    ? upsertRowsToSheetByName_(
        CONFIG.testSink.spreadsheetId,
        CONFIG.testSink.sheets.stadtWien,
        rows
      )
    : upsertJobsToAll_(rows);

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

  const result = {
    source: 'StadtWien',
    mode: 'api',
    label_or_endpoint: 'https://emea3.recruitmentplatform.com/fo/rest/jobs',
    items_seen: rawJobs.length,
    jobs_parsed: rawJobs.length,
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

  Logger.log(JSON.stringify(result));
  return result;
}


function fetchStadtWienJobs_() {
  const baseUrl =
    'https://emea3.recruitmentplatform.com/fo/rest/jobs' +
    '?sortBy=DPOSTINGSTART' +
    '&sortOrder=desc';

  const pageSize = 50;
  let firstResult = 0;
  let allResults = [];

  while (true) {
    const url =
      baseUrl +
      '&firstResult=' + firstResult +
      '&maxResults=' + pageSize;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'lumesse-language': 'DE',
        'username': 'QYOFK026203F3VBQBLO8MV7XN:guest:FO',
        'password': 'guest',
        'Origin': 'https://jobs.wien.gv.at',
        'Referer': 'https://jobs.wien.gv.at/'
      },
      payload: JSON.stringify({
        searchCriteria: {}
      }),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const text = response.getContentText();

    if (status !== 200) {
      throw new Error('fetchStadtWienJobs_: HTTP ' + status + ' | ' + text.slice(0, 500));
    }

    const json = JSON.parse(text);
    const results = extractStadtWienResults_(json);

    allResults = allResults.concat(results);

    if (results.length < pageSize) {
      break;
    }

    firstResult += pageSize;
  }

  return allResults;
}


function extractStadtWienResults_(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.jobs)) return json.jobs;
  if (json && Array.isArray(json.result)) return json.result;
  if (json && Array.isArray(json.results)) return json.results;
  if (json && json.d && Array.isArray(json.d.results)) return json.d.results;

  throw new Error(
    'extractStadtWienResults_: unknown response shape: ' +
    JSON.stringify(Object.keys(json || {}))
  );
}


function mapStadtWienJobToJobRecord_(job, runId, now) {
  const jf = job.jobFields || {};
  const rawSourceId = String(job.id || jf.id || '').trim();
  const title = String(jf.jobTitle || '').trim();
  const employer = String(jf.SDPTNAMELEVEL2 || 'Stadt Wien').trim();

  return {
    source: 'StadtWien',
    source_label: 'Stadt Wien',
    raw_source_id: rawSourceId,
    url: String(jf.applicationUrl || buildStadtWienDetailUrl_(rawSourceId, title)).trim(),
    title: title,
    employer: employer,
    location: 'Wien',
    mail_date: parseUnixMillisToDateOrBlank_(jf.DPOSTINGSTART),
    deadline: parseUnixMillisToDateOrBlank_(jf.DPOSTINGEND),
    percent_or_workload: '',
    grade: '',
    domain: '',
    dg: '',
    raw_snippet: employer + (jf.jobNumber ? ' | ' + jf.jobNumber : ''),
    detail_text: extractStadtWienDetailText_(job),
    first_seen_at: now,
    last_seen_at: now,
    run_id: runId || ''
  };
}


function parseUnixMillisToDateOrBlank_(value) {
  const n = Number(value);
  if (!n) return '';
  return new Date(n);
}

function extractStadtWienDetailText_(job) {
  const customFields = Array.isArray(job.customFields) ? job.customFields : [];

  return customFields
    .map(f => {
      const title = stripHtmlKn_(f.title || '');
      const content = stripHtmlKn_(f.content || '');
      return [title, content].filter(Boolean).join(': ');
    })
    .filter(Boolean)
    .join(' || ')
    .replace(/\s+/g, ' ')
    .trim();
}


function buildStadtWienDetailUrl_(job) {
  const jobId = String(job.jobId || job.id || '').trim();
  const jobTitle = String(job.jobTitle || job.title || '').trim();

  if (!jobId) return '';

  const encodedTitle = encodeURIComponent(jobTitle || '');
  return 'https://jobs.wien.gv.at/stellenangebote/details.html?jobTitle=' +
    encodedTitle +
    '&jobId=' +
    encodeURIComponent(jobId);
}


function buildStadtWienRawSnippet_(job) {
  const parts = [
    job.organization,
    job.department,
    job.location,
    job.employmentType,
    job.workingTime
  ].filter(Boolean);

  return parts.join(' | ');
}


function parseStadtWienDateToDateOrBlank_(value) {
  const text = String(value || '').trim();

  let m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  return '';
}


