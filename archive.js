const ARCHIVE_DEADLINE_BUFFER_DAYS = 0;   // delete x days after deadline
const ARCHIVE_STALE_DAYS = 30;             // „nie reagiert“

const ARCHIVE_FILE_NAME = 'Job Scanner – Archive';
const ARCHIVE_SHEET_NAME = 'Jobs_Archive';

// *****************************************
// 5B. ARCHIVIERUNG
// *****************************************
function zzz_ADMIN_setupArchiveSpreadsheet() {
    setupArchiveSpreadsheet_();
}





function setupArchiveSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sourceSheet || sourceSheet.getLastRow() < 1) {
    throw new Error('Jobs_All fehlt oder ist leer.');
  }

  const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

  // 1. Datei erstellen
  const archiveSs = SpreadsheetApp.create(ARCHIVE_FILE_NAME);
  const archiveFile = DriveApp.getFileById(archiveSs.getId());

  // 2. Ordner des aktuellen Sheets holen
  const parentFolders = DriveApp.getFileById(ss.getId()).getParents();

  if (parentFolders.hasNext()) {
    const parentFolder = parentFolders.next();

    // 3. in gleichen Ordner verschieben
    parentFolder.addFile(archiveFile);

    // optional: aus Root entfernen
    DriveApp.getRootFolder().removeFile(archiveFile);
  }

  // 4. Sheet umbenennen + Header setzen
  const archiveSheet = archiveSs.getSheets()[0];
  archiveSheet.setName(ARCHIVE_SHEET_NAME);
  archiveSheet.getRange(1, 1, 1, sourceHeaders.length).setValues([sourceHeaders]);

  // 5. ID speichern
  PropertiesService.getScriptProperties().setProperty(
    'ARCHIVE_SPREADSHEET_ID',
    archiveSs.getId()
  );

  Logger.log('Archive created in same folder.');
}

function validateArchiveTarget() {
    validateArchiveTarget_();
}


function validateArchiveTarget_() {
  const archiveId = getArchiveSpreadsheetId_();
  const archiveFile = DriveApp.getFileById(archiveId);

  if (archiveFile.isTrashed()) {
    throw new Error('Archive spreadsheet is in Trash.');
  }

  const archiveSs = SpreadsheetApp.openById(archiveId);
  const archiveSheet = archiveSs.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet) {
    throw new Error('Archive sheet not found: ' + ARCHIVE_SHEET_NAME);
  }

  const sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sourceSheet || sourceSheet.getLastRow() < 1) {
    throw new Error('Jobs_All fehlt oder ist leer.');
  }

  const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];

  assertSameHeaders_(sourceHeaders, archiveHeaders);

  Logger.log('Archive target valid.');
  Logger.log('Archive ID: ' + archiveId);
  Logger.log('Archive URL: ' + archiveSs.getUrl());
  Logger.log('Archive name: ' + archiveSs.getName());
}

function assertSameHeaders_(sourceHeaders, targetHeaders) {
  const a = JSON.stringify(sourceHeaders);
  const b = JSON.stringify(targetHeaders);

  if (a !== b) {
    throw new Error('Header mismatch between Jobs_All and Jobs_Archive.');
  }
}


function getArchiveSpreadsheetId_() {
  const archiveId = PropertiesService
    .getScriptProperties()
    .getProperty('ARCHIVE_SPREADSHEET_ID');

  if (!archiveId) {
    throw new Error('Archive spreadsheet ID not set. Run setupArchiveSpreadsheet_() first.');
  }

  return archiveId;
}



function zzz_ADMIN_archiveCandidates_TO_EXTERNAL() {
  const sourceSs = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = sourceSs.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sourceSheet || sourceSheet.getLastRow() <= 1) return;

    const archiveId = getArchiveSpreadsheetId_();
    const archiveFile = DriveApp.getFileById(archiveId);

    if (archiveFile.isTrashed()) {
    throw new Error('Archive spreadsheet is in Trash.');
    }

    const archiveSs = SpreadsheetApp.openById(archiveId);
    const archiveSheet = archiveSs.getSheetByName(ARCHIVE_SHEET_NAME);
    if (!archiveSheet) {
    throw new Error('Archive sheet not found: ' + ARCHIVE_SHEET_NAME);
    }

  const sourceData = sourceSheet.getDataRange().getValues();
  const sourceHeaders = sourceData[0];
  const idx = indexMap_(sourceHeaders);
  const sourceRows = sourceData.slice(1);

  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];
  assertSameHeaders_(sourceHeaders, archiveHeaders);

  const now = new Date();
  const rowsToArchive = [];
  const sourceRowNumbersToDelete = [];

  sourceRows.forEach((row, i) => {
    const decision = getArchiveDecision_(row, idx, now);
    if (!decision.shouldArchive) return;

    const archivedRow = row.slice();

    if (idx.archived_at != null) {
      archivedRow[idx.archived_at] = now;
    }
    if (idx.archive_reason != null) {
      archivedRow[idx.archive_reason] = decision.reason;
    }

    rowsToArchive.push(archivedRow);
    sourceRowNumbersToDelete.push(i + 2); // +2 because sheet row numbering starts at 1 and row 1 is header
  });

  if (!rowsToArchive.length) {
    Logger.log('Archived to external: 0');
    return;
  }

  const archiveStartRow = archiveSheet.getLastRow() + 1;
  archiveSheet
    .getRange(archiveStartRow, 1, rowsToArchive.length, rowsToArchive[0].length)
    .setValues(rowsToArchive);

  SpreadsheetApp.flush();

  for (let i = sourceRowNumbersToDelete.length - 1; i >= 0; i--) {
    sourceSheet.deleteRow(sourceRowNumbersToDelete[i]);
  }

  Logger.log('Archived to external: ' + rowsToArchive.length);
}



function zzz_ADMIN_archiveCandidates_TO_EXTERNAL_TEST10() {
  const sourceSs = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = sourceSs.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sourceSheet || sourceSheet.getLastRow() <= 1) return;

  const archiveSs = SpreadsheetApp.openById(getArchiveSpreadsheetId_());
  const archiveSheet = archiveSs.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet) {
    throw new Error('Archive sheet not found: ' + ARCHIVE_SHEET_NAME);
  }

  const sourceData = sourceSheet.getDataRange().getValues();
  const sourceHeaders = sourceData[0];
  const idx = indexMap_(sourceHeaders);
  const sourceRows = sourceData.slice(1);

  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];
  assertSameHeaders_(sourceHeaders, archiveHeaders);

  const now = new Date();
  const rowsToArchive = [];
  const sourceRowNumbersToDelete = [];

  sourceRows.forEach((row, i) => {
    if (rowsToArchive.length >= 10) return;

    const decision = getArchiveDecision_(row, idx, now);
    if (!decision.shouldArchive) return;

    const archivedRow = row.slice();

    if (idx.archived_at != null) archivedRow[idx.archived_at] = now;
    if (idx.archive_reason != null) archivedRow[idx.archive_reason] = decision.reason;

    rowsToArchive.push(archivedRow);
    sourceRowNumbersToDelete.push(i + 2);
  });

  if (!rowsToArchive.length) {
    Logger.log('Archived to external (test10): 0');
    return;
  }

  const archiveStartRow = archiveSheet.getLastRow() + 1;
  archiveSheet
    .getRange(archiveStartRow, 1, rowsToArchive.length, rowsToArchive[0].length)
    .setValues(rowsToArchive);

  SpreadsheetApp.flush();

  for (let i = sourceRowNumbersToDelete.length - 1; i >= 0; i--) {
    sourceSheet.deleteRow(sourceRowNumbersToDelete[i]);
  }

  Logger.log('Archived to external (test10): ' + rowsToArchive.length);
}


function archiveJobRow_(row, idx, reason, batchId, by) {
  if (idx.status != null) {
    row[idx.status] = 'archived';
  }

  if (idx.archived_at != null) {
    row[idx.archived_at] = new Date();
  }

  if (idx.archive_reason != null) {
    row[idx.archive_reason] = reason || 'manual';
  }

  if (idx.archive_batch_id != null) {
    row[idx.archive_batch_id] = batchId || '';
  }

  if (idx.archived_by != null) {
    row[idx.archived_by] = by || 'manual';
  }
}


function unarchiveJobRow_(row, idx) {
  if (idx.status != null) {
    row[idx.status] = 'open';
  }

  if (idx.archived_at != null) {
    row[idx.archived_at] = '';
  }

  if (idx.archive_reason != null) {
    row[idx.archive_reason] = '';
  }

  if (idx.archive_batch_id != null) {
    row[idx.archive_batch_id] = '';
  }

  if (idx.archived_by != null) {
    row[idx.archived_by] = '';
  }
}


function zzz_ADMIN_archiveOldOpenJobs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Archivierung starten',
    'Diese Funktion archiviert alte offene Jobs. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  zzz_ADMIN_archiveOldOpenJobs_();
}


function zzz_ADMIN_archiveOldOpenJobs_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  const batchId = Utilities.getUuid();
  let changed = 0;

  rows.forEach(row => {
    const status = String(row[idx.status] || '').trim().toLowerCase();
    if (status !== 'open') return;

    const quickFlag = String(row[idx.quick_flag] || '').trim();
    if (quickFlag) return;

    const applicationStatus = String(row[idx.application_status] || '').trim();
    if (applicationStatus) return;

    const deadline = row[idx.deadline] instanceof Date ? row[idx.deadline] : null;
    const firstSeen = row[idx.first_seen_at] instanceof Date ? row[idx.first_seen_at] : null;

    const oldDeadline = deadline && deadline < cutoff;
    const noDeadline = !deadline;
    const oldFirstSeen = firstSeen && firstSeen < cutoff;

    const finalCategory = normalizeCategoryLabel_(row[idx.final_category]);
    const manualOverride = normalizeCategoryLabel_(row[idx.manual_category_override]);

    const oldWithoutDeadline = noDeadline && oldFirstSeen;
    const oldAndIgnored =
      oldFirstSeen &&
      (manualOverride === 'Ignorieren' || finalCategory === 'Ignorieren');

    if (oldDeadline || oldWithoutDeadline || oldAndIgnored) {
      archiveJobRow_(row, idx, 'old_open_job', batchId, 'auto');
      changed++;
    }
  });

  if (!changed) {
    Logger.log('Archived jobs: 0');
    return;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('Archived jobs: ' + changed);
}


function zzz_ADMIN_archiveOldOpenJobs_DRYRUN() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  let affected = 0;

  rows.forEach(row => {

    const status = String(row[idx.status] || '').trim().toLowerCase();
    if (status !== 'open') return;

    const quickFlag = String(row[idx.quick_flag] || '').trim();
    if (quickFlag) return;

    const applicationStatus = String(row[idx.application_status] || '').trim();
    if (applicationStatus) return;

    const deadline = row[idx.deadline] instanceof Date ? row[idx.deadline] : null;
    const firstSeen = row[idx.first_seen_at] instanceof Date ? row[idx.first_seen_at] : null;

    const oldDeadline = deadline && deadline < cutoff;
    const noDeadline = !deadline;
    const oldFirstSeen = firstSeen && firstSeen < cutoff;

    const finalCategory = normalizeCategoryLabel_(row[idx.final_category]);
    const manualOverride = normalizeCategoryLabel_(row[idx.manual_category_override]);

    const oldWithoutDeadline = noDeadline && oldFirstSeen;

    const oldAndIgnored =
      oldFirstSeen &&
      (manualOverride === 'Ignorieren' || finalCategory === 'Ignorieren');

    if (oldDeadline || oldWithoutDeadline || oldAndIgnored) {
      affected++;
    }

  });

  Logger.log('Jobs that WOULD be archived: ' + affected);
}




function getArchiveDecision_(row, idx, now) {
  const cutoffDeadline = new Date(now);
  cutoffDeadline.setDate(cutoffDeadline.getDate() - ARCHIVE_DEADLINE_BUFFER_DAYS);

  const cutoffStale = new Date(now);
  cutoffStale.setDate(cutoffStale.getDate() - ARCHIVE_STALE_DAYS);

  const quickFlag = idx.quick_flag != null
    ? String(row[idx.quick_flag] || '').trim()
    : '';
  if (quickFlag) return { shouldArchive: false, reason: '' };

  const applicationStatus = idx.application_status != null
    ? String(row[idx.application_status] || '').trim()
    : '';
  if (applicationStatus) return { shouldArchive: false, reason: '' };

  const notes = idx.notes != null
    ? String(row[idx.notes] || '').trim()
    : '';
  if (notes) return { shouldArchive: false, reason: '' };

  const deadline = idx.deadline != null && row[idx.deadline] instanceof Date
    ? row[idx.deadline]
    : null;

  const firstSeen = idx.first_seen_at != null && row[idx.first_seen_at] instanceof Date
    ? row[idx.first_seen_at]
    : null;

  if (deadline) {
    if (deadline < cutoffDeadline) {
      return { shouldArchive: true, reason: 'deadline_expired' };
    }
    return { shouldArchive: false, reason: '' };
  }

    const staleBaseDate =
    idx.mail_date != null && row[idx.mail_date] instanceof Date
        ? row[idx.mail_date]
        : idx.first_seen_at != null && row[idx.first_seen_at] instanceof Date
        ? row[idx.first_seen_at]
        : null;

    if (!deadline && staleBaseDate && staleBaseDate < cutoffStale) {
    return { shouldArchive: true, reason: 'stale_no_deadline' };
    }

  return { shouldArchive: false, reason: '' };
}

function zzz_ADMIN_archiveCandidates_DRYRUN() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();

  let affected = 0;
  const reasons = {};

  rows.forEach(row => {
    const decision = getArchiveDecision_(row, idx, now);
    if (!decision.shouldArchive) return;

    affected++;
    reasons[decision.reason] = (reasons[decision.reason] || 0) + 1;
  });

  Logger.log('Jobs that WOULD be archived: ' + affected);
  Logger.log('Reasons: ' + JSON.stringify(reasons));
}



function zzz_ADMIN_markArchiveCandidates_PREVIEW() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();

  let marked = 0;

  rows.forEach(row => {
    const decision = getArchiveDecision_(row, idx, now);

    if (!decision.shouldArchive) return;

    if (idx.archived_at != null) {
      row[idx.archived_at] = now;
    }

    if (idx.archive_reason != null) {
      row[idx.archive_reason] = decision.reason;
    }

    marked++;
  });

  if (!marked) {
    Logger.log('Preview marked: 0');
    return;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  Logger.log('Preview marked: ' + marked);
}