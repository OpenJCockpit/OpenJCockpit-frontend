import type { EvidenceRunSummary } from '@openjcockpit/api';

/** Runs whose workflow, id, status, starter or branch contains every word of the query (case-insensitive). */
export function filterRuns(runs: EvidenceRunSummary[], query: string): EvidenceRunSummary[] {
  const words = query.toLowerCase().split(' ').filter(Boolean);
  if (words.length === 0) return runs;
  return runs.filter((run) => {
    const haystack = [run.workflowId, run.runId, run.status, run.startedBy, run.branch]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
