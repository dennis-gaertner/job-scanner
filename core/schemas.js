const JOBS_ALL_COLUMNS = [
  'unique_key',
  'source',
  'source_label',
  'raw_source_id',
  'url',
  'title',
  'employer',
  'location',
  'mail_date',
  'deadline',
  'percent_or_workload',
  'grade',
  'domain',
  'dg',
  'raw_snippet',
  'detail_text',
  'score',
  'score_normalized',
  'category',
  'positive_hits',
  'negative_hits',
  'hard_reject_hit',
  'hard_reject_hits',
  'first_seen_at',
  'last_seen_at',
  'notified_at',
  'run_id',
  'archived_at',
  'archive_reason'
];

const JOBS_ALL_LEGACY_COLUMNS = [
  'new_flag',
  'quick_flag',
  'final_score',
  'final_category',
  'application_status',
  'status',
  'manual_category_override',
  'manual_score_delta',
  'learn_from_feedback',
  'notes',
  'feedback_learned_at',
  'feedback_learning_version'
];


const JOBS_COCKPIT_COLUMNS = [
  'new_flag',
  'quick_flag',
  'source',
  'location',
  'job_state',
  'display_title', // ← statt 'title'
  'employer',
  'seen_at',
  'job_age',
  'deadline',
  'days_to_deadline',
  'url',
  'score_normalized',
  'final_score',
  'category',
  'final_category',
  'positive_hits',
  'negative_hits',
  'hard_reject_hit',
  'hard_reject_hits',
  'application_status',
  'visibility_preference',
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'manual_title',
  'notes',
  'visibility_rank',
  'work_rank',
  'job_state_rank',
  'category_rank',
  'unique_key'
];


const JOBS_USER_COLUMNS = [
  'unique_key',
  'quick_flag',
  'application_status',
  'job_state',
  'visibility_preference',
  'status',              // ⚠️ deprecated
  'manual_title',
  'notes',
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'created_at',
  'updated_at'
];
// status:
// - DEPRECATED (legacy field from pre-split status model)
// - DO NOT USE for new logic
// - replaced by:
//     - application_status
//     - job_state
//     - visibility_preference
// - kept only for backward compatibility / migration

const NOTIFIED_COLUMNS = [
'unique_key',
'notified_at',
'category',
'score',
'title',
'employer',
'location',
'url',
'source',
];


const SCAN_LOG_COLUMNS = [
  'run_at',
  'run_id',
  'source',
  'mode',
  'label_or_endpoint',
  'mail_threads',
  'mail_messages',
  'items_seen',
  'jobs_parsed',
  'rows_input_to_upsert',
  'jobs_upserted',
  'new_jobs',
  'updated_jobs',
  'relevant_count',
  'maybe_count',
  'ignore_count',
  'detail_fetch_attempted',
  'detail_fetch_count',
  'duration_ms',
  'status',
  'message',
];

const SCORING_COCKPIT_COLUMNS = [
  'source',
  'location',
  'title',
  'employer',
  'url',

  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'notes',

  'category',
  'score',
  'score_normalized',
  'positive',
  'negative',

  'hard_reject_hit',
  'hard_reject_hits',

  'deadline',
  'mail_date',
  'grade',
  'percent_or_workload',
  'domain',
  'dg',
  'source_label',

  'unique_key'
];

const SCORING_COCKPIT_EDITABLE_COLUMNS = [
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'notes'
];


