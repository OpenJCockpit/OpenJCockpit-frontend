import {
  type Rec,
  db,
  findBy,
  nextId,
  now,
  queueOf,
  remove,
  slug,
  specsOf,
  upsert,
} from '../store';
import { del, get, patch, post, put, str } from './router';

// ── Spec files ───────────────────────────────────────────────────────────
const specResult = (projectId: string, fileName: string, message: string) => ({
  projectId,
  branch: `spec/${slug(fileName)}`,
  baseBranch: 'main',
  commitHash: 'a1b2c3d',
  fileName,
  message,
});
get('/api/projects/:id/spec-files', ({ p }) => specsOf(p[0]));
put('/api/projects/:id/spec-files', ({ p, body }) => {
  const fileName = str(body.fileName);
  const id = slug(fileName);
  const previous = specsOf(p[0]).find((s) => s.id === id);
  upsert(specsOf(p[0]), 'id', id, {
    ...previous,
    id,
    fileName,
    owner: str(previous?.owner, 'dev'),
    lastChanged: now(),
    status: str(previous?.status, 'open'),
    content: body.content,
  });
  return specResult(p[0], fileName, 'Saved (mock)');
});
get('/api/projects/:id/spec-init/status', () => ({ pending: false, templateExists: true }));
post('/api/projects/:id/spec-init', ({ p }) =>
  specResult(p[0], 'template.spec.md', 'Spec folder initialised (mock)'),
);

// ── Spec queue ───────────────────────────────────────────────────────────
const FINISHED = ['MERGED', 'COMPLETED_NO_CHANGES', 'SKIPPED'];
const withPositions = (items: Rec[]) => {
  let position = 0;
  for (const item of items) item.position = item.status === 'QUEUED' ? ++position : null;
};
const queueItem = (projectId: string, itemId: string) =>
  findBy(queueOf(projectId).items, 'id', itemId, 'Queue item');
const queueView = (projectId: string) => {
  const queue = queueOf(projectId);
  withPositions(queue.items);
  return {
    projectId,
    state: queue.state,
    autoMergeAllowed: queue.autoMergeAllowed,
    items: queue.items.filter((i) => !FINISHED.includes(str(i.status))),
    recentlyFinished: queue.items.filter((i) => FINISHED.includes(str(i.status))),
    lastPolledAt: null,
    runner: { enabled: true, configured: true },
  };
};
const workflowName = (workflowId: string) =>
  str(db.workflows.find((w) => w.id === workflowId)?.name) || null;

get('/api/projects/:id/spec-queue', ({ p }) => queueView(p[0]));
get('/api/projects/:id/spec-queue/settings', ({ p }) => ({
  autoMergeAllowed: queueOf(p[0]).autoMergeAllowed,
}));
put('/api/projects/:id/spec-queue/settings', ({ p, body }) => {
  queueOf(p[0]).autoMergeAllowed = body.autoMergeAllowed === true;
  return { autoMergeAllowed: queueOf(p[0]).autoMergeAllowed, updatedAt: now() };
});
post('/api/projects/:id/spec-queue/items', ({ p, body }) => {
  const item: Rec = {
    id: nextId('qi'),
    projectId: p[0],
    specFile: body.specFile,
    workflowId: body.workflowId,
    workflowName: workflowName(str(body.workflowId)),
    autoMerge: body.autoMerge === true,
    position: null,
    status: 'QUEUED',
    pullRequestUrls: [],
    createdBy: 'dev',
    createdAt: now(),
  };
  queueOf(p[0]).items.push(item);
  withPositions(queueOf(p[0]).items);
  return item;
});
patch('/api/projects/:id/spec-queue/items/:item', ({ p, body }) => {
  const item = queueItem(p[0], p[1]);
  if (body.workflowId !== undefined) {
    item.workflowId = body.workflowId;
    item.workflowName = workflowName(str(body.workflowId));
  }
  if (body.autoMerge !== undefined) item.autoMerge = body.autoMerge;
  return item;
});
del('/api/projects/:id/spec-queue/items/:item', ({ p }) => {
  const item = queueItem(p[0], p[1]);
  remove(queueOf(p[0]).items, 'id', p[1], 'Queue item');
  return item;
});
post('/api/projects/:id/spec-queue/items/:item/retry', ({ p }) => {
  const item = queueItem(p[0], p[1]);
  delete item.failureReason;
  item.status = 'QUEUED';
  return item;
});
post('/api/projects/:id/spec-queue/items/:item/skip', ({ p }) =>
  Object.assign(queueItem(p[0], p[1]), { status: 'SKIPPED', finishedAt: now() }),
);
put('/api/projects/:id/spec-queue/order', ({ p, body }) => {
  const ids = Array.isArray(body.itemIds) ? body.itemIds : [];
  const queue = queueOf(p[0]);
  const rank = (item: Rec) => {
    const index = ids.indexOf(item.id);
    return index === -1 ? ids.length : index;
  };
  queue.items.sort((a, b) => rank(a) - rank(b));
  return queueView(p[0]);
});
post('/api/projects/:id/spec-queue/pause', ({ p }) => {
  queueOf(p[0]).state = 'PAUSED';
  return queueView(p[0]);
});
post('/api/projects/:id/spec-queue/resume', ({ p }) => {
  queueOf(p[0]).state = 'ACTIVE';
  return queueView(p[0]);
});
