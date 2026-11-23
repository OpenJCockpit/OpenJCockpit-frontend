import { mockWorkspace } from '../../../../libs/api/src/testing/mockWorkspace';
import { type Rec, db, findBy, gitCredentials, integrationConfigs, now, slug } from '../store';
import { del, get, patch, post, put, str, without } from './router';

// ── Workspace & pre-flight ───────────────────────────────────────────────
get('/api/workspaces/:id', () => mockWorkspace);
post('/api/agentic-workflows/preflight', () => ({ passed: true, errors: [] }));

// ── Projects ─────────────────────────────────────────────────────────────
const project = (id: string) => findBy(db.projects, 'id', id, 'Project');
const patchProject = (id: string, changes: Rec) =>
  Object.assign(project(id), changes, { updatedAt: now() });

get('/api/projects', () => db.projects.filter((p) => p.active === 1));
get('/api/projects/all', () => db.projects);
post('/api/projects', ({ body }) => {
  const base = slug(str(body.name));
  let id = base;
  for (let n = 2; db.projects.some((p) => p.id === id); n++) id = `${base}-${n}`;
  const created: Rec = {
    customerId: id,
    active: 1,
    newProject: 0,
    gitStatus: 'UNKNOWN',
    hasCredentials: false,
    ...body,
    id,
    createdAt: now(),
    updatedAt: now(),
  };
  db.projects.push(created);
  return created;
});
put('/api/projects/:id', ({ p, body }) => patchProject(p[0], body));
patch('/api/projects/:id/activate', ({ p }) => patchProject(p[0], { active: 1 }));
patch('/api/projects/:id/deactivate', ({ p }) => patchProject(p[0], { active: 0 }));
patch('/api/projects/:id/new-project', ({ p, body }) =>
  patchProject(p[0], { newProject: body.newProject }),
);

const gitStatus = (id: string) => {
  const { gitStatus: status, gitStatusCheckedAt, gitStatusMessage } = project(id);
  return { projectId: id, gitStatus: status, gitStatusCheckedAt, gitStatusMessage };
};
get('/api/projects/:id/git-status', ({ p }) => gitStatus(p[0]));
// Stateless check used by the project wizard. Hosts named `bad-*` fail, private-looking hosts warn.
post('/api/projects/git-check', ({ body }) => {
  const url = str(body.gitUrl);
  const host = /^[a-z+]+:\/\/([^/:]+)|@([^:]+):/i.exec(url);
  const name = host?.[1] ?? host?.[2] ?? '';
  const warnings = /^(localhost|127\.|10\.|192\.168\.)/.test(name) ? ['host_private'] : [];
  return name.startsWith('bad-')
    ? { gitStatus: 'NOT_ACCESSIBLE', message: 'Authentication failed', warnings }
    : { gitStatus: 'ACCESSIBLE', message: 'Reachable with credentials', warnings };
});
post('/api/projects/:id/git-check', ({ p }) => {
  patchProject(p[0], { gitStatus: 'ACCESSIBLE', gitStatusCheckedAt: now() });
  return gitStatus(p[0]);
});

const noCredentials: Rec = { credentialType: 'NONE', hasSecret: false };
get('/api/projects/:id/git-credentials', ({ p }) => gitCredentials.get(p[0]) ?? noCredentials);
post('/api/projects/:id/git-credentials', ({ p, body }) => {
  const stored = {
    credentialType: body.credentialType,
    username: body.username,
    githubApiUrl: body.githubApiUrl,
    hasSecret: Boolean(body.secret) || gitCredentials.get(p[0])?.hasSecret === true,
  };
  gitCredentials.set(p[0], stored);
  patchProject(p[0], { hasCredentials: body.credentialType !== 'NONE' });
  return {};
});
del('/api/projects/:id/git-credentials', ({ p }) => {
  gitCredentials.delete(p[0]);
  patchProject(p[0], { hasCredentials: false });
  return {};
});

// Per-project integration settings. Secrets are accepted but only reported as `hasAuthToken`.
const integrationDefaults = (kind: string, projectId: string): Rec =>
  kind === 'document-folder'
    ? {
        projectId,
        projectName: str(project(projectId).name, projectId),
        folderName: projectId,
        fileTriggerEnabled: false,
      }
    : { projectId, enabled: false, hasAuthToken: false };

for (const [kind, store] of Object.entries(integrationConfigs)) {
  get(
    `/api/projects/:id/${kind}-config`,
    ({ p }) => store.get(p[0]) ?? integrationDefaults(kind, p[0]),
  );
  post(`/api/projects/:id/${kind}-config`, ({ p, body }) => {
    const previous = store.get(p[0]);
    const saved: Rec = {
      ...integrationDefaults(kind, p[0]),
      ...without(body, 'authToken'),
      ...(kind === 'document-folder'
        ? {}
        : { hasAuthToken: Boolean(body.authToken) || previous?.hasAuthToken === true }),
    };
    store.set(p[0], saved);
    return saved;
  });
  del(`/api/projects/:id/${kind}-config`, ({ p }) => {
    store.delete(p[0]);
    return {};
  });
}
