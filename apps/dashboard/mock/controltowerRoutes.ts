import { type Rec, MockError, findBy, nextId, upsert } from './store';

// Mock of the ControlTower backend, served under /controltower-api (the prefix the dashboard proxies to the
// ControlTower service). State lives as long as the dev server, like the rest of the mock API.
const PREFIX = '/controltower-api';

// Same shape as Ctx and Route in routes.ts, declared here so this file stays type-checkable on its own.
interface Ctx {
  p: string[];
  query: URLSearchParams;
  body: Rec;
}
export type Route = [method: string, pattern: RegExp, handler: (ctx: Ctx) => unknown];

export const controltowerRoutes: Route[] = [];
const add = (method: string, path: string, handler: Route[2]) => {
  const pattern = new RegExp(`^${PREFIX}${path.replace(/:\w+/g, '([^/]+)')}$`);
  controltowerRoutes.push([method, pattern, handler]);
};

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const id0 = (p: string[]) => p[0] ?? '';

const repositories: Rec[] = [];
const templates: Rec[] = [
  {
    id: 'tpl-project',
    name: 'New project',
    kind: 'PROJECT',
    questions: [
      {
        id: 'goal',
        text: 'What problem does this product solve?',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'States the problem and the audience.',
      },
    ],
  },
];
const specTemplates: Rec[] = [
  { id: 'spec-default', name: 'Default', content: '# {{title}}\n', defaultTemplate: true },
];
const interviews: Rec[] = [];
const specs: Rec[] = [];
let policy: Rec = {
  enabled: false,
  url: 'http://localhost:8181',
  decisionPath: '/v1/data/controltower/allow',
  failOpen: false,
};

const byProject = (list: Rec[], projectId: string) => list.filter((e) => e.projectId === projectId);
const interview = (id: string) => findBy(interviews, 'id', id, 'Interview');
const spec = (id: string) => findBy(specs, 'id', id, 'Spec');

add('GET', '/projects', ({ query }) => {
  const cockpitProjectId = query.get('cockpitProjectId');
  if (!cockpitProjectId) {
    return repositories;
  }
  // Every project gets a linked mock repository on first lookup, so the ControlTower pages are usable without
  // going through the connect form.
  if (!repositories.some((r) => r.cockpitProjectId === cockpitProjectId)) {
    repositories.push(
      toRepository(nextId('ct-repo'), {
        name: `${cockpitProjectId}-repo`,
        gitUrl: `https://git.example.com/mock/${cockpitProjectId}.git`,
        cockpitProjectId,
      }),
    );
  }
  return repositories.filter((r) => r.cockpitProjectId === cockpitProjectId);
});
add('POST', '/projects/connection-check', () => ({
  reachable: true,
  outcome: 'OK',
  message: 'Repository reachable.',
}));
const toRepository = (id: string, body: Rec): Rec => ({
  id,
  name: str(body.name),
  gitUrl: str(body.gitUrl) || null,
  defaultBranch: str(body.defaultBranch, 'main'),
  credentialType: str(body.credentialType, 'NONE'),
  gitUsername: str(body.gitUsername) || null,
  hasSecret: str(body.secret) !== '',
  cockpitProjectId: str(body.cockpitProjectId),
  workflowId: str(body.workflowId),
});
add('POST', '/projects', ({ body }) => {
  if (repositories.some((r) => r.cockpitProjectId === body.cockpitProjectId)) {
    throw new MockError(409, 'CONFLICT', 'A repository is already linked to this project');
  }
  const created = toRepository(nextId('ct-repo'), body);
  repositories.push(created);
  return created;
});
add('PUT', '/projects/:id', ({ p, body }) => {
  findBy(repositories, 'id', id0(p), 'Repository');
  return upsert(repositories, 'id', id0(p), toRepository(id0(p), body));
});

add('GET', '/templates', () => templates);
add('POST', '/templates', ({ body }) => {
  const created = { ...body, id: nextId('tpl') };
  templates.push(created);
  return created;
});
add('GET', '/spec-templates', () => specTemplates);
add('POST', '/spec-templates', ({ body }) => {
  const created = { ...body, id: nextId('spec-tpl'), defaultTemplate: false };
  specTemplates.push(created);
  return created;
});

add('GET', '/projects/:id/interviews', ({ p }) => byProject(interviews, id0(p)));
add('GET', '/interviews/:id', ({ p }) => interview(id0(p)));
add('POST', '/interviews', ({ body }) => {
  const template = findBy(templates, 'id', str(body.templateId), 'Template');
  const questions = template.questions as Rec[];
  const created: Rec = {
    id: nextId('ct-interview'),
    projectId: str(body.projectId),
    templateId: template.id,
    kind: template.kind,
    title: str(body.featureRequest, str(template.name)),
    status: 'ACTIVE',
    answers: [],
    questionIndex: 0,
    followUps: 0,
    currentQuestion: str(questions[0]?.text),
  };
  interviews.push(created);
  return created;
});
add('POST', '/interviews/:id/answers', ({ p, body }) => {
  const current = interview(id0(p));
  const template = findBy(templates, 'id', str(current.templateId), 'Template');
  const questions = template.questions as Rec[];
  const answers = current.answers as Rec[];
  const asked = questions[current.questionIndex as number];
  answers.push({ questionId: asked?.id, question: asked?.text, answer: str(body.answer) });
  const next = (current.questionIndex as number) + 1;
  current.questionIndex = next;
  current.currentQuestion = str(questions[next]?.text);
  if (next >= questions.length) current.status = 'COMPLETE';
  return current;
});
add('POST', '/interviews/:id/generate', ({ p }) => {
  const current = interview(id0(p));
  const created: Rec = {
    id: nextId('ct-spec'),
    projectId: current.projectId,
    title: str(current.title),
    slug: nextId('spec'),
    status: 'DRAFT',
    body: '# Generated specification\n',
    dependsOn: [],
    specPath: 'docs/specs/generated.md',
    branch: null,
  };
  specs.push(created);
  current.status = 'GENERATED';
  return [created];
});

add('GET', '/projects/:id/specs', ({ p }) => byProject(specs, id0(p)));
add('POST', '/specs/:id/approve', ({ p }) =>
  Object.assign(spec(id0(p)), { status: 'APPROVED', branch: `spec/${str(spec(id0(p)).slug)}` }),
);
add('POST', '/specs/:id/complete', ({ p }) => Object.assign(spec(id0(p)), { status: 'DONE' }));
add('GET', '/projects/:id/graph', ({ p }) => {
  const own = byProject(specs, id0(p));
  return {
    nodes: own.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      dependsOn: s.dependsOn,
      ready: s.status === 'APPROVED',
    })),
    topologicalOrder: own.map((s) => s.id),
  };
});
add('GET', '/projects/:id/queue/proposal', ({ p }) =>
  byProject(specs, id0(p))
    .filter((s) => s.status === 'APPROVED')
    .map((s, index) => ({
      specId: s.id,
      title: s.title,
      path: s.specPath,
      priority: index + 1,
      reason: 'All dependencies are done.',
    })),
);
add('POST', '/projects/:id/queue/dispatch', ({ p }) =>
  byProject(specs, id0(p))
    .filter((s) => s.status === 'APPROVED')
    .map((s) => {
      s.status = 'DISPATCHED';
      return { specId: s.id, result: 'DISPATCHED' };
    }),
);

add('GET', '/settings', () => ({ policy, editable: true }));
add('PUT', '/settings/policy', ({ body }) => {
  policy = { ...policy, ...body };
  return { policy, editable: true };
});
add('POST', '/settings/policy/test', () => ({
  reachable: true,
  message: 'Policy engine reachable.',
  policies: ['controltower/allow'],
}));
