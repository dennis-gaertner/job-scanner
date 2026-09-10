// core/job-model.js — extracted without changing function implementations.

function buildCanonicalJob_(fields) {
  return {
    source: fields.source || '',
    source_label: fields.source_label || '',
    raw_source_id: fields.raw_source_id || '',
    url: fields.url || '',

    title: fields.title || '',
    employer: fields.employer || '',
    location: fields.location || '',
    mail_date: fields.mail_date || '',
    deadline: fields.deadline || '',
    percent_or_workload: fields.percent_or_workload || '',
    grade: fields.grade || '',
    domain: fields.domain || '',
    dg: fields.dg || '',

    raw_snippet: fields.raw_snippet || '',
    detail_text: fields.detail_text || '',

    first_seen_at: fields.first_seen_at || '',
    last_seen_at: fields.last_seen_at || '',
    run_id: fields.run_id || ''
  };
}


// *****************************************
// 7. MAILQUELLEN
// *****************************************

// *****************************************
// OEBB
// *****************************************


