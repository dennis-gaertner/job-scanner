// scanners/scanners-main.js — extracted without changing function implementations.




function scanAllJobSources() {
  BUND_DETAIL_FETCH_COUNT = 0;
  setupJobSheets_();
  refreshLearningCache_();

  const runId = Utilities.getUuid();

  function safeRun_(fn, name) {
    const startedAt = new Date();
    try {
      const result = fn() || {};
      const finishedAt = new Date();

      appendScanLogRow_(Object.assign({
        run_at: startedAt,
        run_id: runId,
        source: name,
        mode: '',
        label_or_endpoint: '',
        mail_threads: 0,
        mail_messages: 0,
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
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        status: 'ok',
        message: ''
        }, result, {
          source: name
      }));
    } catch (e) {
      const finishedAt = new Date();
      Logger.log('ERROR in ' + name + ': ' + e);

      try {
        appendScanLogRow_({
          run_at: startedAt,
          run_id: runId,
          source: name,
          mode: '',
          label_or_endpoint: '',
          mail_threads: 0,
          mail_messages: 0,
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
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          status: 'error',
          message: String(e)
        });
      } catch (logError) {
        Logger.log('FAILED TO WRITE SCAN_LOG for ' + name + ': ' + String(logError));
      }
    }
  }

  safeRun_(() => scanBundDeRssToAll(runId), 'BundDE');
  safeRun_(() => scanBundJobsToAll(runId), 'BundCH');
  safeRun_(() => scanOebbJobsToAll(runId), 'OEBB');
  safeRun_(() => scanSbbJobsToAll(runId), 'SBB');
  safeRun_(() => scanLhJobsToAll(runId), 'LH');
  safeRun_(() => scanLhApiJobsToAll(runId), 'LH-Crawler');
  safeRun_(() => scanAirbusJobsToAll(runId), 'Airbus');
  safeRun_(() => scanAaKnJobsToAll(runId), 'AA-KN-Mail');
  safeRun_(() => scanAaKnCrawlerJobsToAll(runId), 'AA-KN-Crawler');
  safeRun_(() => scanEuCareersJobsToAll(runId), 'EU');
  safeRun_(() => scanSkyguideJobsToAll(runId), 'Skyguide');
  safeRun_(() => scanZrhJobsToAll(runId), 'ZRH');
  safeRun_(() => scanEurocontrolJobsToAll(runId), 'Eurocontrol');
  safeRun_(() => scanJobRoomJobsToAll(runId), 'JobRoom');
  safeRun_(() => scanDbJobsToAll(runId), 'DB');

Logger.log('BEFORE emailNewRelevantJobs');
emailNewRelevantJobs(runId);
Logger.log('AFTER emailNewRelevantJobs');

Logger.log('BEFORE formatJobsAllScoreColumns_');
formatJobsAllScoreColumns_();
Logger.log('AFTER formatJobsAllScoreColumns_');

SpreadsheetApp.flush();

Logger.log('BEFORE buildJobsCockpit_');
safeRun_(() => buildJobsCockpit_(), 'SYSTEM: Cockpit');
Logger.log('AFTER buildJobsCockpit_');

Logger.log('BEFORE buildScoringCockpit_');
buildScoringCockpit_();
Logger.log('AFTER buildScoringCockpit_');

if (ENABLE_AUTO_ARCHIVE) {
  Logger.log('BEFORE archiveCandidatesAfterScan_');
  safeRun_(() => archiveCandidatesAfterScan_(), 'SYSTEM: Archive');
  Logger.log('AFTER archiveCandidatesAfterScan_');
}

Logger.log('BEFORE buildSourceHealthView_');
buildSourceHealthView_();
Logger.log('AFTER buildSourceHealthView_');

  //formatAllSheets();
}



function archiveCandidatesAfterScan_() {
  validateArchiveTarget_();
  return zzz_ADMIN_archiveCandidates_TO_EXTERNAL();
}


// *****************************************
// 6A. NEUE, KANONISCHE SCANNER-ARCHITEKTUR
// *****************************************

