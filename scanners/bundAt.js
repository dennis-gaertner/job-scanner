function testScanBundAtJobs() {
  const result = scanBundAtJobsToAll('test-bundat');
  Logger.log(JSON.stringify(result));
}



function scanBundAtJobsToAll(runId) {
  const fetchedJobs = fetchBundAtViennaJobs_();
  Logger.log('BundAT fetched jobs: ' + fetchedJobs.length);

  if (!fetchedJobs.length) {
    return {
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0
    };
  }

  const now = new Date();

  const normalizedRows = fetchedJobs.map(rawJob => {
    const job = mapBundAtJobToJobRecord_(rawJob, runId, now);
    return normalizeJobRecord_(job);
  });

  return upsertJobsToAll_(normalizedRows);
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
      '&$filter=' + encodeURIComponent("Regio eq 'W' and LogOpFts eq 'OR' and LogOpAts eq 'AND'") +
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

    allResults = allResults.concat(results);

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