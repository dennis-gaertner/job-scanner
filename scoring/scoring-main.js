// scoring/scoring-main.js — extracted without changing function implementations.


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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  return rescoreJobStoreSheet_(sheet, sourceInput);
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

