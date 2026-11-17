/**
 * Resumable scanner pipeline — pilot includes Skyguide only.
 *
 * One daily start, one self-replacing watchdog, stable source+phase checkpoints.
 * Collection and import share an execution when there is time. Nothing in this
 * file installs the DAILY trigger; perform a manual pilot before cutover.
 *
 * Do NOT hold ScriptLock over a scanner/import: importStagedSourceToJobsAll()
 * already acquires ScriptLock. The short lock below guards state transitions,
 * while a 7-minute lease prevents parallel workflow executions.
 */
const SCANNER_PIPELINE_STATE_KEY_ = 'job_scanner_pipeline_v1';
const SCANNER_PIPELINE_LAST_KEY_ = 'job_scanner_pipeline_last_v1';
const SCANNER_PIPELINE_HANDLER_ = 'scannerPipelineWatchdog';
const SCANNER_PIPELINE_DELAY_MS_ = 10 * 60 * 1000;
const SCANNER_PIPELINE_BUDGET_MS_ = 240 * 1000;
const SCANNER_PIPELINE_LEASE_MS_ = 7 * 60 * 1000;
const SCANNER_PIPELINE_MAX_ATTEMPTS_ = 2; // First attempt + one retry per cycle/phase.

// Explicit registry; expand only AFTER validating the new per-source stage mode.
function scannerPipelineSources_() {
  return [{
    id: 'Skyguide',
    source: 'SKYGUIDE',
    sheet: 'Stage_Skyguide',
    collect: runId => scanSkyguideJobsToAll(runId, 'stage')
  }];
}

function scannerPipelineProperties_() {
  return PropertiesService.getScriptProperties();
}
function scannerPipelineLoad_() {
  return JSON.parse(scannerPipelineProperties_().getProperty(SCANNER_PIPELINE_STATE_KEY_) || 'null');
}
function scannerPipelineSave_(state) {
  scannerPipelineProperties_().setProperty(SCANNER_PIPELINE_STATE_KEY_, JSON.stringify(state));
}
function scannerPipelineDeleteWatchdogs_(keepId) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === SCANNER_PIPELINE_HANDLER_ &&
      String(t.getUniqueId()) !== String(keepId || ''))
    .forEach(t => ScriptApp.deleteTrigger(t));
}
function scannerPipelineArmWatchdog_(state) {
  // Create successor before deleting predecessor; no gap in recovery coverage.
  const trigger = ScriptApp.newTrigger(SCANNER_PIPELINE_HANDLER_)
    .timeBased().after(SCANNER_PIPELINE_DELAY_MS_).create();
  state.triggerId = String(trigger.getUniqueId());
  scannerPipelineSave_(state);
  scannerPipelineDeleteWatchdogs_(state.triggerId);
}
function scannerPipelineFinish_(state) {
  const finalStatus = state.failures.length ? 'PARTIAL' : 'SUCCESS';
  scannerPipelineProperties_().setProperty(SCANNER_PIPELINE_LAST_KEY_, JSON.stringify({
    cycleId: state.cycleId, finishedAt: new Date().toISOString(),
    status: finalStatus, failures: state.failures, sources: state.queue
  }));
  scannerPipelineDeleteWatchdogs_();
  scannerPipelineProperties_().deleteProperty(SCANNER_PIPELINE_STATE_KEY_);
  scannerPipelineHealthBestEffort_(state, finalStatus, JSON.stringify(state.failures));
  Logger.log('Scanner pipeline: ' + finalStatus + ' ' + JSON.stringify(state.failures));
}

/**
 * One daily trigger should eventually call this function. For the pilot,
 * run it manually; the existing production scanner is untouched.
 */
function runScannerPipeline() {
  return scannerPipelineExecute_(null, false);
}
/** Manual pilot: ignores 'next due' for Skyguide without changing frequency. */
function testScannerPipelineSkyguide() {
  return scannerPipelineExecute_(null, true);
}
/** Private one-shot watchdog; install no repeating watchdog trigger. */
function scannerPipelineWatchdog(e) {
  return scannerPipelineExecute_(e || {}, false);
}

function scannerPipelineExecute_(event, force) {
  const started = Date.now();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Scanner pipeline: controller state locked; watchdog remains armed');
    return;
  }
  let state;
  try {
    state = scannerPipelineLoad_();
    if (event && event.triggerUid &&
        (!state || String(state.triggerId) !== String(event.triggerUid))) return;
    if (state && state.busyUntil && Date.now() < state.busyUntil) {
      Logger.log('Scanner pipeline: another execution owns the active lease');
      return;
    }
    if (!state) {
      const due = scannerCockpitDueSources_(scannerPipelineSources_(), Boolean(force));
      if (!due.length) {
        Logger.log('Scanner pipeline: no sources due');
        return;
      }
      state = {
        cycleId: Utilities.getUuid(), queue: due.map(s => s.id), index: 0,
        phase: 'stage', attempts: 0, failures: [], runId: Utilities.getUuid(),
        stageCompleted: false, startedAt: new Date().toISOString()
      };
    }
    state.busyUntil = Date.now() + SCANNER_PIPELINE_LEASE_MS_;
    scannerPipelineSave_(state);
    scannerPipelineArmWatchdog_(state); // BEFORE doing any scanning/importing.
    scannerPipelineHealthBestEffort_(state, 'RUNNING', '');
  } finally {
    lock.releaseLock();
  }

  const registry = new Map(scannerPipelineSources_().map(s => [s.id, s]));
  try {
    while (state.index < state.queue.length) {
      const spec = registry.get(state.queue[state.index]);
      if (!spec) throw new Error('Unknown scanner in checkpoint: ' + state.queue[state.index]);
      if (Date.now() - started > SCANNER_PIPELINE_BUDGET_MS_) {
        Logger.log('Scanner pipeline: budget reached; watchdog will continue at ' + spec.id + ':' + state.phase);
        return;
      }
      // If an attempt hard-timed out, the counter has already been stored.
      if (state.attempts >= SCANNER_PIPELINE_MAX_ATTEMPTS_) {
        scannerPipelineFailStep_(state, spec, 'Previous attempt stopped without a completed checkpoint');
        continue;
      }
      state.attempts++;
      scannerPipelineSave_(state); // Persist ATTEMPT before potentially timing out.
      const t0 = Date.now();
      try {
        if (state.phase === 'stage') {
          const result = spec.collect(state.runId) || {};
          SpreadsheetApp.flush();
          scannerCockpitStepResult_(spec.id, 'stage', 'ok', Date.now() - t0, result, state.attempts, '');
          scannerPipelineLogStage_(spec, result, state.runId, Date.now() - t0);
          state.phase = 'import';
          state.attempts = 0;
          state.stageCompleted = true;
        } else if (state.phase === 'import') {
          if (!state.stageCompleted) throw new Error('Import blocked: no successful staging checkpoint');
          const stats = importStagedSourceToJobsAll(spec.sheet, spec.source);
          SpreadsheetApp.flush();
          scannerCockpitStepResult_(spec.id, 'import', 'ok', Date.now() - t0, stats, state.attempts, '');
          state.index++;
          state.phase = 'stage';
          state.attempts = 0;
          state.stageCompleted = false;
        } else {
          throw new Error('Invalid checkpoint phase: ' + state.phase);
        }
        scannerPipelineSave_(state); // Completed phase checkpoint.
        scannerPipelineHealthBestEffort_(state, 'RUNNING', '');
      } catch (err) {
        const message = String(err && err.stack || err);
        Logger.log('Scanner pipeline failed ' + spec.id + ':' + state.phase + ': ' + message);
        // Log/status failure is best-effort; never let it suppress recovery.
        try { scannerCockpitStepResult_(spec.id, state.phase, 'error', Date.now() - t0, {}, state.attempts, message); }
        catch (healthErr) { Logger.log('Scanner cockpit update failed: ' + healthErr); }
        if (state.phase === 'stage') {
          try { scannerPipelineLogStage_(spec, { status:'error', message }, state.runId, Date.now() - t0); }
          catch (logErr) { Logger.log('Scan_Log update failed: ' + logErr); }
        }
        if (state.attempts >= SCANNER_PIPELINE_MAX_ATTEMPTS_) {
          scannerPipelineFailStep_(state, spec, message);
          continue;
        }
        // A retry happens on the already-armed watchdog, not immediately.
        scannerPipelineSave_(state);
        scannerPipelineHealthBestEffort_(state, 'RETRY_PENDING', message);
        return;
      }
    }
    scannerPipelineFinish_(state);
  } finally {
    // The watchdog will reclaim after a hard timeout; release active lease now.
    const current = scannerPipelineLoad_();
    if (current && current.cycleId === state.cycleId) {
      current.busyUntil = 0;
      scannerPipelineSave_(current);
    }
  }
}

function scannerPipelineFailStep_(state, spec, message) {
  const phase = state.phase;
  state.failures.push({source:spec.id, phase, message:String(message).slice(0, 500)});
  // A failed stage must NOT import the previous successful snapshot.
  state.index++;
  state.phase = 'stage';
  state.attempts = 0;
  state.stageCompleted = false;
  scannerPipelineSave_(state);
  scannerPipelineHealthBestEffort_(state, 'RUNNING', 'Skipped failed ' + spec.id + ':' + phase);
}

function scannerPipelineLogStage_(spec, result, runId, durationMs) {
  appendScanLogRow_(Object.assign({
    run_at:new Date(), run_id:runId, source:spec.id, mode:'stage',
    label_or_endpoint:spec.sheet, duration_ms:durationMs,
    status:result.status || 'ok', message:result.message || ''
  }, result, {source:spec.id, mode:'stage', duration_ms:durationMs}));
}
