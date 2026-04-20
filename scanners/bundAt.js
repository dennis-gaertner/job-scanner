//recht karge quelle, zu wenig angaben, um überhaupt details einzulesen



function testScanBundAtJobs() {
  const result = scanBundAtJobsToAll('test-bundat');
  Logger.log(JSON.stringify(result));
}



function scanBundAtJobsToAll(runId, target) {
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

  const fetchedJobs = fetchBundAtViennaJobs_();
  Logger.log('BundAT fetched jobs: ' + fetchedJobs.length);

  if (!fetchedJobs.length) {
    const emptyResult = {
      source: 'BundAT',
      mode: 'api',
      label_or_endpoint: 'BundAT',
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

  const normalizedRows = fetchedJobs.map(rawJob => {
    const job = mapBundAtJobToJobRecord_(rawJob, runId, now);
    return normalizeJobRecord_(job);
  });

  const upsertStats = target === 'test'
    ? upsertRowsToSheetByName_(
        CONFIG.testSink.spreadsheetId,
        CONFIG.testSink.sheets.bundAt,
        normalizedRows
      )
    : upsertJobsToAll_(normalizedRows);

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

  const result = {
    source: 'BundAT',
    mode: 'api',
    label_or_endpoint: 'BundAT',
    items_seen: fetchedJobs.length,
    jobs_parsed: fetchedJobs.length,
    rows_input_to_upsert: normalizedRows.length,
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


function isStrictViennaBundAtJob_(job) {
  const dienstort = cleanBundAtText_(job.Zzdienstort).toLowerCase();

  // harter Filter: nur echte Wien-Treffer
  if (dienstort.includes('wien')) return true;

  return false;
}


function fetchBundAtViennaJobs_() {
  const baseUrl =
    'https://bund.jobboerse.gv.at/sap/opu/odata/sap/ZGW_EREC_JOBSUCHE_SRV/Jobs';

  const pageSize = 50;
  let skip = 0;
  let allResults = [];

  while (true) {
    const url =
      baseUrl +
      '?sap-client=100' +
      '&$skip=' + skip +
      '&$top=' + pageSize +
      //'&$filter=' + encodeURIComponent("Regio eq 'W' and LogOpFts eq 'OR' and LogOpAts eq 'AND'") +
      //because filter regio eq W returned also jobs outside vienne. not reliable.
      "&$filter=" + encodeURIComponent("LogOpFts eq 'OR' and LogOpAts eq 'AND'")
      '&$expand=JobsToRegions' +
      '&$format=json';

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Accept: 'application/json'
      },
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const text = response.getContentText();

    if (status !== 200) {
      throw new Error(
        'fetchBundAtViennaJobs_: HTTP ' + status + ' | ' + text.slice(0, 500)
      );
    }

    const json = JSON.parse(text);
    const results = (((json || {}).d || {}).results) || [];

    const viennaResults = results.filter(isStrictViennaBundAtJob_);
    allResults = allResults.concat(viennaResults);

    
    const rejected = results.filter(r => !isStrictViennaBundAtJob_(r));
    Logger.log('Rejected (non-Vienna): ' + rejected.length);

    if (results.length < pageSize) {
      break;
    }

    skip += pageSize;
  }

  return allResults;
}


function mapBundAtJobToJobRecord_(job, runId, now) {
  const rawSourceId = String(job.PinstGuid || '').trim();
  const title = cleanBundAtText_(job.PostingHeader);
  const employer = cleanBundAtText_(job.RessortTxt);
  const location = normalizeBundAtLocation_(job);
  const mailDate = parseSapDateToDateOrBlank_(job.PublishedBegda);
  const deadline = parseSapDateToDateOrBlank_(job.EndDate);

  return {
    source: 'BundAT',
    source_label: 'Bundesjobbörse Österreich',
    raw_source_id: rawSourceId,
    url: buildBundAtDetailUrl_(rawSourceId),

    title: title,
    employer: employer,
    location: location,
    mail_date: mailDate,
    deadline: deadline,
    percent_or_workload: '',
    grade: '',
    domain: '',
    dg: '',

    raw_snippet: buildBundAtRawSnippet_(job),
    detail_text: '',

    first_seen_at: now,
    last_seen_at: now,
    run_id: runId || ''
  };
}


function buildBundAtDetailUrl_(rawSourceId) {
  if (!rawSourceId) return '';
  return 'https://bund.jobboerse.gv.at/sap/bc/jobs/#/details/' + encodeURIComponent(rawSourceId);
}


function normalizeBundAtLocation_(job) {
  const dienstort = cleanBundAtText_(job.Zzdienstort);
  if (dienstort) return dienstort;

  const regions = ((job.JobsToRegions || {}).results) || [];
  const regionCodes = regions
    .map(r => cleanBundAtText_(r.Regio))
    .filter(Boolean);

  if (regionCodes.length) {
    return regionCodes.join(', ');
  }

  return 'Wien';
}


function buildBundAtRawSnippet_(job) {
  const parts = [
    cleanBundAtText_(job.RessortTxt),
    cleanBundAtText_(job.Zzdienstort),
    cleanBundAtText_(job.FunctionalAreaTxt),
    cleanBundAtText_(job.TgroupTxt),
    cleanBundAtText_(job.OfferTxt)
  ].filter(Boolean);

  return parts.join(' | ');
}


function parseSapDateToDateOrBlank_(sapDate) {
  const match = String(sapDate || '').match(/\/Date\((\d+)\)\//);
  if (!match) return '';

  const millis = Number(match[1]);
  if (!millis) return '';

  return new Date(millis);
}


function cleanBundAtText_(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}