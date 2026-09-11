/**
 * Build the shared numeric fields of a scanner result.
 * Counts the scanner's input rows, including duplicates, as before; the
 * separately supplied upsert totals describe the actual storage operation.
 * Call after upsert, matching the existing scanner workflow.
 * Source metadata, fetch counters, status and messages stay with each scanner.
 */
function buildScanStats_(rows, upsertStats, idx) {
  const stats = {
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: 0,
    maybe_count: 0,
    ignore_count: 0
  };

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') stats.relevant_count++;
    else if (category === 'Vielleicht') stats.maybe_count++;
    else if (category === 'Ignorieren') stats.ignore_count++;
  });

  return stats;
}
