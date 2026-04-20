
// *****************************************
// 4. SCORING
// *****************************************

//central scoring function
function scoreJobBySource_(job) {
  const source = String(job.source || '').toLowerCase();

  let rules = null;
  if (source === 'bundch') rules = CONFIG.scoring.bundch;
  else if (source === 'bundde') rules = CONFIG.scoring.bundde;
  else if (source === 'bundat') rules = CONFIG.scoring.bundat;
  else if (source === 'oebb') rules = CONFIG.scoring.oebb;
  else if (source === 'sbb') rules = CONFIG.scoring.sbb;
  else if (source === 'eucareers') {
    rules = job.source_label === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther
      : CONFIG.scoring.eu;
  }
  else if (source === 'lh') rules = CONFIG.scoring.lh;
  else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
  else if (source === 'kn' || source === 'aa-kn') rules = CONFIG.scoring.kn;
  else if (source === 'zrh') rules = CONFIG.scoring.zrh;
  else if (source === 'airbus') rules = CONFIG.scoring.airbus;
  else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
  else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
  else if (source === 'db') rules = CONFIG.scoring.db;
  else if (source === 'stadtwien') rules = CONFIG.scoring.stadtwien;
  else if (source === 'aa-cities') rules = CONFIG.scoring.kn;

  if (!rules) {
    throw new Error('No scoring rules configured for source: ' + source);
  }

  const gradePolicyResult = applyGradePolicy_(job, rules);
  if (gradePolicyResult) {
    return Object.assign({}, gradePolicyResult, {
      normalizedScore: -999
    });
  }

  const textForScoring = [
    job.title,
    job.percent_or_workload,
    job.grade,
    job.domain,
    job.dg,
    job.location,
    job.employer
  ].filter(Boolean).join(' ');

  const result = scoreEntry_(
    textForScoring,
    rules.positiveKeywords,
    rules.negativeKeywords,
    rules.bonusPatterns
  );

  let detailScore = 0;
  let detailPositive = [];
  let detailNegative = [];

  if (source === 'bundch' && job.detail_text) {
    const detailResult = scoreEntry_(
      job.detail_text,
      CONFIG.bundDetail.positiveKeywords,
      CONFIG.bundDetail.negativeKeywords,
      CONFIG.bundDetail.bonusPatterns
    );

    detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, detailResult.score));
    detailPositive = detailResult.positive.map(hit => 'DETAIL:' + hit);
    detailNegative = detailResult.negative.map(hit => 'DETAIL:' + hit);
  }

  const learning = getLearningAdjustment_(job);
  const dgAdjustment = getEuDgAdjustment_(job);
  const roleModel = scoreRoleModel_(job);

  const locationBoost = source === 'bundde'
    ? getBundDeLocationBoost_(job.location)
    : 0;

  const locationPositive = source === 'bundde'
    ? getBundDeLocationPositiveHits_(job.location)
    : [];

  const sourceHardRejectHit = containsHardReject_(textForScoring, rules.hardReject || []);
  const sourceHardRejectHits = sourceHardRejectHit ? [sourceHardRejectHit] : [];

  const allHardRejectHits = [
    ...sourceHardRejectHits,
    ...(roleModel.hardRejectHits || [])
  ].filter(Boolean);

  const primaryHardRejectHit = allHardRejectHits[0] || '';
  const anyHardRejectHit = allHardRejectHits.length > 0;

  const baseScore = Number(result.score) || 0;
  const safeDetailScore = Number(detailScore) || 0;
  const safeLearningDelta = Number(learning.delta) || 0;
  const safeDgDelta = Number(dgAdjustment.delta) || 0;
  const safeRoleModelDelta = Number(roleModel.delta) || 0;
  const safeLocationBoost = Number(locationBoost) || 0;

  const finalScore =
    baseScore +
    safeDetailScore +
    safeLearningDelta +
    safeDgDelta +
    safeRoleModelDelta +
    safeLocationBoost;

  let category = assignCategory_(
    textForScoring,
    finalScore,
    rules.hardReject || [],
    rules.thresholds
  );

  if (anyHardRejectHit) {
    return {
      score: -999,
      normalizedScore: -999,
      positive: result.positive.concat(
        detailPositive,
        learning.positive,
        dgAdjustment.positive,
        roleModel.positive,
        locationPositive
      ),
      negative: result.negative.concat(
        detailNegative,
        learning.negative,
        dgAdjustment.negative,
        roleModel.negative
      ),
      hardRejectHit: primaryHardRejectHit,
      hardRejectHits: [...new Set(allHardRejectHits)],
      category: 'Ignorieren',
    };
  }

  const thresholds = getSourceThresholds_(job.source, job.source_label);
  const normalizedScore = normalizeScoreByThresholds_(finalScore, thresholds);

  return {
    score: finalScore,
    normalizedScore,
    positive: result.positive.concat(
      detailPositive,
      learning.positive,
      dgAdjustment.positive,
      roleModel.positive,
      locationPositive
    ),
    negative: result.negative.concat(
      detailNegative,
      learning.negative,
      dgAdjustment.negative,
      roleModel.negative
    ),
    hardRejectHit: '',
    hardRejectHits: [],
    category,
  };
}


//functions to (manually) rescore jobs -- all, or for a specific source
function rescoreJobsAll_(sourceInput) {
  const sourceFilter = String(sourceInput || '').trim().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      source_filter: sourceFilter || '',
      rows_seen: 0,
      rows_matched: 0,
      rows_updated: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      hard_reject_count: 0,
      per_source: []
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const requiredCols = [
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
    'detail_text',
    'score',
    'score_normalized',
    'category',
    'positive_hits',
    'negative_hits',
    'hard_reject_hit',
    'hard_reject_hits'
  ];

  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error('Required column missing in Jobs_All: ' + col);
    }
  });

  let rowsMatched = 0;
  let rowsUpdated = 0;
  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;
  let hardRejectCount = 0;

  const perSourceMap = {};

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rowSource = String(row[idx.source] || '').trim().toLowerCase();
    if (!rowSource) continue;

    if (sourceFilter && rowSource !== sourceFilter) continue;

    rowsMatched++;

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

    const scoring = scoreJobBySource_(job);

    row[idx.score] = scoring.score;
    row[idx.score_normalized] = scoring.normalizedScore;
    row[idx.category] = scoring.category;
    row[idx.positive_hits] = (scoring.positive || []).join(', ');
    row[idx.negative_hits] = (scoring.negative || []).join(', ');
    row[idx.hard_reject_hit] = scoring.hardRejectHit || '';
    row[idx.hard_reject_hits] = (scoring.hardRejectHits || []).join(', ');

    if (!perSourceMap[rowSource]) {
      perSourceMap[rowSource] = {
        source: rowSource,
        rows_updated: 0,
        rows_matched: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        hard_reject_count: 0
      };
    }

    perSourceMap[rowSource].rows_matched++;
    perSourceMap[rowSource].rows_updated++;

    if (String(scoring.category) === 'Relevant') {
      relevantCount++;
      perSourceMap[rowSource].relevant_count++;
    } else if (String(scoring.category) === 'Vielleicht') {
      maybeCount++;
      perSourceMap[rowSource].maybe_count++;
    } else {
      ignoreCount++;
      perSourceMap[rowSource].ignore_count++;
    }

    if (scoring.hardRejectHit) {
      hardRejectCount++;
      perSourceMap[rowSource].hard_reject_count++;
    }

    rowsUpdated++;
  }

  if (rowsUpdated > 0) {
    sheet.getRange(2, 1, data.length - 1, headers.length).setValues(data.slice(1));
  }

  const perSource = Object.values(perSourceMap).sort((a, b) =>
    String(a.source).localeCompare(String(b.source))
  );

  return {
    source_filter: sourceFilter || '',
    rows_seen: data.length - 1,
    rows_matched: rowsMatched,
    rows_updated: rowsUpdated,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    hard_reject_count: hardRejectCount,
    per_source: perSource
  };
}

function rescoreJobsAllForSource_(sourceInput) {
  const sourceFilter = String(sourceInput || '').trim().toLowerCase();
  if (!sourceFilter) {
    throw new Error('Please provide a source, e.g. rescoreJobsAllForSource_("JOBROOM")');
  }

  const result = rescoreJobsAll_(sourceFilter);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function rescoreAllSources() {
  const result = rescoreJobsAll_('');
  Logger.log(JSON.stringify(result, null, 2));

  const sheet = SpreadsheetApp.getActive().getSheetByName('Jobs_All');
  const expectedTotal = sheet.getLastRow() - 1;

  if (result.rows_updated !== expectedTotal) {
    throw new Error(
      'Sanity check failed: rows_updated=' + result.rows_updated + ', expected=' + expectedTotal
    );
  }

  return result;
}


//scoring helpers
function applyGradePolicy_(job, rules) {
  const policy = rules && rules.gradePolicy;
  if (!policy || !policy.enabled) {
    return null;
  }

  const gradeText = normalizeText_(job.grade || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!gradeText) {
    return null;
  }

  const rejectList = policy.reject || [];
  const allowList = policy.allow || [];

  function matchesGradePattern_(text, pattern) {
    const escaped = String(pattern)
      .toLowerCase()
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');

    const regex = new RegExp('(^|\\b)' + escaped + '(\\b|$)', 'i');
    return regex.test(text);
  }

  const rejectHit = rejectList.find(pattern => matchesGradePattern_(gradeText, pattern));
  if (rejectHit) {
    return {
      score: -999,
      positive: [],
      negative: ['GRADE:rejected:' + rejectHit],
      hardRejectHit: 'GRADE:' + rejectHit,
      hardRejectHits: ['GRADE:' + rejectHit],
      category: 'Ignorieren',
    };
  }

  if (allowList.length) {
    const allowHit = allowList.find(pattern => matchesGradePattern_(gradeText, pattern));
    if (!allowHit) {
      return {
        score: -999,
        positive: [],
        negative: ['GRADE:not-allowed'],
        hardRejectHit: 'GRADE:not-allowed',
        hardRejectHits: ['GRADE:not-allowed'],
        category: 'Ignorieren',
      };
    }
  }

  return null;
}






function scoreEntry_(text, positiveKeywords, negativeKeywords, bonusPatterns) {
  let score = 0;
  const positiveHits = [];
  const negativeHits = [];

  Object.keys(positiveKeywords || {}).forEach(key => {
    const weight = positiveKeywords[key];
    if (matchesConfiguredKeyword_(text, key)) {
      score += weight;
      positiveHits.push(formatWeightedHit_(key, weight));
    }
  });

  Object.keys(negativeKeywords || {}).forEach(key => {
    const weight = negativeKeywords[key];
    if (matchesConfiguredKeyword_(text, key)) {
      score += weight;
      negativeHits.push(formatWeightedHit_(key, weight));
    }
  });

  Object.keys(bonusPatterns || {}).forEach(key => {
    const weight = bonusPatterns[key];
    if (matchesConfiguredKeyword_(text, key)) {
      score += weight;
      positiveHits.push(formatWeightedHit_('BONUS:' + key, weight));
    }
  });

  return {
    score,
    positive: [...new Set(positiveHits)],
    negative: [...new Set(negativeHits)],
  };
}


//helper for scoreEntry
function formatWeightedHit_(label, weight) {
  const n = Number(weight);
  if (isNaN(n)) return String(label);

  const sign = n > 0 ? '+' : '';
  return String(label) + ' (' + sign + n + ')';
}


function getRoleModelContextText_(job) {
  const source = String(job.source || '').toLowerCase();

  const parts = [
    job.percent_or_workload,
    job.grade,
    job.domain,
    job.dg,
    job.location,
    job.employer
  ];

  // raw_snippet nur dort verwenden, wo er wirklich jobspezifisch ist
  const allowRawSnippetSources = [
    'jobroom',
    'zrh',
    'eurocontrol',
    'eucareers',
    'db',
    'lh',
    'oebb',
    'sbb',
    'kn',//outdated
    'aa-kn',
    'skyguide'
  ];

  if (allowRawSnippetSources.includes(source) && job.raw_snippet) {
    parts.push(job.raw_snippet);
  }

  return normalizeText_(parts.filter(Boolean).join(' '));
}



//used for scoring and rejects
//permits:
//Schreibweise	Bedeutung
//keyword	      exakt
//keyword*	    beginnt mit
//*keyword	    endet mit
//*keyword*	    enthält
//re:	          volle Kontrolle (REGEX)
function matchesConfiguredKeyword_(text, keywordSpec) {
  const normalizedText = normalizeText_(text);
  const spec = parseKeywordSpec_(keywordSpec);

  if (!spec) return false;

  if (spec.type === 'regex') {
    try {
      return new RegExp(spec.pattern, 'i').test(normalizedText);
    } catch (e) {
      throw new Error('Invalid regex keywordSpec: ' + keywordSpec + ' :: ' + e.message);
    }
  }

  const normalizedCore = normalizeKeywordCore_(spec.core);
  if (!normalizedCore) return false;

  const escaped = escapeRegex_(normalizedCore).replace(/\s+/g, '\\s+');

  if (spec.type === 'contains') {
    return new RegExp(escaped, 'i').test(normalizedText);
  }

  if (spec.type === 'suffix') {
    return new RegExp(escaped + '(\\b|$)', 'i').test(normalizedText);
  }

  if (spec.type === 'prefix') {
    return new RegExp('(^|\\b)' + escaped, 'i').test(normalizedText);
  }

  return new RegExp('(^|\\b)' + escaped + '(\\b|$)', 'i').test(normalizedText);
}


function normalizeKeywordCore_(value) {
  return normalizeText_(value);
}

function parseKeywordSpec_(keywordSpec) {
  const raw = String(keywordSpec || '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (lower.startsWith('re:')) {
    return {
      type: 'regex',
      raw,
      pattern: raw.slice(3).trim()
    };
  }

  const startsWithStar = raw.startsWith('*');
  const endsWithStar = raw.endsWith('*');
  const core = raw.replace(/^\*+|\*+$/g, '').trim();

  if (!core) return null;

  let type = 'exact';
  if (startsWithStar && endsWithStar) type = 'contains';
  else if (startsWithStar) type = 'suffix';
  else if (endsWithStar) type = 'prefix';

  return {
    type,
    raw,
    core
  };
}

function escapeRegex_(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function scoreRoleModel_(job) {
  const cfg = CONFIG.roleModel;
  if (!cfg) {
    return { delta: 0, positive: [], negative: [], hardRejectHit: '', hardRejectHits: [] };
  }

  const source = String(job.source || '').toLowerCase();
  const enabledSources = cfg.enabledSources || [];
  if (enabledSources.length && !enabledSources.includes(source)) {
    return { delta: 0, positive: [], negative: [], hardRejectHit: '', hardRejectHits: [] };
  }

  const titleText = normalizeText_(job.title || '');
  const contextText = getRoleModelContextText_(job);

  let delta = 0;
  const positive = [];
  const negative = [];
  const hardRejectHits = [];

  Object.keys(cfg.titlePositiveKeywords || {}).forEach(key => {
    const weight = cfg.titlePositiveKeywords[key];
    if (matchesConfiguredKeyword_(titleText, key)) {
      delta += weight;
      positive.push(formatWeightedHit_('ROLE:title:' + key, weight));
    }
  });

  Object.keys(cfg.contextPositiveKeywords || {}).forEach(key => {
    const weight = cfg.contextPositiveKeywords[key];
    if (matchesConfiguredKeyword_(contextText, key)) {
      delta += weight;
      positive.push(formatWeightedHit_('ROLE:ctx:' + key, weight));
    }
  });

  Object.keys(cfg.negativeKeywords || {}).forEach(key => {
    const weight = cfg.negativeKeywords[key];
    if (
      matchesConfiguredKeyword_(titleText, key) ||
      matchesConfiguredKeyword_(contextText, key)
    ) {
      delta += weight;
      negative.push(formatWeightedHit_('ROLE:neg:' + key, weight));
    }
  });

  const hardRejectHit = containsHardReject_(
    [titleText, contextText].join(' '),
    cfg.hardReject || []
  );

  if (hardRejectHit) {
    delta -= 20;
    negative.push(formatWeightedHit_('ROLE:hardreject:' + hardRejectHit, -20));
    hardRejectHits.push('ROLE:' + hardRejectHit);
  }

  delta = Math.max(-25, Math.min(25, delta));

  return {
    delta,
    positive: [...new Set(positive)],
    negative: [...new Set(negative)],
    hardRejectHit: hardRejectHit || '',
    hardRejectHits: [...new Set(hardRejectHits)]
  };
}

function getEuDgAdjustment_(job) {
  if (job.source_label !== 'Crawler/EU') {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const source = String(job.source || '').toLowerCase();
  if (source !== 'eucareers') {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const dg = String(job.dg || '').toUpperCase().trim();
  if (!dg) {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const dgMap = (CONFIG.dgPriority && CONFIG.dgPriority.eu) || {};
  const value = dgMap[dg] || 0;
  
  if (!value) {
    return { delta: 0, positive: [], negative: [] };
  }
  
  return {
    delta: value,
    positive: value > 0 ? [`DG:${dg}(+${value})`] : [],
    negative: value < 0 ? [`DG:${dg}(${value})`] : [],
  };
}



function assignCategory_(text, score, hardRejectList, thresholds) {
  if (containsHardReject_(text, hardRejectList)) return 'Ignorieren';
  if (score >= thresholds.relevant) return 'Relevant';
  if (score >= thresholds.maybe) return 'Vielleicht';
  return 'Ignorieren';
}


// returns the matching word if match is found, otherwise returns empty string
// note: previously returned true/false. some old functions might rely on this,
function containsHardReject_(text, hardRejectList) {
  const normalized = normalizeText_(text);
  for (let i = 0; i < hardRejectList.length; i++) {
    const keyword = hardRejectList[i];
    if (matchesConfiguredKeyword_(normalized, keyword)) return keyword;
  }
  return '';
}




function getSourceThresholds_(source, sourceLabel) {
  const src = String(source || '').toLowerCase();

  if (src === 'bundch') return CONFIG.scoring.bundch.thresholds;
  if (src === 'bundde') return CONFIG.scoring.bundde.thresholds;
  if (src === 'bundat') return CONFIG.scoring.bundat.thresholds;
  if (src === 'oebb') return CONFIG.scoring.oebb.thresholds;
  if (src === 'sbb') return CONFIG.scoring.sbb.thresholds;
  if (src === 'kn' || src === 'aa-kn' || src === 'aa-cities') return CONFIG.scoring.kn.thresholds;  if (src === 'zrh') return CONFIG.scoring.zrh.thresholds;
  if (src === 'airbus') return CONFIG.scoring.airbus.thresholds;
  if (src === 'lh') return CONFIG.scoring.lh.thresholds;
  if (src === 'skyguide') return CONFIG.scoring.skyguide.thresholds;
  if (src === 'eurocontrol') return CONFIG.scoring.eurocontrol.thresholds;
  if (src === 'jobroom') return CONFIG.scoring.jobroom.thresholds;
  if (src === 'db') return CONFIG.scoring.db.thresholds;
  if (src === 'stadtwien') return CONFIG.scoring.stadtwien.thresholds;

  if (src === 'eucareers') {
    return sourceLabel === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther.thresholds
      : CONFIG.scoring.eu.thresholds;
  }

  throw new Error('No thresholds configured for source: ' + source);
}


function normalizeScoreByThresholds_(rawScore, thresholds) {
  const maybe = Number(thresholds.maybe || 0);
  const relevant = Number(thresholds.relevant || 0);

  if (relevant <= maybe) {
    throw new Error('Invalid thresholds: relevant must be greater than maybe');
  }

  const normalized = 10 * (Number(rawScore || 0) - maybe) / (relevant - maybe);

  return Math.round(normalized * 10) / 10; // 1 Dezimalstelle
}


// *****************************************
// SCORING DIAGNOSTICS
// *****************************************

function auditScoringOverlaps() {
  const report = auditScoringOverlaps_();
  Logger.log(JSON.stringify(report, null, 2));
}

function auditScoringOverlaps_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleTitlePos = Object.keys(roleModel.titlePositiveKeywords || {});
  const roleCtxPos = Object.keys(roleModel.contextPositiveKeywords || {});
  const roleNeg = Object.keys(roleModel.negativeKeywords || {});
  const roleHardReject = roleModel.hardReject || [];

  const sourceNames = Object.keys(scoring);
  const report = [];

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const srcPos = Object.keys(src.positiveKeywords || {});
    const srcNeg = Object.keys(src.negativeKeywords || {});
    const srcHardReject = src.hardReject || [];

    const overlaps = {
      source: sourceName,

      pos_vs_role_title_pos: intersectSorted_(srcPos, roleTitlePos),
      pos_vs_role_ctx_pos: intersectSorted_(srcPos, roleCtxPos),
      pos_vs_role_neg: intersectSorted_(srcPos, roleNeg),
      pos_vs_role_hard_reject: intersectSorted_(srcPos, roleHardReject),

      neg_vs_role_title_pos: intersectSorted_(srcNeg, roleTitlePos),
      neg_vs_role_ctx_pos: intersectSorted_(srcNeg, roleCtxPos),
      neg_vs_role_neg: intersectSorted_(srcNeg, roleNeg),
      neg_vs_role_hard_reject: intersectSorted_(srcNeg, roleHardReject),

      hard_reject_vs_role_title_pos: intersectSorted_(srcHardReject, roleTitlePos),
      hard_reject_vs_role_ctx_pos: intersectSorted_(srcHardReject, roleCtxPos),
      hard_reject_vs_role_neg: intersectSorted_(srcHardReject, roleNeg),
      hard_reject_vs_role_hard_reject: intersectSorted_(srcHardReject, roleHardReject),
    };

    report.push(overlaps);
  });

  Logger.log('=== SCORING OVERLAP AUDIT START ===');

  report.forEach(entry => {
    const hasAnyOverlap = Object.keys(entry).some(key => {
      return key !== 'source' && Array.isArray(entry[key]) && entry[key].length > 0;
    });

    if (!hasAnyOverlap) return;

    Logger.log('--- Source: ' + entry.source + ' ---');

    Object.keys(entry).forEach(key => {
      if (key === 'source') return;
      if (!entry[key].length) return;
      Logger.log(key + ': ' + entry[key].join(', '));
    });
  });

  Logger.log('=== SCORING OVERLAP AUDIT END ===');

  return report;
}

function intersectSorted_(a, b) {
  const setB = new Set((b || []).map(x => normalizeAuditToken_(x)));
  return [...new Set((a || []).map(x => normalizeAuditToken_(x)))]
    .filter(x => setB.has(x))
    .sort();
}

function normalizeAuditToken_(value) {
  return String(value || '').trim().toLowerCase();
}



//this one also considers overlaps (insted of just exact matches)

function auditScoringNearOverlaps() {
  const report = auditScoringNearOverlaps_();
  Logger.log(JSON.stringify(report, null, 2));
}

function auditScoringNearOverlaps_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleGroups = {
    role_title_pos: Object.keys(roleModel.titlePositiveKeywords || {}),
    role_ctx_pos: Object.keys(roleModel.contextPositiveKeywords || {}),
    role_neg: Object.keys(roleModel.negativeKeywords || {}),
    role_hard_reject: roleModel.hardReject || []
  };

  const sourceNames = Object.keys(scoring);
  const report = [];

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const sourceGroups = {
      src_pos: Object.keys(src.positiveKeywords || {}),
      src_neg: Object.keys(src.negativeKeywords || {}),
      src_hard_reject: src.hardReject || []
    };

    const entry = {
      source: sourceName,
      findings: []
    };

    Object.keys(sourceGroups).forEach(srcGroupName => {
      Object.keys(roleGroups).forEach(roleGroupName => {
        const matches = findNearOverlapPairs_(
          sourceGroups[srcGroupName],
          roleGroups[roleGroupName]
        );

        if (matches.length) {
          entry.findings.push({
            source_group: srcGroupName,
            role_group: roleGroupName,
            matches
          });
        }
      });
    });

    report.push(entry);
  });

  Logger.log('=== SCORING NEAR-OVERLAP AUDIT START ===');

  report.forEach(entry => {
    if (!entry.findings.length) return;

    Logger.log('--- Source: ' + entry.source + ' ---');

    entry.findings.forEach(groupFinding => {
      Logger.log(
        groupFinding.source_group + ' vs ' + groupFinding.role_group + ':'
      );

      groupFinding.matches.forEach(match => {
        Logger.log(
          '  [' + match.type + '] ' +
          '"' + match.left + '" <-> "' + match.right + '"'
        );
      });
    });
  });

  Logger.log('=== SCORING NEAR-OVERLAP AUDIT END ===');

  return report;
}

function findNearOverlapPairs_(leftList, rightList) {
  const left = [...new Set((leftList || []).map(normalizeAuditToken_))];
  const right = [...new Set((rightList || []).map(normalizeAuditToken_))];

  const out = [];
  const seen = new Set();

  left.forEach(l => {
    right.forEach(r => {
      if (!l || !r) return;
      if (l === r) return;

      // Zu kurze Tokens ignorieren, sonst zu viel Lärm
      if (Math.min(l.length, r.length) < 6) return;

      let type = '';

      if (l.includes(r)) {
        type = 'role_inside_source';
      } else if (r.includes(l)) {
        type = 'source_inside_role';
      } else {
        return;
      }

      // Noch etwas Lärmreduktion:
      // Wenn die Überlappung sehr kurz im Verhältnis zum längeren String ist, ignorieren.
      const shorter = l.length <= r.length ? l : r;
      const longer = l.length > r.length ? l : r;

      if (shorter.length / longer.length < 0.55) return;

      const key = [l, r, type].join(' || ');
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        left: l,
        right: r,
        type
      });
    });
  });

  return out.sort((a, b) => {
    if (a.left !== b.left) return a.left.localeCompare(b.left);
    if (a.right !== b.right) return a.right.localeCompare(b.right);
    return a.type.localeCompare(b.type);
  });
}

function normalizeAuditToken_(value) {
  return String(value || '').trim().toLowerCase();
}


function auditScoringConflictsFocused() {
  auditScoringConflictsFocused_();
}


function auditScoringConflictsFocused_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleNeg = normalizeList_(Object.keys(roleModel.negativeKeywords || {}));
  const roleHard = normalizeList_(roleModel.hardReject || []);

  const sourceNames = Object.keys(scoring);

  Logger.log('=== FOCUSED SCORING CONFLICT AUDIT ===');

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const srcNeg = normalizeList_(Object.keys(src.negativeKeywords || {}));
    const srcHard = normalizeList_(src.hardReject || []);

    const negNeg = intersectSimple_(srcNeg, roleNeg);
    const negHard = intersectSimple_(srcNeg, roleHard);
    const hardHard = intersectSimple_(srcHard, roleHard);

    if (!negNeg.length && !negHard.length && !hardHard.length) return;

    Logger.log('--- ' + sourceName + ' ---');

    if (negNeg.length) {
      Logger.log('NEG vs NEG (double penalty): ' + negNeg.join(', '));
    }

    if (negHard.length) {
      Logger.log('NEG vs HARD (inconsistent severity): ' + negHard.join(', '));
    }

    if (hardHard.length) {
      Logger.log('HARD vs HARD (redundant): ' + hardHard.join(', '));
    }
  });

  Logger.log('=== END ===');
}

function intersectSimple_(a, b) {
  const setB = new Set(b);
  return a.filter(x => setB.has(x)).sort();
}

function normalizeList_(list) {
  return [...new Set((list || []).map(x => String(x).toLowerCase().trim()))];
}







function analyzeOneSourceThreshold_(src) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const idx = {
    source: headers.indexOf('source'),
    title: headers.indexOf('title'),
    scoreNormalized: headers.indexOf('score_normalized'),
    finalScore: headers.indexOf('score'),
    category: headers.indexOf('category')
  };

  function getScoringConfigForSource_(sourceUpper) {
    const s = String(sourceUpper || '').trim().toUpperCase();
    if (s === 'JOBROOM') return CONFIG.scoring.jobroom;
    if (s === 'KN' || s === 'AA-KN') return CONFIG.scoring.kn;
    if (s === 'DB') return CONFIG.scoring.db;
    if (s === 'BUNDDE') return CONFIG.scoring.bundde;
    throw new Error('No scoring config for source: ' + sourceUpper);
  }

  const cfg = getScoringConfigForSource_(src);
  const tRelevant = Number(cfg.thresholds.relevant);
  const tMaybe = Number(cfg.thresholds.maybe);

  const srcRows = rows.filter(r =>
    String(r[idx.source] || '').trim().toUpperCase() === String(src).toUpperCase()
  );

  srcRows.sort((a, b) => Number(b[idx.finalScore] || 0) - Number(a[idx.finalScore] || 0));

  const result = {
    source: src,
    thresholds: { relevant: tRelevant, maybe: tMaybe },
    counts: {
      total: srcRows.length,
      above_relevant: srcRows.filter(r => Number(r[idx.finalScore] || 0) >= tRelevant).length,
      above_maybe: srcRows.filter(r => Number(r[idx.finalScore] || 0) >= tMaybe).length,
      below_maybe: srcRows.filter(r => Number(r[idx.finalScore] || 0) < tMaybe).length
    },
    top_by_final_score: srcRows.slice(0, 15).map(r => ({
      title: r[idx.title],
      final_score: Number(r[idx.finalScore] || 0),
      score_normalized: Number(r[idx.scoreNormalized] || 0),
      category: r[idx.category]
    }))
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function analyzeSourceThresholds(sourcesToCheck = ['JOBROOM', 'KN', 'AA-KN', 'DB', 'BUNDDE']) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Jobs_All');
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const idx = {
    source: headers.indexOf('source'),
    title: headers.indexOf('title'),
    score: headers.indexOf('score_normalized'),
    finalScore: headers.indexOf('final_score'),
    category: headers.indexOf('category')
  };

  const results = {};

  sourcesToCheck.forEach(src => {
    const srcRows = rows.filter(r =>
      String(r[idx.source] || '').trim().toUpperCase() === src
    );

    if (!srcRows.length) return;

    // sort by score desc
    srcRows.sort((a, b) => (b[idx.score] || 0) - (a[idx.score] || 0));

    const scores = srcRows.map(r => Number(r[idx.score] || 0));

    // thresholds aus config holen (wichtig: echte Funktion bei dir einsetzen!)
    const cfg = SOURCE_CONFIG[src];
    const tRelevant = cfg.thresholds.relevant;
    const tMaybe = cfg.thresholds.maybe;

    // Kandidaten knapp unter thresholds
    const nearRelevant = srcRows
      .filter(r => {
        const s = Number(r[idx.score] || 0);
        return s < tRelevant && s >= tRelevant - 2;
      })
      .slice(0, 5)
      .map(r => ({
        title: r[idx.title],
        score: r[idx.score]
      }));

    const nearMaybe = srcRows
      .filter(r => {
        const s = Number(r[idx.score] || 0);
        return s < tMaybe && s >= tMaybe - 2;
      })
      .slice(0, 5)
      .map(r => ({
        title: r[idx.title],
        score: r[idx.score]
      }));

    const counts = {
      total: srcRows.length,
      aboveRelevant: scores.filter(s => s >= tRelevant).length,
      aboveMaybe: scores.filter(s => s >= tMaybe).length,
      belowMaybe: scores.filter(s => s < tMaybe).length
    };

    results[src] = {
      thresholds: { relevant: tRelevant, maybe: tMaybe },
      topScores: scores.slice(0, 10),
      counts,
      nearRelevant,
      nearMaybe
    };
  });

  Logger.log(JSON.stringify(results, null, 2));
}


function analyzeThresholdsBUNDDE() {
  analyzeOneSourceThreshold_('BUNDDE');
}


