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
  if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
    return {
      mode: 'archive',
      label_or_endpoint: 'external archive',
      items_seen: 0,
      jobs_parsed: 0,
      rows_input_to_upsert: 0,
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      detail_fetch_attempted: 0,
      detail_fetch_count: 0,
      status: 'ok',
      message: 'No source rows to evaluate for archive.'
    };
  }

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

  //get data from Jobs_User
  const userSheet = sourceSs.getSheetByName(CONFIG.sheets.jobsUser);
  const userData = userSheet ? userSheet.getDataRange().getValues() : [];
  const userHeaders = userData.length ? userData[0] : [];
  const userRows = userData.length ? userData.slice(1) : [];
  const userIdx = indexMap_(userHeaders);

  const userMap = new Map();
  if (userIdx.unique_key != null) {
    userRows.forEach(row => {
      const key = String(row[userIdx.unique_key] || '').trim();
      if (key) userMap.set(key, row);
    });
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
    const uniqueKey = String(row[idx.unique_key] || '').trim();
    const userRow = userMap.get(uniqueKey) || null;
    const decision = getArchiveDecision_(row, idx, userRow, now);
    if (!decision.shouldArchive) return;

    const archivedRow = row.slice();

    if (idx.archived_at != null) {
      archivedRow[idx.archived_at] = now;
    }
    if (idx.archive_reason != null) {
      archivedRow[idx.archive_reason] = decision.reason;
    }

    rowsToArchive.push(archivedRow);
    sourceRowNumbersToDelete.push(i + 2);
  });

  if (!rowsToArchive.length) {
    Logger.log('Archived to external: 0');
    return {
      mode: 'archive',
      label_or_endpoint: 'external archive',
      items_seen: sourceRows.length,
      jobs_parsed: rowsToArchive.length,
      rows_input_to_upsert: 0,
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      detail_fetch_attempted: 0,
      detail_fetch_count: 0,
      status: 'ok',
      message: 'Archived to external: 0'
    };
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

  return {
    mode: 'archive',
    label_or_endpoint: 'external archive',
    items_seen: sourceRows.length,
    jobs_parsed: rowsToArchive.length,
    rows_input_to_upsert: 0,
    jobs_upserted: 0,
    new_jobs: rowsToArchive.length,
    updated_jobs: 0,
    relevant_count: 0,
    maybe_count: 0,
    ignore_count: 0,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: 'Archived to external: ' + rowsToArchive.length
  };
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

    const uniqueKey = String(row[idx.unique_key] || '').trim();
    const userRow = userMap.get(uniqueKey) || null;
    const decision = getArchiveDecision_(row, idx, userRow, now);
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



function restoreArchivedJobsByKeys_(uniqueKeys) {
  if (!Array.isArray(uniqueKeys) || !uniqueKeys.length) {
    throw new Error('uniqueKeys must be a non-empty array.');
  }

  const normalizedKeys = new Set(
    uniqueKeys
      .map(k => String(k || '').trim())
      .filter(Boolean)
  );

  if (!normalizedKeys.size) {
    throw new Error('No valid unique keys provided.');
  }

  const sourceSs = SpreadsheetApp.getActiveSpreadsheet();
  const jobsAllSheet = sourceSs.getSheetByName(CONFIG.sheets.jobsAll);
  if (!jobsAllSheet || jobsAllSheet.getLastRow() < 1) {
    throw new Error('Jobs_All fehlt oder ist leer.');
  }

  const archiveId = getArchiveSpreadsheetId_();
  const archiveFile = DriveApp.getFileById(archiveId);
  if (archiveFile.isTrashed()) {
    throw new Error('Archive spreadsheet is in Trash.');
  }

  const archiveSs = SpreadsheetApp.openById(archiveId);
  const archiveSheet = archiveSs.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet || archiveSheet.getLastRow() < 1) {
    throw new Error('Archive sheet not found or empty: ' + ARCHIVE_SHEET_NAME);
  }

  const jobsAllHeaders = jobsAllSheet.getRange(1, 1, 1, jobsAllSheet.getLastColumn()).getValues()[0];
  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];
  assertSameHeaders_(jobsAllHeaders, archiveHeaders);

  const idx = indexMap_(archiveHeaders);

  const jobsAllData = jobsAllSheet.getDataRange().getValues();
  const existingActiveKeys = new Set(
    jobsAllData.slice(1).map(row => String(row[idx.unique_key] || '').trim()).filter(Boolean)
  );

  const archiveData = archiveSheet.getDataRange().getValues();
  const archiveRows = archiveData.slice(1);

  const rowsToRestore = [];
  const archiveRowNumbersToDelete = [];
  const skippedAlreadyActive = [];
  const notFound = new Set(normalizedKeys);

  archiveRows.forEach((row, i) => {
    const key = String(row[idx.unique_key] || '').trim();
    if (!normalizedKeys.has(key)) return;

    notFound.delete(key);

    if (existingActiveKeys.has(key)) {
      skippedAlreadyActive.push(key);
      return;
    }

    const restoredRow = row.slice();

    if (idx.archived_at != null) restoredRow[idx.archived_at] = '';
    if (idx.archive_reason != null) restoredRow[idx.archive_reason] = '';

    rowsToRestore.push(restoredRow);
    archiveRowNumbersToDelete.push(i + 2);
  });

  if (!rowsToRestore.length) {
    Logger.log('Restore: 0');
    Logger.log('Not found: ' + JSON.stringify(Array.from(notFound)));
    Logger.log('Already active: ' + JSON.stringify(skippedAlreadyActive));
    return {
      restored_count: 0,
      not_found: Array.from(notFound),
      already_active: skippedAlreadyActive
    };
  }

  const startRow = jobsAllSheet.getLastRow() + 1;
  jobsAllSheet
    .getRange(startRow, 1, rowsToRestore.length, rowsToRestore[0].length)
    .setValues(rowsToRestore);

  SpreadsheetApp.flush();

  for (let i = archiveRowNumbersToDelete.length - 1; i >= 0; i--) {
    archiveSheet.deleteRow(archiveRowNumbersToDelete[i]);
  }

  Logger.log('Restore: ' + rowsToRestore.length);
  Logger.log('Not found: ' + JSON.stringify(Array.from(notFound)));
  Logger.log('Already active: ' + JSON.stringify(skippedAlreadyActive));

  return {
    restored_count: rowsToRestore.length,
    not_found: Array.from(notFound),
    already_active: skippedAlreadyActive
  };
}


function zzz_ADMIN_restoreArchivedJobByKey() {
  const uniqueKey = '1d271559b664833869072de0a24667fe';
  restoreArchivedJobsByKeys_([uniqueKey]);
}


function zzz_ADMIN_restoreArchivedJobs_batch() {
  restoreArchivedJobsByKeys_([
    '1d271559b664833869072de0a24667fe',
    '5ab19b3e70ed92e3096f975a9bbee7be'
  ]);
}


function zzz_ADMIN_restoreWronglyArchivedJobs() {
  restoreArchivedJobsByKeys_([
    '1d271559b664833869072de0a24667fe'
  ]);
}




function zzz_ADMIN_restoreArchivedJobsMissingFromAllButPresentInUser() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsAllSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const jobsUserSheet = ss.getSheetByName(CONFIG.sheets.jobsUser);
  if (!jobsAllSheet) throw new Error('Jobs_All fehlt.');
  if (!jobsUserSheet) throw new Error('Jobs_User fehlt.');

  const jobsAllData = jobsAllSheet.getDataRange().getValues();
  const jobsAllHeaders = jobsAllData[0] || [];
  const jobsAllRows = jobsAllData.slice(1);
  const jobsAllIdx = indexMap_(jobsAllHeaders);

  const jobsUserData = jobsUserSheet.getDataRange().getValues();
  const jobsUserHeaders = jobsUserData[0] || [];
  const jobsUserRows = jobsUserData.slice(1);
  const jobsUserIdx = indexMap_(jobsUserHeaders);

  if (jobsAllIdx.unique_key == null) throw new Error('Jobs_All: unique_key fehlt.');
  if (jobsUserIdx.unique_key == null) throw new Error('Jobs_User: unique_key fehlt.');

  const activeKeys = new Set(
    jobsAllRows
      .map(row => String(row[jobsAllIdx.unique_key] || '').trim())
      .filter(Boolean)
  );

  const userKeysMissingInAll = new Set(
    jobsUserRows
      .map(row => String(row[jobsUserIdx.unique_key] || '').trim())
      .filter(Boolean)
      .filter(key => !activeKeys.has(key))
  );

  if (!userKeysMissingInAll.size) {
    Logger.log('Restore by Jobs_User: 0');
    return {
      restored_count: 0,
      candidate_keys: 0,
      not_found_in_archive: []
    };
  }



  const archiveId = getArchiveSpreadsheetId_();
  const archiveFile = DriveApp.getFileById(archiveId);
  if (archiveFile.isTrashed()) {
    throw new Error('Archive spreadsheet is in Trash.');
  }

  const archiveSs = SpreadsheetApp.openById(archiveId);
  const archiveSheet = archiveSs.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet || archiveSheet.getLastRow() < 1) {
    throw new Error('Archive sheet not found or empty: ' + ARCHIVE_SHEET_NAME);
  }

  const archiveData = archiveSheet.getDataRange().getValues();
  const archiveHeaders = archiveData[0] || [];
  const archiveRows = archiveData.slice(1);
  const archiveIdx = indexMap_(archiveHeaders);

  assertSameHeaders_(jobsAllHeaders, archiveHeaders);

  const rowsToRestore = [];
  const archiveRowNumbersToDelete = [];
  const foundInArchive = new Set();

  archiveRows.forEach((row, i) => {
    const key = String(row[archiveIdx.unique_key] || '').trim();
    if (!userKeysMissingInAll.has(key)) return;

    foundInArchive.add(key);

    const restoredRow = row.slice();
    if (archiveIdx.archived_at != null) restoredRow[archiveIdx.archived_at] = '';
    if (archiveIdx.archive_reason != null) restoredRow[archiveIdx.archive_reason] = '';

    rowsToRestore.push(restoredRow);
    archiveRowNumbersToDelete.push(i + 2);
  });

  const notFoundInArchive = Array.from(userKeysMissingInAll).filter(key => !foundInArchive.has(key));

  if (!rowsToRestore.length) {
    Logger.log('Restore by Jobs_User: 0');
    Logger.log('Not found in archive: ' + JSON.stringify(notFoundInArchive));
    return {
      restored_count: 0,
      candidate_keys: userKeysMissingInAll.size,
      not_found_in_archive: notFoundInArchive
    };
  }

  const startRow = jobsAllSheet.getLastRow() + 1;
  jobsAllSheet
    .getRange(startRow, 1, rowsToRestore.length, rowsToRestore[0].length)
    .setValues(rowsToRestore);

  SpreadsheetApp.flush();

  for (let i = archiveRowNumbersToDelete.length - 1; i >= 0; i--) {
    archiveSheet.deleteRow(archiveRowNumbersToDelete[i]);
  }

  Logger.log('Restore by Jobs_User: ' + rowsToRestore.length);
  Logger.log('Not found in archive: ' + JSON.stringify(notFoundInArchive));

  return {
    restored_count: rowsToRestore.length,
    candidate_keys: userKeysMissingInAll.size,
    not_found_in_archive: notFoundInArchive
  };
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




function getArchiveDecision_(row, idx, userRow, now) {
  if (userRow && userRow.length) {
    return { shouldArchive: false, reason: '' };
  }

  const cutoffDeadline = new Date(now);
  cutoffDeadline.setDate(cutoffDeadline.getDate() - ARCHIVE_DEADLINE_BUFFER_DAYS);

  const cutoffStale = new Date(now);
  cutoffStale.setDate(cutoffStale.getDate() - ARCHIVE_STALE_DAYS);

  // const quickFlag = idx.quick_flag != null
  //   ? String(row[idx.quick_flag] || '').trim()
  //   : '';
  // if (quickFlag) return { shouldArchive: false, reason: '' };

  // const applicationStatus = idx.application_status != null
  //   ? String(row[idx.application_status] || '').trim()
  //   : '';
  // if (applicationStatus) return { shouldArchive: false, reason: '' };

  // const notes = idx.notes != null
  //   ? String(row[idx.notes] || '').trim()
  //   : '';
  // if (notes) return { shouldArchive: false, reason: '' };

  const deadline = idx.deadline != null && row[idx.deadline] instanceof Date
    ? row[idx.deadline]
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
    const uniqueKey = String(row[idx.unique_key] || '').trim();
    const userRow = userMap.get(uniqueKey) || null;
    const decision = getArchiveDecision_(row, idx, userRow, now);
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
    const uniqueKey = String(row[idx.unique_key] || '').trim();
    const userRow = userMap.get(uniqueKey) || null;
    const decision = getArchiveDecision_(row, idx, userRow, now);

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