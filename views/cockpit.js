// views/cockpit.js — extracted without changing function implementations.

function onEdit(e) {
  try {
    handleEditableCockpitEdit_(e);
  } catch (err) {
    console.error('onEdit error', err);
  }
}

function handleEditableCockpitEdit_(e) {
  const range = e && e.range;
  if (!range) return;

  const sheet = range.getSheet();
  if (!sheet) return;

  const sheetName = sheet.getName();
  const allowedSheets = ['Jobs_Cockpit', 'Scoring_Cockpit'];
  if (!allowedSheets.includes(sheetName)) return;

  const row = range.getRow();
  const col = range.getColumn();

  if (row < 2) return;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const field = headers[col - 1];

  const editableFields = [
    'quick_flag',
    'application_status',
    'visibility_preference',
    'job_state',
    'notes',
    'manual_category',
    'manual_score_delta',
    'learn_from_feedback',
    'manual_title',
  ];

  if (!editableFields.includes(field)) return;

  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  if (uniqueKeyCol < 1) return;

  const uniqueKey = sheet.getRange(row, uniqueKeyCol).getValue();
  if (!uniqueKey) return;

  const newValue = sheet.getRange(row, col).getValue();

  upsertUserField_(uniqueKey, field, newValue);
}


function upsertUserField_(uniqueKey, field, value) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Jobs_User');
  if (!sheet) throw new Error('Sheet "Jobs_User" not found.');

  if (field === 'status') {
    throw new Error('Field "status" is deprecated and must not be written anymore.');
  }

  const data = sheet.getDataRange().getValues();
  if (!data || !data.length) throw new Error('Jobs_User is empty.');

  const headers = data[0];

  const keyIdx = headers.indexOf('unique_key');
  const fieldIdx = headers.indexOf(field);
  const updatedAtIdx = headers.indexOf('updated_at');
  const createdAtIdx = headers.indexOf('created_at');

  if (keyIdx === -1) throw new Error('Jobs_User missing column "unique_key".');
  if (fieldIdx === -1) throw new Error('Jobs_User missing column "' + field + '".');
  if (updatedAtIdx === -1) throw new Error('Jobs_User missing column "updated_at".');
  if (createdAtIdx === -1) throw new Error('Jobs_User missing column "created_at".');

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === uniqueKey) {
      rowIndex = i + 1;
      break;
    }
  }

  const now = new Date();

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, fieldIdx + 1).setValue(value);
    sheet.getRange(rowIndex, updatedAtIdx + 1).setValue(now);
  } else {
    const newRow = new Array(headers.length).fill('');
    newRow[keyIdx] = uniqueKey;
    newRow[fieldIdx] = value;
    newRow[createdAtIdx] = now;
    newRow[updatedAtIdx] = now;
    sheet.appendRow(newRow);
  }
}



function categoryFromNormalizedScore_(score) {
  if (score === '' || score === null || isNaN(score)) return '';

  if (score >= 10) return 'Relevant';
  if (score >= 0) return 'Vielleicht';
  return 'Ignorieren';
}



// *****************************************
// JOBS_COCKPIT
// *****************************************
function buildJobsCockpit() {
  buildJobsCockpit_()
}

function buildJobsCockpit_() {
  Logger.log('buildJobsCockpit_ START');

  const ss = SpreadsheetApp.getActive();
  const cockpitSheet = ss.getSheetByName('Jobs_Cockpit');

  const derived = buildDerivedJobViews_();
  const masterIdx = derived.masterIdx;
  const cockpitHeaders = JOBS_COCKPIT_COLUMNS;
  const output = [cockpitHeaders];

  const jobAgeCol = cockpitHeaders.indexOf('job_age') + 1;
  if (jobAgeCol < 1) {
    throw new Error('buildJobsCockpit_: JOBS_COCKPIT_COLUMNS missing "job_age".');
  }
  const jobAgeLetter = columnToLetter_(jobAgeCol);


  //new: write sorted version instead of sorting later
  const sortedViews = [...derived.rows].sort((a, b) => {
  const aVisibility = Number(a.visibility_rank || 0);
  const bVisibility = Number(b.visibility_rank || 0);
  if (aVisibility !== bVisibility) return aVisibility - bVisibility;

  const aWork = Number(a.work_rank || 0);
  const bWork = Number(b.work_rank || 0);
  if (aWork !== bWork) return aWork - bWork;

  const aState = Number(a.job_state_rank || 0);
  const bState = Number(b.job_state_rank || 0);
  if (aState !== bState) return aState - bState;

  const aCategory = Number(a.category_rank || 0);
  const bCategory = Number(b.category_rank || 0);
  if (aCategory !== bCategory) return aCategory - bCategory;

  const aScore = Number(a.final_score || 0);
  const bScore = Number(b.final_score || 0);
  if (aScore !== bScore) return bScore - aScore;

  const aDays = a.days_to_deadline === '' || a.days_to_deadline == null
    ? Number.POSITIVE_INFINITY
    : Number(a.days_to_deadline);
  const bDays = b.days_to_deadline === '' || b.days_to_deadline == null
    ? Number.POSITIVE_INFINITY
    : Number(b.days_to_deadline);
  if (aDays !== bDays) return aDays - bDays;

  return String(a.unique_key || '').localeCompare(String(b.unique_key || ''));
});  




  sortedViews.forEach(view => {
    const row = view.masterRow;

    const source = masterIdx.source != null ? (row[masterIdx.source] || '') : '';
    const location = masterIdx.location != null ? (row[masterIdx.location] || '') : '';
    const originalTitle = masterIdx.title != null ? (row[masterIdx.title] || '') : '';
    const employer = masterIdx.employer != null ? (row[masterIdx.employer] || '') : '';
    //const deadline = masterIdx.deadline != null ? row[masterIdx.deadline] : '';
    const url = masterIdx.url != null ? (row[masterIdx.url] || '') : '';

    //const mailDate = masterIdx.mail_date != null ? row[masterIdx.mail_date] : '';
    //const firstSeenAt = masterIdx.first_seen_at != null ? row[masterIdx.first_seen_at] : '';
    //const firstSeenAtDisplay = firstSeenAt || '';

    const positiveHits = masterIdx.positive_hits != null ? (row[masterIdx.positive_hits] || '') : '';
    const negativeHits = masterIdx.negative_hits != null ? (row[masterIdx.negative_hits] || '') : '';
    const hardRejectHit = masterIdx.hard_reject_hit != null ? (row[masterIdx.hard_reject_hit] || '') : '';
    const hardRejectHits = masterIdx.hard_reject_hits != null ? (row[masterIdx.hard_reject_hits] || '') : '';

    const manualTitle = view.manual_title || '';
    const cleanManualTitle = manualTitle ? manualTitle.trim() : '';

    let displayTitle;

    if (cleanManualTitle) {
      displayTitle = cleanManualTitle + ' *';
    } else if (source === 'EUCAREERS') {
      const domain = masterIdx.domain != null ? (row[masterIdx.domain] || '') : '';
      const rawSourceId = masterIdx.raw_source_id != null
        ? (row[masterIdx.raw_source_id] || '')
        : '';

      displayTitle = buildEuDisplayTitle_(originalTitle, domain, rawSourceId);
    } else {
      displayTitle = originalTitle;
    }

    const targetRow = output.length + 1;
    const newFlagFormula = `=IF(AND(${jobAgeLetter}${targetRow}<>"",${jobAgeLetter}${targetRow}<=Settings!$B$2),"NEW","")`;

    output.push([
      newFlagFormula,
      view.quick_flag,
      source,
      location,
      view.job_state,
      displayTitle,
      employer,
      view.first_seen_at_display,
      view.job_age,
      view.deadline_display,
      view.days_to_deadline,
      url,
      view.score_normalized,
      view.final_score,
      view.category,
      view.final_category,
      positiveHits,
      negativeHits,
      hardRejectHit,
      hardRejectHits,
      view.application_status,
      view.visibility_preference,
      view.manual_category,
      view.manual_score_delta,
      view.learn_from_feedback,
      manualTitle,
      view.notes,
      view.visibility_rank,
      view.work_rank,
      view.job_state_rank,
      view.category_rank,
      view.unique_key
    ]);
  });

  const existingFilter = cockpitSheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }

  cockpitSheet.clearContents();

  cockpitSheet.clearContents();
  cockpitSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
  SpreadsheetApp.flush();

  formatJobsCockpit_(cockpitSheet);

  Logger.log('buildJobsCockpit_ DONE');
}


function computeDerivedStatus_(statusOverride, applicationStatus, manualRating, deadline) {
  if (statusOverride) return statusOverride;

  const app = (applicationStatus || '').toLowerCase();

  // Bewerbungsstatus
  if (app === 'applied' || app === 'beworben') return 'applied';
  if (app === 'interview') return 'open';
  if (app === 'offer') return 'open';

  if (app === 'rejection' || app === 'absage') return 'rejected';
  if (app === 'done' || app === 'erledigt') return 'closed';

  // Deadline abgelaufen
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate) && deadlineDate < today) {
      return 'closed';
    }
  }

  // manuelle Ablehnung
  if (manualRating === 'low' || manualRating === 'reject') {
    return 'rejected';
  }

  return 'open';
}

//für sortierung
function computeWorkRank_(visibilityPreference, applicationStatus, jobState) {
  const vis = String(visibilityPreference || '').trim().toLowerCase();
  const app = String(applicationStatus || '').trim().toLowerCase();
  const state = String(jobState || '').trim().toLowerCase();

  // 🔴 Bucket 3 – ganz nach unten (User will ihn nicht sehen)
  if (vis === 'hidden') {
    return 3;
  }

  // 🟠 Bucket 2 – closed oder bereits bearbeitet (Bewerbung läuft / abgeschlossen)
  if (state === 'closed') {
    return 2;
  }

  if (app && app !== 'none') {
    return 2;
  }

  // 🟢 Bucket 1 – aktiver Fokus
  return 1;
}

function computeCategoryRank_(category) {
  switch (String(category || '').trim()) {
    case 'Relevant': return 1;
    case 'Vielleicht': return 2;
    case 'Ignorieren': return 3;
    default: return 4;
  }
}

function computeVisibilityRank_(visibilityPreference) {
  switch (String(visibilityPreference || '').trim().toLowerCase()) {
    case 'hidden': return 2;
    case 'active':
    case '':
      return 1;
    default:
      return 1;
  }
}


function computeJobState_(deadline) {
  if (!deadline) return 'open';

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'open';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d < today ? 'closed' : 'open';
}

function computeJobStateRank_(jobState) {
  switch (String(jobState || '').trim().toLowerCase()) {
    case 'closed': return 2;
    case 'open':
    case '':
      return 1;
    default:
      return 1;
  }
}







//sortierung cockpit
function sortJobsCockpit_(sheet) {
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];

  const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
  const workRankCol = headers.indexOf('work_rank') + 1;
  const jobStateRankCol = headers.indexOf('job_state_rank') + 1;
  const categoryRankCol = headers.indexOf('category_rank') + 1;
  const scoreCol = headers.indexOf('final_score') + 1;
  const daysCol = headers.indexOf('days_to_deadline') + 1;

  Logger.log(JSON.stringify({
    visibilityRankCol,
    workRankCol,
    jobStateRankCol,
    categoryRankCol,
    scoreCol,
    daysCol,
    numRows: range.getNumRows(),
    numCols: range.getNumColumns()
  }));

  if (range.getNumRows() <= 1) return;

  const sortSpecs = [];

  if (visibilityRankCol > 0) sortSpecs.push({ column: visibilityRankCol, ascending: true });
  if (workRankCol > 0) sortSpecs.push({ column: workRankCol, ascending: true });
  if (jobStateRankCol > 0) sortSpecs.push({ column: jobStateRankCol, ascending: true });
  if (categoryRankCol > 0) sortSpecs.push({ column: categoryRankCol, ascending: true });
  if (scoreCol > 0) sortSpecs.push({ column: scoreCol, ascending: false });
  if (daysCol > 0) sortSpecs.push({ column: daysCol, ascending: true });

  // 🔍 delme, DEBUG HIER
  Logger.log('SORT_SPECS=' + JSON.stringify(sortSpecs));
  Logger.log('SORT_RANGE rows=' + (range.getNumRows() - 1) + ' cols=' + range.getNumColumns());


  range.offset(1, 0, range.getNumRows() - 1, range.getNumColumns()).sort(sortSpecs);
  SpreadsheetApp.flush();
}



//derived functions for both cockpit and mail

//loads data and indices
