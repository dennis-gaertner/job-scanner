// *****************************************
// DELME
// *****************************************
function delme(){
  //deleteJobsBySource_('stadtwien');
  scanBundAtJobsToAll('test-bundat', 'test');
  scanStadtWienJobsToAll('test-stadtwien', 'test');
  scanAaCitiesCrawlerJobsToAll('test-aacities', 'test');
}


function previewAaCitiesApi() {

  const pageSize = 20; // bewusst klein für schnellen Überblick

  const results = [];

  AA_CITIES_SEARCH_CONFIGS.forEach(cfg => {

    try {

      const json = fetchAaApiPage_(cfg.params, 1, pageSize);
      const jobs = extractAaJobsFromApiResponse_(json);

      const total = Number(json.maxErgebnisse || 0);

      const sample = jobs.slice(0, 10).map(j => ({
        title: j.title,
        employer: j.employer,
        location: j.location
      }));

      Logger.log('==============================');
      Logger.log('CITY: ' + cfg.name);
      Logger.log('total: ' + total);
      Logger.log('jobs on page 1: ' + jobs.length);
      Logger.log('sample: ' + JSON.stringify(sample, null, 2));

      results.push({
        city: cfg.name,
        total: total,
        page_size: pageSize,
        jobs_on_page: jobs.length,
        sample: sample
      });

    } catch (e) {

      Logger.log('ERROR in city ' + cfg.name + ': ' + e);

      results.push({
        city: cfg.name,
        error: String(e)
      });
    }

  });

  const summary = {
    source: 'AA-Cities-Preview',
    cities: results
  };

  Logger.log('==============================');
  Logger.log('SUMMARY: ' + JSON.stringify(summary, null, 2));

  return summary;
}


function migrateKnToAaKnInJobsAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length <= 1) {
    Logger.log('Keine Datenzeilen in Jobs_All.');
    return {
      rows_updated: 0,
      source_updated: 0,
      source_label_updated: 0
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const sourceIdx = idx.source;
  const sourceLabelIdx = idx.source_label;

  let rowsUpdated = 0;
  let sourceUpdated = 0;
  let sourceLabelUpdated = 0;

  for (let r = 1; r < data.length; r++) {
    let changed = false;

    const source = String(data[r][sourceIdx] || '').trim();
    const sourceLabel = String(data[r][sourceLabelIdx] || '').trim();

    if (source === 'KN') {
      data[r][sourceIdx] = 'AA-KN';
      sourceUpdated++;
      changed = true;
    }

    if (sourceLabel === 'Crawler/KN') {
      data[r][sourceLabelIdx] = 'Crawler/AA-KN';
      sourceLabelUpdated++;
      changed = true;
    }

    if (changed) rowsUpdated++;
  }

  range.setValues(data);

  Logger.log(JSON.stringify({
    rows_updated: rowsUpdated,
    source_updated: sourceUpdated,
    source_label_updated: sourceLabelUpdated
  }, null, 2));

  return {
    rows_updated: rowsUpdated,
    source_updated: sourceUpdated,
    source_label_updated: sourceLabelUpdated
  };
}





function debugKeywordMatching() {
  const cases = [
    ['intern', 'international affairs manager'],
    ['intern', 'internship programme'],
    ['hochschulprakt*', 'hochschulpraktikum governance'],
    ['pflegefach*', 'pflegefachkraft hf'],
    ['strateg', 'strategie und steuerung'],
    ['strateg', 'strategic pricing manager'],
    ['working student', 'working student finance'],
    ['air traffic', 'air traffic management analyst'],
    ['re:\\bfg\\s+iv\\b', 'fg iv policy officer']
  ];

  cases.forEach(([keyword, text]) => {
    Logger.log(
      'keyword="' + keyword + '" | text="' + text + '" | match=' +
      matchesConfiguredKeyword_(text, keyword)
    );
  });
}


function auditRoleModelImpact_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      rows_seen: 0,
      rows_analyzed: 0,
      rows_with_role_impact: 0,
      avg_role_delta: 0,
      avg_role_share_of_total: 0,
      avg_role_vs_source: 0
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const requiredCols = [
    'unique_key',
    'source',
    'source_label',
    'raw_source_id',
    'url',
    'title',
    'employer',
    'location',
    'mail_date',
    'deadline',
    'percent_or_workload',
    'grade',
    'domain',
    'dg',
    'raw_snippet',
    'detail_text'
  ];

  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error('Required column missing in Jobs_All: ' + col);
    }
  });

  const out = [];
  let rowsAnalyzed = 0;
  let rowsWithRoleImpact = 0;
  let roleDeltaSum = 0;
  let roleShareSum = 0;
  let roleVsSourceSum = 0;
  let roleShareCount = 0;
  let roleVsSourceCount = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source] || '',
      source_label: row[idx.source_label] || '',
      raw_source_id: row[idx.raw_source_id] || '',
      url: row[idx.url] || '',
      title: row[idx.title] || '',
      employer: row[idx.employer] || '',
      location: row[idx.location] || '',
      mail_date: row[idx.mail_date] || '',
      deadline: row[idx.deadline] || '',
      percent_or_workload: row[idx.percent_or_workload] || '',
      grade: row[idx.grade] || '',
      domain: row[idx.domain] || '',
      dg: row[idx.dg] || '',
      raw_snippet: row[idx.raw_snippet] || '',
      detail_text: row[idx.detail_text] || ''
    };

    const source = String(job.source || '').toLowerCase();
    let rules = null;

    if (source === 'bundch') rules = CONFIG.scoring.bundchch;
    else if (source === 'bundde') rules = CONFIG.scoring.bundde;
    else if (source === 'oebb') rules = CONFIG.scoring.oebb;
    else if (source === 'sbb') rules = CONFIG.scoring.sbb;
    else if (source === 'eucareers') {
      rules = job.source_label === 'Crawler/EU-other'
        ? CONFIG.scoring.euOther
        : CONFIG.scoring.eu;
    }
    else if (source === 'lh') rules = CONFIG.scoring.lh;
    else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
    else if (source === 'kn') rules = CONFIG.scoring.kn;
    else if (source === 'zrh') rules = CONFIG.scoring.zrh;
    else if (source === 'airbus') rules = CONFIG.scoring.airbus;
    else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
    else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
    else if (source === 'db') rules = CONFIG.scoring.db;

    if (!rules) continue;

    rowsAnalyzed++;

    const gradePolicyResult = applyGradePolicy_(job, rules);

    let sourceScore = 0;
    let sourcePositive = [];
    let sourceNegative = [];
    let detailScore = 0;
    let detailPositive = [];
    let detailNegative = [];
    let learningDelta = 0;
    let learningPositive = [];
    let learningNegative = [];
    let dgDelta = 0;
    let dgPositive = [];
    let dgNegative = [];
    let locationBoost = 0;
    let locationPositive = [];
    let roleDelta = 0;
    let rolePositive = [];
    let roleNegative = [];
    let roleHardReject = false;

    const textForScoring = [
      job.title,
      job.percent_or_workload,
      job.grade,
      job.domain,
      job.dg,
      job.location,
      job.employer
    ].filter(Boolean).join(' ');

    if (!gradePolicyResult) {
      const sourceResult = scoreEntry_(
        textForScoring,
        rules.positiveKeywords,
        rules.negativeKeywords,
        rules.bonusPatterns
      );

      sourceScore = Number(sourceResult.score) || 0;
      sourcePositive = sourceResult.positive || [];
      sourceNegative = sourceResult.negative || [];

      if (source === 'bundch' && job.detail_text) {
        const detailResult = scoreEntry_(
          job.detail_text,
          CONFIG.bundDetail.positiveKeywords,
          CONFIG.bundDetail.negativeKeywords,
          CONFIG.bundDetail.bonusPatterns
        );

        detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, Number(detailResult.score) || 0));
        detailPositive = (detailResult.positive || []).map(hit => 'DETAIL:' + hit);
        detailNegative = (detailResult.negative || []).map(hit => 'DETAIL:' + hit);
      }

      const learning = getLearningAdjustment_(job);
      learningDelta = Number(learning.delta) || 0;
      learningPositive = learning.positive || [];
      learningNegative = learning.negative || [];

      const dgAdjustment = getEuDgAdjustment_(job);
      dgDelta = Number(dgAdjustment.delta) || 0;
      dgPositive = dgAdjustment.positive || [];
      dgNegative = dgAdjustment.negative || [];

      if (source === 'bundde') {
        locationBoost = Number(getBundDeLocationBoost_(job.location)) || 0;
        locationPositive = getBundDeLocationPositiveHits_(job.location) || [];
      }

      const roleModel = scoreRoleModel_(job);
      roleDelta = Number(roleModel.delta) || 0;
      rolePositive = roleModel.positive || [];
      roleNegative = roleModel.negative || [];
      roleHardReject = !!roleModel.hardRejectHit;
    }

    const sourceOnlyScore =
      (gradePolicyResult ? -999 : 0) +
      sourceScore +
      detailScore +
      learningDelta +
      dgDelta +
      locationBoost;

    const withRoleScore = sourceOnlyScore + roleDelta;

    const thresholds = getSourceThresholds_(job.source, job.source_label);

    const sourceOnlyNormalized =
      sourceOnlyScore === -999
        ? -999
        : normalizeScoreByThresholds_(sourceOnlyScore, thresholds);

    const withRoleNormalized =
      withRoleScore === -999
        ? -999
        : normalizeScoreByThresholds_(withRoleScore, thresholds);

    let sourceOnlyCategory = gradePolicyResult
      ? gradePolicyResult.category
      : assignCategory_(
          textForScoring,
          sourceOnlyScore,
          rules.hardReject || [],
          rules.thresholds
        );

    if (roleHardReject) {
      // current live system would still force ignore even if source-only looked okay
      // keep this explicit so the output is interpretable
    }

    let withRoleCategory = gradePolicyResult
      ? gradePolicyResult.category
      : assignCategory_(
          textForScoring,
          withRoleScore,
          rules.hardReject || [],
          rules.thresholds
        );

    if (roleHardReject) {
      withRoleCategory = 'Ignorieren';
    }

    const roleShareOfTotal =
      withRoleScore !== 0 ? roleDelta / withRoleScore : 0;

    const roleVsSource =
      sourceOnlyScore !== 0 ? roleDelta / sourceOnlyScore : '';

    if (roleDelta !== 0) rowsWithRoleImpact++;
    roleDeltaSum += roleDelta;

    if (withRoleScore !== 0) {
      roleShareSum += roleShareOfTotal;
      roleShareCount++;
    }

    if (sourceOnlyScore !== 0) {
      roleVsSourceSum += Number(roleVsSource) || 0;
      roleVsSourceCount++;
    }

    out.push({
      unique_key: row[idx.unique_key] || '',
      source: job.source || '',
      title: job.title || '',
      employer: job.employer || '',
      location: job.location || '',
      source_only_score: sourceOnlyScore,
      role_delta: roleDelta,
      with_role_score: withRoleScore,
      source_only_normalized: sourceOnlyNormalized,
      with_role_normalized: withRoleNormalized,
      source_only_category: sourceOnlyCategory,
      with_role_category: withRoleCategory,
      role_hard_reject: roleHardReject ? 'yes' : '',
      role_share_of_total: round4_(roleShareOfTotal),
      role_vs_source: roleVsSource === '' ? '' : round4_(roleVsSource),
      source_positive_hits: sourcePositive.concat(detailPositive, learningPositive, dgPositive, locationPositive).join(', '),
      source_negative_hits: sourceNegative.concat(detailNegative, learningNegative, dgNegative).join(', '),
      role_positive_hits: rolePositive.join(', '),
      role_negative_hits: roleNegative.join(', ')
    });
  }

  out.sort((a, b) => {
    const diff = Math.abs(Number(b.role_delta || 0)) - Math.abs(Number(a.role_delta || 0));
    if (diff !== 0) return diff;

    const shareDiff = Math.abs(Number(b.role_share_of_total || 0)) - Math.abs(Number(a.role_share_of_total || 0));
    if (shareDiff !== 0) return shareDiff;

    return String(a.source || '').localeCompare(String(b.source || ''));
  });

  const result = {
    rows_seen: data.length - 1,
    rows_analyzed: rowsAnalyzed,
    rows_with_role_impact: rowsWithRoleImpact,
    avg_role_delta: round4_(rowsAnalyzed ? roleDeltaSum / rowsAnalyzed : 0),
    avg_role_share_of_total: round4_(roleShareCount ? roleShareSum / roleShareCount : 0),
    avg_role_vs_source: round4_(roleVsSourceCount ? roleVsSourceSum / roleVsSourceCount : 0),
    top_examples: out.slice(0, 25)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function round4_(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}


function auditRoleModelRankingShift_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      rows_seen: 0,
      rows_analyzed: 0,
      changed_rank_positions_top100: 0,
      top100_current: [],
      top100_without_role: []
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source] || '',
      source_label: row[idx.source_label] || '',
      raw_source_id: row[idx.raw_source_id] || '',
      url: row[idx.url] || '',
      title: row[idx.title] || '',
      employer: row[idx.employer] || '',
      location: row[idx.location] || '',
      mail_date: row[idx.mail_date] || '',
      deadline: row[idx.deadline] || '',
      percent_or_workload: row[idx.percent_or_workload] || '',
      grade: row[idx.grade] || '',
      domain: row[idx.domain] || '',
      dg: row[idx.dg] || '',
      raw_snippet: row[idx.raw_snippet] || '',
      detail_text: row[idx.detail_text] || ''
    };

    const source = String(job.source || '').toLowerCase();
    let rules = null;

    if (source === 'bundch') rules = CONFIG.scoring.bundchch;
    else if (source === 'bundde') rules = CONFIG.scoring.bundde;
    else if (source === 'oebb') rules = CONFIG.scoring.oebb;
    else if (source === 'sbb') rules = CONFIG.scoring.sbb;
    else if (source === 'eucareers') {
      rules = job.source_label === 'Crawler/EU-other'
        ? CONFIG.scoring.euOther
        : CONFIG.scoring.eu;
    }
    else if (source === 'lh') rules = CONFIG.scoring.lh;
    else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
    else if (source === 'kn') rules = CONFIG.scoring.kn;
    else if (source === 'zrh') rules = CONFIG.scoring.zrh;
    else if (source === 'airbus') rules = CONFIG.scoring.airbus;
    else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
    else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
    else if (source === 'db') rules = CONFIG.scoring.db;

    if (!rules) continue;

    const gradePolicyResult = applyGradePolicy_(job, rules);
    let sourceOnlyScore = 0;
    let withRoleScore = 0;
    let roleDelta = 0;

    if (gradePolicyResult) {
      sourceOnlyScore = -999;
      withRoleScore = -999;
    } else {
      const textForScoring = [
        job.title,
        job.percent_or_workload,
        job.grade,
        job.domain,
        job.dg,
        job.location,
        job.employer
      ].filter(Boolean).join(' ');

      const sourceResult = scoreEntry_(
        textForScoring,
        rules.positiveKeywords,
        rules.negativeKeywords,
        rules.bonusPatterns
      );

      let detailScore = 0;
      if (source === 'bundch' && job.detail_text) {
        const detailResult = scoreEntry_(
          job.detail_text,
          CONFIG.bundDetail.positiveKeywords,
          CONFIG.bundDetail.negativeKeywords,
          CONFIG.bundDetail.bonusPatterns
        );
        detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, Number(detailResult.score) || 0));
      }

      const learning = getLearningAdjustment_(job);
      const dgAdjustment = getEuDgAdjustment_(job);
      const locationBoost = source === 'bundde'
        ? Number(getBundDeLocationBoost_(job.location)) || 0
        : 0;

      const roleModel = scoreRoleModel_(job);

      sourceOnlyScore =
        (Number(sourceResult.score) || 0) +
        detailScore +
        (Number(learning.delta) || 0) +
        (Number(dgAdjustment.delta) || 0) +
        locationBoost;

      roleDelta = Number(roleModel.delta) || 0;
      withRoleScore = sourceOnlyScore + roleDelta;
    }

    rows.push({
      unique_key: row[idx.unique_key] || '',
      source: job.source || '',
      title: job.title || '',
      employer: job.employer || '',
      current_score: withRoleScore,
      no_role_score: sourceOnlyScore,
      role_delta: roleDelta
    });
  }

  const currentSorted = rows.slice().sort(compareAuditRowsByCurrentScore_);
  const noRoleSorted = rows.slice().sort(compareAuditRowsByNoRoleScore_);

  const currentTop100 = currentSorted.slice(0, 100);
  const noRoleTop100 = noRoleSorted.slice(0, 100);

  const currentPos = {};
  const noRolePos = {};

  currentTop100.forEach((row, i) => currentPos[row.unique_key] = i + 1);
  noRoleTop100.forEach((row, i) => noRolePos[row.unique_key] = i + 1);

  const unionKeys = [...new Set(
    currentTop100.map(r => r.unique_key).concat(noRoleTop100.map(r => r.unique_key))
  )];

  const changes = unionKeys.map(key => {
    const currentRank = currentPos[key] || '';
    const noRoleRank = noRolePos[key] || '';

    const currentRow = currentTop100.find(r => r.unique_key === key);
    const noRoleRow = noRoleTop100.find(r => r.unique_key === key);
    const ref = currentRow || noRoleRow;

    return {
      unique_key: key,
      source: ref ? ref.source : '',
      title: ref ? ref.title : '',
      employer: ref ? ref.employer : '',
      current_rank: currentRank,
      no_role_rank: noRoleRank,
      current_score: currentRow ? currentRow.current_score : '',
      no_role_score: noRoleRow ? noRoleRow.no_role_score : '',
      role_delta: ref ? ref.role_delta : '',
      rank_shift: computeRankShift_(currentRank, noRoleRank)
    };
  });

  changes.sort((a, b) => {
    const da = Math.abs(Number(a.rank_shift) || 999);
    const db = Math.abs(Number(b.rank_shift) || 999);
    return db - da;
  });

  const changedRankPositionsTop100 = changes.filter(x => x.current_rank !== x.no_role_rank).length;

  const result = {
    rows_seen: data.length - 1,
    rows_analyzed: rows.length,
    changed_rank_positions_top100: changedRankPositionsTop100,
    top100_current: currentTop100.slice(0, 20),
    top100_without_role: noRoleTop100.slice(0, 20),
    biggest_shifts: changes.slice(0, 30)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function compareAuditRowsByCurrentScore_(a, b) {
  const s = (Number(b.current_score) || 0) - (Number(a.current_score) || 0);
  if (s !== 0) return s;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function compareAuditRowsByNoRoleScore_(a, b) {
  const s = (Number(b.no_role_score) || 0) - (Number(a.no_role_score) || 0);
  if (s !== 0) return s;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function computeRankShift_(currentRank, noRoleRank) {
  if (currentRank === '' || noRoleRank === '') return '';
  return Number(noRoleRank) - Number(currentRank);
}


function auditRoleModelImpact() {
  return auditRoleModelImpact_();
}

function auditRoleModelRankingShift() {
  return auditRoleModelRankingShift_();
}



function auditRoleModelImpact_light() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  let roleShareSum = 0;
  let roleShareCount = 0;

  let roleVsSourceSum = 0;
  let roleVsSourceCount = 0;

  const outliers = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source],
      title: row[idx.title],
      employer: row[idx.employer]
    };

    const scoring = computeScoresForAudit_(row, idx); // wir kapseln das gleich

    if (!scoring) continue;

    const { sourceScore, roleDelta, totalScore } = scoring;

    if (totalScore !== 0) {
      const share = roleDelta / totalScore;
      roleShareSum += share;
      roleShareCount++;

      // OUTLIER: Role Model dominiert
      if (Math.abs(share) > 0.4) {
        outliers.push({
          title: job.title,
          source: job.source,
          role_share: round4_(share),
          role_delta: roleDelta,
          total: totalScore
        });
      }
    }

    if (sourceScore !== 0) {
      roleVsSourceSum += roleDelta / sourceScore;
      roleVsSourceCount++;
    }
  }

  const result = {
    avg_role_share: round4_(roleShareSum / roleShareCount),
    avg_role_vs_source: round4_(roleVsSourceSum / roleVsSourceCount),
    outliers_top: outliers.slice(0, 15)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function auditRoleModelRankingShift_light() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = [];

  for (let r = 1; r < data.length; r++) {
    const scoring = computeScoresForAudit_(data[r], idx);
    if (!scoring) continue;

    rows.push({
      key: data[r][idx.unique_key],
      title: data[r][idx.title],
      current: scoring.totalScore,
      noRole: scoring.sourceScore
    });
  }

  const topCurrent = rows.slice().sort((a,b)=>b.current-a.current).slice(0,50);
  const topNoRole = rows.slice().sort((a,b)=>b.noRole-a.noRole).slice(0,50);

  const setCurrent = new Set(topCurrent.map(r=>r.key));
  const setNoRole = new Set(topNoRole.map(r=>r.key));

  let overlap = 0;
  setCurrent.forEach(k => { if (setNoRole.has(k)) overlap++; });

  const result = {
    overlap_top50: overlap,
    changed: 50 - overlap
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function computeScoresForAudit_(row, idx) {
  const source = String(row[idx.source] || '').toLowerCase();
  const job = {
    source: row[idx.source],
    source_label: row[idx.source_label],
    title: row[idx.title],
    employer: row[idx.employer],
    location: row[idx.location],
    detail_text: row[idx.detail_text],
    domain: row[idx.domain],
    dg: row[idx.dg]
  };

  let rules = null;

  if (source === 'bundch') rules = CONFIG.scoring.bundchch;
  else if (source === 'bundde') rules = CONFIG.scoring.bundde;
  else if (source === 'oebb') rules = CONFIG.scoring.oebb;
  else if (source === 'sbb') rules = CONFIG.scoring.sbb;
  else if (source === 'eucareers') {
    rules = job.source_label === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther
      : CONFIG.scoring.eu;
  }
  else if (source === 'lh') rules = CONFIG.scoring.lh;
  else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
  else if (source === 'kn') rules = CONFIG.scoring.kn;
  else if (source === 'zrh') rules = CONFIG.scoring.zrh;
  else if (source === 'airbus') rules = CONFIG.scoring.airbus;
  else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
  else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
  else if (source === 'db') rules = CONFIG.scoring.db;

  if (!rules) return null;

  const text = [
    job.title,
    job.location,
    job.employer,
    job.domain,
    job.dg
  ].filter(Boolean).join(' ');

  const base = scoreEntry_(
    text,
    rules.positiveKeywords,
    rules.negativeKeywords,
    rules.bonusPatterns
  );

  const role = scoreRoleModel_(job);

  return {
    sourceScore: Number(base.score) || 0,
    roleDelta: Number(role.delta) || 0,
    totalScore: (Number(base.score) || 0) + (Number(role.delta) || 0)
  };
}

// *****************************************
// TEMPORÄR NÜTZLICH?
// *****************************************

