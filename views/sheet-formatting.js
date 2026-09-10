// views/sheet-formatting.js — extracted without changing function implementations.

function formatJobsAllSheet_(sheet) {

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h || '').trim());

  const idx = indexMap_(headers);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastCol < 1) return;

  // --- Column widths ---
  const widths = {
    new_flag: 34,
    quick_flag: 26,

    title: 297,
    employer: 212,
    location: 104,
    source: 62,
    mail_date: 67,
    deadline: 59,
    score: 41,
    score_normalized: 54,
    category: 90,
    final_score: 54,
    final_category: 90,

    percent_or_workload: 58,
    grade: 61,
    domain: 45,
    dg: 63,
    first_seen_at: 67,
    last_seen_at: 70,
    notified_at: 53,

    application_status: 123,
    status: 72,
    manual_category_override: 118,
    manual_score_delta: 70,
    learn_from_feedback: 95,
    notes: 160,
    feedback_learned_at: 110,
    feedback_learning_version: 110,

    positive_hits: 57,
    negative_hits: 65,

    url: 90,
    unique_key: 61,
    hard_reject_hit: 238,
    hard_reject_hits: 238,
    source_label: 90,
    gmail_message_id: 148,
    gmail_thread_id: 114,
    raw_snippet: 247,
    detail_text: 247,
    raw_source_id: 247,
    run_id: 247
  };

  Object.keys(widths).forEach(name => {
    if (idx[name] != null) {
      sheet.setColumnWidth(idx[name] + 1, widths[name]);
    }
  });

  if (lastRow <= 1) return;

  const setFormat = (name, format) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setNumberFormat(format);
  };

  const setAlign = (name, align) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setHorizontalAlignment(align);
  };

  // --- Date formats (short) ---
  setFormat('mail_date', 'd.M.');
  setFormat('deadline', 'd.M.');
  setFormat('first_seen_at', 'd.M.');
  setFormat('last_seen_at', 'd.M.');
  setFormat('notified_at', 'd.M.');
  setFormat('feedback_learned_at', 'd.M.');

  // --- Numeric formats ---
  setFormat('score', '0');
  setFormat('score_normalized', '0.0');
  setFormat('final_score', '0.0');
  setFormat('manual_score_delta', '0.0;-0.0;');

  // --- Alignment ---
  [
    'mail_date',
    'deadline',
    'first_seen_at',
    'last_seen_at',
    'notified_at',
    'feedback_learned_at'
  ].forEach(c => setAlign(c, 'right'));

  [
    'score',
    'score_normalized',
    'final_score',
    'manual_score_delta'
  ].forEach(c => setAlign(c, 'right'));

  //Format new_flag column
  if (idx.new_flag != null && lastRow > 1) {
    const range = sheet.getRange(2, idx.new_flag + 1, lastRow - 1, 1);
    range.setFontColor('#cc0000');
    range.setFontWeight('bold');
    range.setFontSize(8);
    range.setHorizontalAlignment('center');
  }
}





function formatAllSheets() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsAll = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (jobsAll) {
    //formatJobsAllSheet_(jobsAll); doesn't work well anymore: outdated
    formatSheetByCategory_(jobsAll);
  }


}

function rebuildConditionalFormatting_(sheet) {

  const range = sheet.getRange("B2:B2000");

  const rules = [];

  // Regel 1: Zelle = "x" → grau + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("x")
      .setBackground("#888888")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  // Regel 2: Zelle nicht leer UND nicht "x" → dunkelrot + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($B2<>"",$B2<>"x")')
      .setBackground("#8b0000")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}


//new function to replace formatAllSheets(),
//minimal, formats mainly date formats 
function formatJobsAllScoreColumns_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Jobs_All');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return;

  const headers = data[0];
  const scoreCol = headers.indexOf('score') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const bodyRows = Math.max(sheet.getLastRow() - 1, 0);

  if (bodyRows < 1) return;

  if (scoreCol > 0) {
    sheet.getRange(2, scoreCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }
}



function formatSheetByCategory_(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  const range = sheet.getDataRange();
  range.setVerticalAlignment('top');

  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);

  const sheetName = sheet.getName();
  //const frozenCols =
  //  sheetName === CONFIG.sheets.jobsAll ? 7 :
  //  sheetName === CONFIG.sheets.relevantAll ? 3 : //set to zero for no column freeze
  //  0;
  //sheet.setFrozenColumns(Math.min(frozenCols, lastCol));
  //sheet.autoResizeColumns(1, lastCol);

  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = indexMap_(headers);
  const categoryCol = idx.final_category != null ? idx.final_category : idx.category;
  const categories = sheet.getRange(2, categoryCol + 1, lastRow - 1, 1).getValues();

  const backgrounds = categories.map(row => {
    const cat = row[0];

    const color =
      cat === 'Relevant' ? '#e6f4ea' :
      cat === 'Vielleicht' ? '#fff8e1' :
      cat === 'Ignorieren' ? '#fce8e6' :
      '#ffffff';

    return new Array(lastCol).fill(color);
  });

  sheet.getRange(2, 1, backgrounds.length, lastCol).setBackgrounds(backgrounds);


  // QUICK FLAG formatting
  if (idx.quick_flag != null && lastRow > 1) {

    const qRange = sheet.getRange(2, idx.quick_flag + 1, lastRow - 1, 1);
    const values = qRange.getValues();

    const backgrounds = values.map(r => {
      return [String(r[0]).trim() ? '#dbeafe' : '#ffffff'];
    });

    qRange.setBackgrounds(backgrounds);
    qRange.setFontWeight('bold');
    qRange.setHorizontalAlignment('center');
  }

  rebuildConditionalFormatting_(sheet);

}














