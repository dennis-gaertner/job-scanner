// scoring/learning.js — extracted without changing function implementations.

function refreshLearningCache_() {
  LEARNING_CACHE = buildLearningProfile_();
}

function buildLearningProfile_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { tokenScores: {}, sourceScores: {} };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const tokenScores = {};
  const sourceScores = {};
  
  data.slice(1).forEach(row => {
    const manualRating = normalizeText_(row[idx.manual_rating] || '');
    const clicked = normalizeText_(row[idx.clicked_or_applied] || '');
    const source = String(row[idx.source] || '').toLowerCase();
    const text = [row[idx.title], row[idx.employer], row[idx.location]]
    .filter(Boolean)
    .join(' ');
    
    let weight = 0;
    
    if (manualRating === 'gut') weight += 4;
    else if (manualRating === 'vielleicht') weight += 1;
    else if (manualRating === 'nein') weight -= 5;
    
    if (clicked === 'ja' || clicked === 'yes' || clicked === 'applied' || clicked === 'clicked') {
      weight += 3;
    }
    
    if (!weight) return;
    
    const tokens = tokenizeForLearning_(text);
    
    tokens.forEach(token => {
      tokenScores[token] = (tokenScores[token] || 0) + weight;
    });
    
    if (source) {
      sourceScores[source] = (sourceScores[source] || 0) + Math.sign(weight);
    }
  });
  
  return { tokenScores, sourceScores };
}

function tokenizeForLearning_(text) {
  const stopwords = new Set([
  'und','oder','mit','der','die','das','für','fuer','von','im','in','am','an','auf','des','dem','den',
  'the','and','with','job','jobs','stelle','stellen','bereich','senior','junior','professional',
  'leiter','leiterin','mitarbeiter','mitarbeiterin','spezialist','spezialistin','manager','managerin',
  'bundesamt','bundesverwaltung','schweiz','bern','zuerich','wien','oebb','bundch','sbb', 'deutschschweiz', 'online', 'seit'
  ]);
  
  return [...new Set(
  normalizeText_(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .split(/\s+/)
  .filter(token => token && token.length >= 4 && !stopwords.has(token))
  )];
}

function getLearningAdjustment_(job) {
  const profile = LEARNING_CACHE || { tokenScores: {}, sourceScores: {} };
  const source = String(job.source || '').toLowerCase();
  const text = [job.title, job.employer, job.location]
  .filter(Boolean)
  .join(' ');
  const tokens = tokenizeForLearning_(text);
  
  let delta = 0;
  const positive = [];
  const negative = [];
  
  tokens.forEach(token => {
    const tokenScore = profile.tokenScores[token] || 0;
    if (!tokenScore) return;
    
    const contribution = Math.max(-3, Math.min(3, tokenScore));
    delta += contribution;
    
    if (contribution > 0) positive.push(`LEARN:${token}(+${contribution})`);
    if (contribution < 0) negative.push(`LEARN:${token}(${contribution})`);
  });
  
  if (profile.sourceScores[source]) {
    const sourceContribution = Math.max(-2, Math.min(2, profile.sourceScores[source]));
    delta += sourceContribution;
    
    if (sourceContribution > 0) positive.push(`LEARN:source(+${sourceContribution})`);
    if (sourceContribution < 0) negative.push(`LEARN:source(${sourceContribution})`);
  }
  
  delta = Math.max(-8, Math.min(8, delta));
  
  return {
    delta,
    positive: [...new Set(positive)].slice(0, 6),
    negative: [...new Set(negative)].slice(0, 6),
  };
}



