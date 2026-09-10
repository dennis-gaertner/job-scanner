// views/cockpit-formatting.js — extracted without changing function implementations.

function formatJobsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs_Cockpit');
  if (!sheet) throw new Error('Jobs_Cockpit sheet not found');
  formatJobsCockpit_(sheet);
}


function formatJobsCockpit_(sheet) {
  if (!sheet) {
    throw new Error('formatJobsCockpit_: sheet is undefined');
  }
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];
  const numRows = range.getNumRows();
  const numCols = headers.length;

  const headerRow = 1;
  const bodyRows = Math.max(numRows - 1, 0);

  const newCol = headers.indexOf('new_flag') + 1;
  const quickFlagCol = headers.indexOf('quick_flag') + 1;
  const sourceCol = headers.indexOf('source') + 1;
  const locationCol = headers.indexOf('location') + 1;
  const titleCol = headers.indexOf('display_title') + 1;
  const employerCol = headers.indexOf('employer') + 1;
  const seenAtCol = headers.indexOf('seen_at') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;
  const deadlineCol = headers.indexOf('deadline') + 1;
  const daysCol = headers.indexOf('days_to_deadline') + 1;
  const urlCol = headers.indexOf('url') + 1;
  const positiveHitsCol = headers.indexOf('positive_hits') + 1;
  const negativeHitsCol = headers.indexOf('negative_hits') + 1;
  const hardRejectHitCol = headers.indexOf('hard_reject_hit') + 1;
  const hardRejectHitsCol = headers.indexOf('hard_reject_hits') + 1;
  const appStatusCol = headers.indexOf('application_status') + 1;
  const visibilityPrefCol = headers.indexOf('visibility_preference') + 1;
  const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
  const manualCategoryCol = headers.indexOf('manual_category') + 1;
  const manualDeltaCol = headers.indexOf('manual_score_delta') + 1;
  const learnCol = headers.indexOf('learn_from_feedback') + 1;
  const manualTitleCol = headers.indexOf('manual_title') + 1;
  const notesCol = headers.indexOf('notes') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const finalScoreCol = headers.indexOf('final_score') + 1;
  const workRankCol = headers.indexOf('work_rank') + 1;
  const categoryRankCol = headers.indexOf('category_rank') + 1;
  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  const jobStateCol = headers.indexOf('job_state') + 1;
  const jobStateRankCol = headers.indexOf('job_state_rank') + 1;

  // --- Conditional rules sauber neu setzen ---
  sheet.clearConditionalFormatRules();

  // --- Freeze ---
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4); // new_flag, quick_flag, source, location

  // --- Filter ---
  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  if (numRows > 1 && numCols > 0) {
    sheet.getRange(1, 1, numRows, numCols).createFilter();
  }

  // --- Header ---
  const headerRange = sheet.getRange(headerRow, 1, 1, numCols);
  headerRange
    .setFontWeight('bold')
    .setWrap(false);

  // --- Grundformat Body ---
  if (bodyRows > 0) {
    const bodyRange = sheet.getRange(2, 1, bodyRows, numCols);
    bodyRange
      .setFontColor('black')
      .setFontWeight('normal')
      .setFontSize(10)
      .setWrap(false)
      .setBackground(null);
  }

  // --- Editierbare Spalten leicht einfärben ---
  const editableCols = [
    quickFlagCol,
    jobStateCol,
    appStatusCol,
    visibilityPrefCol,
    manualCategoryCol,
    manualDeltaCol,
    learnCol,
    manualTitleCol,
    notesCol
  ].filter(c => c > 0);

  editableCols.forEach(col => {
    if (bodyRows > 0) {
      sheet.getRange(2, col, bodyRows, 1).setBackground('#eef4ff');
    }
  });

  // --- Keyword-Spalten leicht einfärben ---
  const explainCols = [
    positiveHitsCol,
    negativeHitsCol,
    hardRejectHitCol,
    hardRejectHitsCol
  ].filter(c => c > 0);

  explainCols.forEach(col => {
    if (bodyRows > 0) {
      sheet.getRange(2, col, bodyRows, 1).setBackground('#fef3c7');
    }
  });

  
  // --- Zahl-/Datumsformate ---
  if (seenAtCol > 0 && bodyRows > 0) {
    sheet.getRange(2, seenAtCol, bodyRows, 1).setNumberFormat('dd.mm.');
  }

  if (jobAgeCol > 0 && bodyRows > 0) {
    sheet.getRange(2, jobAgeCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0 && bodyRows > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (finalScoreCol > 0 && bodyRows > 0) {
    sheet.getRange(2, finalScoreCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (manualDeltaCol > 0 && bodyRows > 0) {
    sheet.getRange(2, manualDeltaCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (deadlineCol > 0 && bodyRows > 0) {
    sheet.getRange(2, deadlineCol, bodyRows, 1).setNumberFormat('dd.mm.');
  }

  if (daysCol > 0 && bodyRows > 0) {
    sheet.getRange(2, daysCol, bodyRows, 1).setNumberFormat('0');
  }

  // --- NEW-Spalte kleiner ---
  if (newCol > 0 && bodyRows > 0) {
    sheet.getRange(2, newCol, bodyRows, 1).setFontSize(9);
  }

  // --- Spaltenbreiten (pragmatisch) ---
  if (newCol > 0) sheet.setColumnWidth(newCol, 32);
  if (quickFlagCol > 0) sheet.setColumnWidth(quickFlagCol, 20);
  if (sourceCol > 0) sheet.setColumnWidth(sourceCol, 50);
  if (locationCol > 0) sheet.setColumnWidth(locationCol, 85);
  if (jobStateCol > 0) sheet.setColumnWidth(jobStateCol, 55);
  if (visibilityPrefCol > 0) sheet.setColumnWidth(visibilityPrefCol, 85);
  if (visibilityRankCol > 0) sheet.setColumnWidth(visibilityRankCol, 70);
  if (jobStateRankCol > 0) sheet.setColumnWidth(jobStateRankCol, 70);
  if (titleCol > 0) sheet.setColumnWidth(titleCol, 260);
  if (employerCol > 0) sheet.setColumnWidth(employerCol, 150);
  if (seenAtCol > 0) sheet.setColumnWidth(seenAtCol, 60);
  if (jobAgeCol > 0) sheet.setColumnWidth(jobAgeCol, 40);
  if (deadlineCol > 0) sheet.setColumnWidth(deadlineCol, 60);
  if (daysCol > 0) sheet.setColumnWidth(daysCol, 40);

  if (urlCol > 0) sheet.setColumnWidth(urlCol, 65);
  if (scoreNormCol > 0) sheet.setColumnWidth(scoreNormCol, 70);
  if (finalScoreCol > 0) sheet.setColumnWidth(finalScoreCol, 70);
  if (positiveHitsCol > 0) sheet.setColumnWidth(positiveHitsCol, 180);
  if (negativeHitsCol > 0) sheet.setColumnWidth(negativeHitsCol, 160);
  if (hardRejectHitCol > 0) sheet.setColumnWidth(hardRejectHitCol, 140);
  if (hardRejectHitsCol > 0) sheet.setColumnWidth(hardRejectHitsCol, 160);
  if (manualCategoryCol > 0) sheet.setColumnWidth(manualCategoryCol, 70);
  if (manualDeltaCol > 0) sheet.setColumnWidth(manualDeltaCol, 70);
  if (learnCol > 0) sheet.setColumnWidth(learnCol, 70);
  if (manualTitleCol > 0) sheet.setColumnWidth(manualTitleCol, 180);
  if (notesCol > 0) sheet.setColumnWidth(notesCol, 220);
  if (workRankCol > 0) sheet.setColumnWidth(workRankCol, 70);
  if (categoryRankCol > 0) sheet.setColumnWidth(categoryRankCol, 70);
  if (uniqueKeyCol > 0) sheet.setColumnWidth(uniqueKeyCol, 160);

  // --- Conditional formatting Regeln ---
  const rules = [];

  // NEW = rot + fett
  if (newCol > 0 && bodyRows > 0) {
    const newRange = sheet.getRange(2, newCol, bodyRows, 1);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('NEW')
        .setFontColor('#d93025')
        .setBold(true)
        .setRanges([newRange])
        .build()
    );
  }

  // Quick-Flag: A = rot, B = orange, ! = blau, X = grau
  if (quickFlagCol > 0 && bodyRows > 0) {
    const quickRange = sheet.getRange(2, quickFlagCol, bodyRows, 1);
    const qCol = columnToLetter_(quickFlagCol);

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="A"`)
        .setBackground('#8b0000')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="B"`)
        .setBackground('#f59e0b')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="!"`)
        .setBackground('#2563eb')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="X"`)
        .setBackground('#6b7280')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($${qCol}2<>"",$${qCol}2<>"A",$${qCol}2<>"B",$${qCol}2<>"!",$${qCol}2<>"X")`)
        .setBackground('#dbeafe')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );
  }

  // Ganze Zeile dimmen abhängig von job_state / application_status
  if (bodyRows > 0) {
    const fullBodyRange = sheet.getRange(2, 1, bodyRows, numCols);

    if (jobStateCol > 0) {
      const jobStateLetter = columnToLetter_(jobStateCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=$${jobStateLetter}2="closed"`)
          .setFontColor('#bbbbbb')
          .setRanges([fullBodyRange])
          .build()
      );
    }

    if (appStatusCol > 0) {
      const appStatusLetter = columnToLetter_(appStatusCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=AND($${appStatusLetter}2<>"",$${appStatusLetter}2<>"none")`)
          .setFontColor('#999999')
          .setRanges([fullBodyRange])
          .build()
      );
    }
  }

  if (visibilityPrefCol > 0 && bodyRows > 0) {
    const visRange = sheet.getRange(2, visibilityPrefCol, bodyRows, 1);
    const visLetter = columnToLetter_(visibilityPrefCol);

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${visLetter}2="hidden"`)
        .setBackground('#e5e7eb')
        .setFontColor('#374151')
        .setRanges([visRange])
        .build()
    );
  }

  // days_to_deadline: bald fällig / überfällig
  if (daysCol > 0 && bodyRows > 0) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThanOrEqualTo(3)
        .setBackground('#fdecea')
        .setRanges([sheet.getRange(2, daysCol, bodyRows, 1)])
        .build()
    );
  }

  sheet.setConditionalFormatRules(rules);
}



function applyNewFlagFormulas_(sheet, totalRows) {
  const numRows = totalRows || sheet.getLastRow();
  if (numRows < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const newCol = headers.indexOf('new_flag') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;

  if (newCol < 1 || jobAgeCol < 1) return;

  const jobAgeLetter = columnToLetter_(jobAgeCol);

  const formulas = [];
  for (let r = 2; r <= numRows; r++) {
    formulas.push([
      `=IF(AND(${jobAgeLetter}${r}<>"",${jobAgeLetter}${r}<=Settings!$B$2),"NEW","")`
    ]);
  }

  sheet.getRange(2, newCol, numRows - 1, 1).setFormulas(formulas);
}


function columnToLetter_(column) {
  let temp = '';
  let letter = '';

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}


