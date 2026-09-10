// scoring/diagnostics.js — extracted without changing function implementations.

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





//Generic rescoring for any sheet
//implemented for use with the testsink

