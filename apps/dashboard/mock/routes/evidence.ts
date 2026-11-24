import {
  MOCK_LATEST_EVIDENCE_RUN_ID,
  mockEvidenceOutput,
  mockEvidenceRun,
  mockEvidenceRuns,
} from '../../../../libs/api/src/testing/mockEvidence';
import { notFound } from '../store';
import { get } from './router';

// ── Execution evidence ───────────────────────────────────────────────────
// shares the fixture runs. Unknown runs answer 404, like a run of another project.
const EMPTY_PROJECT = 'empty-evidence';
const hasRuns = (projectId: string) => projectId !== EMPTY_PROJECT;

get('/api/projects/:id/evidence/runs', ({ p, query }) => {
  const limit = Number(query.get('limit') ?? 20);
  const offset = Number(query.get('offset') ?? 0);
  return hasRuns(p[0])
    ? mockEvidenceRuns(Date.now(), { limit, offset })
    : { items: [], total: 0, limit, offset };
});

get('/api/projects/:id/evidence/latest', ({ p }) => {
  const run = hasRuns(p[0]) ? mockEvidenceRun(MOCK_LATEST_EVIDENCE_RUN_ID) : undefined;
  if (!run) throw notFound('Run');
  return run;
});

get('/api/projects/:id/evidence/runs/:runId/outputs/:agentKey', ({ p }) => {
  const output = hasRuns(p[0]) ? mockEvidenceOutput(p[1], p[2]) : undefined;
  if (!output) throw notFound('Output');
  return output;
});

get('/api/projects/:id/evidence/runs/:runId', ({ p }) => {
  const run = hasRuns(p[0]) ? mockEvidenceRun(p[1]) : undefined;
  if (!run) throw notFound('Run');
  return run;
});
