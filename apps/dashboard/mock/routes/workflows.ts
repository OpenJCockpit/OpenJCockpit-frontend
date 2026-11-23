import { type Rec, db, findBy, nextId, notFound, now, remove, slug, upsert } from '../store';
import { del, get, post, put, str, without } from './router';

// ── Workflows, groups, runs ──────────────────────────────────────────────
const workflow = (id: string) => findBy(db.workflows, 'id', id, 'Workflow');

get('/api/workflows', () => db.workflows);
get('/api/workflows/export', () => ({ groups: db.groups, workflows: db.workflows }));
post('/api/workflows/import', ({ body }) => {
  const groups = Array.isArray(body.groups) ? (body.groups as Rec[]) : [];
  const workflows = Array.isArray(body.workflows) ? (body.workflows as Rec[]) : [];
  for (const g of groups) upsert(db.groups, 'id', str(g.id), g);
  for (const w of workflows) upsert(db.workflows, 'id', str(w.id), w);
  return { groupsImported: groups.length, workflowsImported: workflows.length };
});
get('/api/workflows/:id', ({ p }) => workflow(p[0]));
post('/api/workflows', ({ body }) => {
  const created = { ...body, id: str(body.id) || `wf-${slug(str(body.name))}` };
  db.workflows.push(created);
  return created;
});
put('/api/workflows/:id', ({ p, body }) => {
  const updated = { ...workflow(p[0]), ...body, id: p[0] };
  return upsert(db.workflows, 'id', p[0], updated);
});
del('/api/workflows/:id', ({ p }) => {
  remove(db.workflows, 'id', p[0], 'Workflow');
  return {};
});

get('/api/workflow-groups', () => db.groups);
post('/api/workflow-groups', ({ body }) => {
  const created = { ...body, id: str(body.id) || `grp-${slug(str(body.name))}` };
  db.groups.push(created);
  return created;
});
put('/api/workflow-groups/:id', ({ p, body }) =>
  upsert(db.groups, 'id', p[0], { ...body, id: p[0] }),
);
del('/api/workflow-groups/:id', ({ p }) => {
  remove(db.groups, 'id', p[0], 'Workflow group');
  return {};
});

// A started run reads as RUNNING for a few seconds, then COMPLETED, so polling UIs see both.
const RUN_DURATION_MS = 5_000;
const EVENT_TITLES: Record<string, string> = { RUNNING: 'Started', COMPLETED: 'Finished' };
function runView(run: Rec): Rec {
  const startedAt = Date.parse(str(run.startedAt));
  const done = Date.now() - startedAt >= RUN_DURATION_MS;
  const agentIds = run.agentIds as string[];
  const status = done ? 'COMPLETED' : 'RUNNING';
  return {
    ...without(run, 'agentIds'),
    status,
    completedAt: done ? new Date(startedAt + RUN_DURATION_MS).toISOString() : null,
    events: (done ? agentIds : agentIds.slice(0, 1)).map((agentId) => ({
      timestamp: str(run.startedAt),
      agentId,
      title: EVENT_TITLES[status],
      status: done ? 'COMPLETED' : 'RUNNING',
      evidenceRef: '',
    })),
    generatedArtifacts: done ? ['report.md'] : [],
  };
}
const run = (id: string) => runView(findBy(db.runs, 'runId', id, 'Run'));

post('/api/workflows/:id/start', ({ p, body }) => {
  const wf = workflow(p[0]);
  const startedAt = now();
  const runId = nextId('run');
  const execution = wf.execution as Rec | undefined;
  db.runs.push({
    runId,
    workflowId: p[0],
    customerId: str(body.projectId, str(execution?.customerId, 'noordzee')),
    specFile: str(body.specFile),
    repositoryUrl: str(body.repositoryUrl),
    startedAt,
    startedBy: 'dev',
    failureSummary: null,
    agentIds: Array.isArray(wf.agentIds) && wf.agentIds.length > 0 ? wf.agentIds : ['agent'],
  });
  Object.assign(wf, { lastExecutionStatus: 'RUNNING', lastExecutionAt: startedAt });
  return {
    workflowId: p[0],
    executionId: runId,
    status: 'RUNNING',
    startedAt,
    message: 'Started (mock)',
  };
});
get('/api/workflows/:id/executions', ({ p, query }) => {
  const limit = Number(query.get('limit') ?? 20);
  const offset = Number(query.get('offset') ?? 0);
  const all = db.runs
    .filter((r) => r.workflowId === p[0])
    .map(runView)
    .reverse();
  return {
    items: all.slice(offset, offset + limit).map((r) => ({
      runId: r.runId,
      workflowId: r.workflowId,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      durationMillis: r.completedAt === null ? null : RUN_DURATION_MS,
      startedBy: r.startedBy,
    })),
    limit,
    offset,
    total: all.length,
    hasMore: offset + limit < all.length,
  };
});
get('/api/workflows/:id/executions/:run', ({ p }) => run(p[1]));
get('/api/agent-runs/:id', ({ p }) => run(p[0]));
del('/api/agent-runs/:id', ({ p }) => {
  remove(db.runs, 'runId', p[0], 'Run');
  return {};
});
get('/api/agent-runs/:id/approval-gate', () => {
  throw notFound('Approval gate');
});
get('/api/agent-runs/:id/approval-decisions', () => []);
post('/api/agent-runs/:id/approval-gate/decision', ({ p }) => ({
  runId: p[0],
  status: 'RUNNING',
  iteration: 1,
  message: 'Decision recorded (mock)',
}));
get('/api/workflows/:id/decision-logs', () => []);
get('/api/workflow-executions/:id/decision-logs', () => []);
