// scanners/Eurocontrol.js — extracted without changing function implementations.

function fetchEurocontrolAjaxHtml_(pageJob) {
  const url = 'https://jobs.eurocontrol.int/wp-admin/admin-ajax.php';
  
  const payload = {
    action: 'lumesse_ajax_modern_list',
    lanugage: '1',
    sendEvent: 'false',
    'params[0][key]': 'per_page',
    'params[0][val]': '100'
  };
  
  if (pageJob && pageJob > 1) {
    payload['params[1][key]'] = 'page_job';
    payload['params[1][val]'] = String(pageJob);
  }
  
  let lastError = null;
  
  for (let i = 0; i < 3; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        payload,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error('EUROCONTROL AJAX failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 500));
      }
      
      const data = JSON.parse(res.getContentText() || '{}');
      if (!data || !data.advertsHtml) {
        throw new Error('EUROCONTROL AJAX returned no advertsHtml');
      }
      
      return data.advertsHtml;
    } catch (e) {
      lastError = e;
      Utilities.sleep(1500);
    }
  }
  
  throw lastError;
}


function extractEurocontrolField_(itemHtml, fieldLabel) {
  const liMatches = [...String(itemHtml || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  
  for (const m of liMatches) {
    const liHtml = m[1];
    
    const labelMatch = liHtml.match(/<span[^>]*>\s*([^<]+?)\s*<\/span>\s*([\s\S]*)/i);
    if (!labelMatch) continue;
    
    const label = htmlDecode_(stripHtml_(labelMatch[1])).trim();
    const value = htmlDecode_(stripHtml_(labelMatch[2])).trim();
    
    if (normalizeText_(label) === normalizeText_(fieldLabel)) {
      return value;
    }
  }
  
  return '';
}


function parseEurocontrolDate_(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}



function extractEurocontrolJobsFromAjaxHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\\\//g, '/')
  .replace(/\\"/g, '"')
  .replace(/\\n/g, ' ')
  .replace(/\\t/g, ' ')
  .replace(/\s+/g, ' ');
  
  const itemRegex = /<li>\s*<div class="jobs-content"[\s\S]*?(?=<li>\s*<div class="jobs-content"|<\/ul>)/gi;
  const items = cleaned.match(itemRegex) || [];
  
  items.forEach(item => {
    const titleMatch = item.match(/<h3[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!titleMatch) return;
    
    const url = htmlDecode_(titleMatch[1].trim());
    const title = htmlDecode_(titleMatch[2].trim());
    
    const reference = extractEurocontrolField_(item, 'Reference Number');
    const closingDateText = extractEurocontrolField_(item, 'Closing date');
    const location = extractEurocontrolField_(item, 'Location');
    
    const pMatches = [...item.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => htmlDecode_(stripHtml_(m[1])))
    .map(s => s.trim())
    .filter(Boolean);
    
    const description = pMatches.join(' | ');
    
    let grade = '';
    const refUpper = String(reference || '').toUpperCase();
    const gradeMatch = refUpper.match(/(?:^|[-/ ])(AD|AST|FG)(?:[-/ ]|$)/);
    if (gradeMatch) grade = gradeMatch[1];
    
    jobs.push({
      title,
      location: location || '',
      employer: 'EUROCONTROL',
      percent_or_workload: '',
      grade,
      domain: '',
      dg: '',
      deadline: parseEurocontrolDate_(closingDateText),
      description,
      reference,
      url,
      rawSnippet: [title, reference, location, closingDateText, description]
      .filter(Boolean)
      .join(' | ')
    });
  });
  
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanEurocontrolJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 2;
  let itemsSeen = 0;
  let parsedJobsCount = 0;

  for (let page = 1; page <= pagesToScan; page++) {
    const ajaxHtml = fetchEurocontrolAjaxHtml_(page);
    const jobs = extractEurocontrolJobsFromAjaxHtml_(ajaxHtml);

    itemsSeen += jobs.length;
    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'EUROCONTROL',
        source_label: CONFIG.gmailLabels.eurocontrol,
        mail_date: new Date(),
        deadline: job.deadline || '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'EUROCONTROL',
        percent_or_workload: '',
        grade: job.grade || '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        raw_source_id: job.url,
        run_id: runId,
      }));
    });
  }

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  return {
    source: 'Eurocontrol',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.eurocontrol,
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
// DB
// *****************************************


