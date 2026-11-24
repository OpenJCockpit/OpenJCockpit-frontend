export const EVIDENCE_ROUTE = '/evidence';

export const evidenceRunPath = (runId: string) => `${EVIDENCE_ROUTE}/${encodeURIComponent(runId)}`;
