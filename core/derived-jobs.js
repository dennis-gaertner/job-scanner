// core/derived-jobs.js — extracted without changing function implementations.

function loadJobsAllAndUserContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const masterSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const userSheet = ss.getSheetByName(CONFIG.sheets.jobsUser);

  if (!masterSheet) throw new Error('Jobs_All fehlt.');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0] || [];
  const masterRows = masterData.slice(1);
  const masterIdx = indexMap_(masterHeaders);

  const userData = userSheet ? userSheet.getDataRange().getValues() : [];
  const userHeaders = userData.length ? userData[0] : [];
  const userRows = userData.length ? userData.slice(1) : [];
  const userIdx = indexMap_(userHeaders);

  const userMap = new Map();
  userRows.forEach(row => {
    const key = String(row[userIdx.unique_key] || '');
    if (key) userMap.set(key, row);
  });

  return {
    ss,
    masterSheet,
    userSheet,
    masterHeaders,
    masterRows,
    masterIdx,
    userHeaders,
    userRows,
    userIdx,
    userMap
  };
}



//translate master-row plus optional user-row into final view
function buildDerivedJobViewRow_(masterRow, ctx) {
  const { masterIdx, userIdx, userMap } = ctx;

  const uniqueKey = String(masterRow[masterIdx.unique_key] || '');
  const userRow = userMap.get(uniqueKey) || [];

  // --- MASTER ---
  const rawScoreNormalized = masterIdx.score_normalized != null
    ? masterRow[masterIdx.score_normalized]
    : '';

  let scoreNormalized = 0;
  if (rawScoreNormalized instanceof Date) {
    const sheetEpoch = new Date(Date.UTC(1899, 11, 30));
    scoreNormalized = (rawScoreNormalized.getTime() - sheetEpoch.getTime()) / (1000 * 60 * 60 * 24);
  } else if (rawScoreNormalized !== '' && rawScoreNormalized !== null) {
    scoreNormalized = Number(rawScoreNormalized);
  }

  const category = masterIdx.category != null
    ? (masterRow[masterIdx.category] || '')
    : '';

  const mailDate = masterIdx.mail_date != null
    ? masterRow[masterIdx.mail_date]
    : '';

  const firstSeen = masterIdx.first_seen_at != null
    ? masterRow[masterIdx.first_seen_at]
    : '';

  const deadline = masterIdx.deadline != null
    ? masterRow[masterIdx.deadline]
    : '';

  // --- USER ---
  const manualScoreDelta = userIdx.manual_score_delta != null
    ? Number(userRow[userIdx.manual_score_delta] || 0)
    : 0;

  const manualCategory = userIdx.manual_category != null
    ? String(userRow[userIdx.manual_category] || '').trim()
    : '';

  const applicationStatus = userIdx.application_status != null
    ? String(userRow[userIdx.application_status] || '').trim()
    : '';

  const visibilityPreference = userIdx.visibility_preference != null
    ? String(userRow[userIdx.visibility_preference] || '').trim().toLowerCase()
    : 'active';

  const userJobState = userIdx.job_state != null
    ? String(userRow[userIdx.job_state] || '').trim().toLowerCase()
    : '';

  const quickFlag = userIdx.quick_flag != null
    ? String(userRow[userIdx.quick_flag] || '').trim()
    : '';

  const notes = userIdx.notes != null
    ? String(userRow[userIdx.notes] || '')
    : '';

  const learnFromFeedback = userIdx.learn_from_feedback != null
    ? String(userRow[userIdx.learn_from_feedback] || '').trim()
    : '';

  const manualTitle = userIdx.manual_title != null
    ? String(userRow[userIdx.manual_title] || '').trim()
    : '';

  // --- DERIVED: SCORE / CATEGORY ---
  const finalScore = scoreNormalized + manualScoreDelta;
  const finalCategory = manualCategory || categoryFromNormalizedScore_(finalScore);

  // --- DERIVED: JOB STATE ---
  const inferredJobState = computeJobState_(deadline);
  const jobState = userJobState || inferredJobState;

  // --- DERIVED: JOB AGE ---
  const today = new Date();
  let baseDate = mailDate || firstSeen;
  let jobAge = '';

  if (baseDate) {
    const diff = today - new Date(baseDate);
    jobAge = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // --- DERIVED: DEADLINE ---
  let daysToDeadline = '';

  if (deadline) {
    const todayClean = new Date();
    todayClean.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate)) {
      const diff = deadlineDate - todayClean;
      daysToDeadline = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
  }

  // --- DERIVED: RANKS ---
  const visibilityRank = computeVisibilityRank_(visibilityPreference);
  const jobStateRank = computeJobStateRank_(jobState);
  const categoryRank = computeCategoryRank_(finalCategory);
  const workRank = computeWorkRank_(visibilityPreference, applicationStatus, jobState, finalCategory);

  return {
    unique_key: uniqueKey,

    masterRow,
    userRow,

    // master passthrough
    score_normalized: scoreNormalized,
    category: category,

    // derived core
    final_score: finalScore,
    final_category: finalCategory,

    // user fields
    manual_score_delta: manualScoreDelta,
    manual_category: manualCategory,
    application_status: applicationStatus,
    visibility_preference: visibilityPreference,
    job_state: jobState,
    quick_flag: quickFlag,
    notes: notes,
    learn_from_feedback: learnFromFeedback,
    manual_title: manualTitle,

    // derived extras
    first_seen_at_display: mailDate || firstSeen || '',
    deadline_display: deadline || '',
    job_age: jobAge,
    days_to_deadline: daysToDeadline,

    // ranks
    visibility_rank: visibilityRank,
    job_state_rank: jobStateRank,
    category_rank: categoryRank,
    work_rank: workRank
  };
}





//loop over master rows
function buildDerivedJobViews_() {
  const ctx = loadJobsAllAndUserContext_();

  const rows = ctx.masterRows.map(masterRow => buildDerivedJobViewRow_(masterRow, ctx));

  return {
    ...ctx,
    rows
  };
}






