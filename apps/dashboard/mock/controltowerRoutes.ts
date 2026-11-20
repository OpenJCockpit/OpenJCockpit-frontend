import { type Rec, MockError, findBy, nextId, remove, upsert } from './store';

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
      {
        id: 'users',
        text: 'Who are the main users and what do they do today?',
        required: true,
        maxFollowUps: 2,
        completionCriteria: 'Names at least one user group and their current workaround.',
      },
      {
        id: 'scope',
        text: 'What must the first release include, and what is explicitly out of scope?',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'Lists must-haves and at least one exclusion.',
      },
      {
        id: 'constraints',
        text: 'Are there technical, legal or deadline constraints?',
        required: false,
        maxFollowUps: 0,
        completionCriteria: 'Lists constraints or states that there are none.',
      },
    ],
  },
  {
    id: 'tpl-feature',
    name: 'New feature',
    kind: 'FEATURE',
    questions: [
      {
        id: 'behaviour',
        text: 'Describe the behaviour the feature should have.',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'Describes the expected behaviour in observable terms.',
      },
      {
        id: 'acceptance',
        text: 'How will we know it works? List acceptance criteria.',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'At least two testable criteria.',
      },
      {
        id: 'impact',
        text: 'Which existing parts of the product are affected?',
        required: false,
        maxFollowUps: 0,
        completionCriteria: 'Names the affected areas.',
      },
    ],
  },
  {
    id: 'tpl-bugfix',
    name: 'Bug triage',
    kind: 'FEATURE',
    questions: [
      {
        id: 'steps',
        text: 'What are the steps to reproduce the problem?',
        required: true,
        maxFollowUps: 2,
        completionCriteria: 'Gives numbered, reproducible steps.',
      },
    ],
  },
];
const specTemplates: Rec[] = [
  { id: 'spec-default', name: 'Default', content: '# {{title}}\n', defaultTemplate: true },
  {
    id: 'spec-api',
    name: 'API endpoint',
    content: '# {{title}}\n\n## Request\n\n## Response\n\n## Errors\n',
    defaultTemplate: false,
  },
  {
    id: 'spec-ui',
    name: 'UI screen',
    content: '# {{title}}\n\n## Layout\n\n## States\n\n## Accessibility\n',
    defaultTemplate: false,
  },
];
const interviews: Rec[] = [];
const specs: Rec[] = [];
let policy: Rec = {
  enabled: false,
  url: 'http://localhost:8181',
  decisionPath: '/v1/data/controltower/allow',
  failOpen: false,
};

const SEED_ANSWERS: [string, string, string][] = [
  [
    'goal',
    'What problem does this product solve?',
    'Field technicians lose time on paper work orders.',
  ],
  [
    'users',
    'Who are the main users and what do they do today?',
    'Technicians and dispatchers; they use spreadsheets and phone calls.',
  ],
  [
    'scope',
    'What must the first release include, and what is explicitly out of scope?',
    'Work orders and offline sync. No invoicing.',
  ],
];

interface SeedSpec {
  key: string;
  title: string;
  status: string;
  dependsOn: string[];
  body: string;
}
const SEED_SPECS: SeedSpec[] = [
  {
    key: 'auth',
    title: 'User authentication',
    status: 'DONE',
    dependsOn: [],
    body: '# User authentication\n\nSign in with email and password, session tokens and logout.\n\n## Acceptance\n- Wrong password shows an error\n- Sessions expire after 8 hours\n',
  },
  {
    key: 'roles',
    title: 'Role-based access control',
    status: 'DONE',
    dependsOn: ['auth'],
    body: '# Role-based access control\n\nTechnician, dispatcher and admin roles.\n',
  },
  {
    key: 'workorders',
    title: 'Work order list and detail',
    status: 'DISPATCHED',
    dependsOn: ['auth'],
    body: '# Work order list and detail\n\nList, filter and open work orders.\n',
  },
  {
    key: 'offline',
    title: 'Offline sync',
    status: 'APPROVED',
    dependsOn: ['workorders'],
    body: '# Offline sync\n\nQueue edits locally and replay them when online.\n',
  },
  {
    key: 'attachments',
    title: 'Photo attachments',
    status: 'APPROVED',
    dependsOn: ['auth'],
    body: '# Photo attachments\n\nAttach up to 10 photos to a work order.\n',
  },
  {
    key: 'webhooks',
    title: 'Webhook notifications',
    status: 'APPROVED',
    dependsOn: ['roles'],
    body: '# Webhook notifications\n\nPost status changes to a configured URL.\n',
  },
  {
    key: 'reports',
    title: 'Weekly report export',
    status: 'DRAFT',
    dependsOn: ['workorders', 'roles'],
    body: '# Weekly report export\n\nCSV and PDF export per technician.\n',
  },
  {
    key: 'dashboard',
    title: 'Dispatcher dashboard',
    status: 'DRAFT',
    dependsOn: ['workorders', 'ghost-spec'],
    body: '# Dispatcher dashboard\n\nLive map and open work orders.\n',
  },
  {
    key: 'dark-mode',
    title: 'Dark mode',
    status: 'DRAFT',
    dependsOn: [],
    body: '# Dark mode\n\nFollow the system theme.\n',
  },
];

/** Fills a new mock repository with interviews and specs in every status, so every page has something to show. */
function seedRepository(projectId: string) {
  const ids = new Map<string, string>();
  const kickoffInterviewId = nextId('ct-interview');
  for (const seed of SEED_SPECS) ids.set(seed.key, nextId('ct-spec'));
  for (const seed of SEED_SPECS) {
    specs.push({
      id: ids.get(seed.key),
      projectId,
      title: seed.title,
      slug: seed.key,
      status: seed.status,
      body: seed.body,
      dependsOn: seed.dependsOn.map((d) => ids.get(d) ?? d),
      specPath: `docs/specs/${seed.key}.md`,
      branch: seed.status === 'DRAFT' ? null : `spec/${seed.key}`,
      interviewId: kickoffInterviewId,
    });
  }
  interviews.push(
    {
      id: kickoffInterviewId,
      projectId,
      templateId: 'tpl-project',
      kind: 'PROJECT',
      title: 'Field service app kick-off',
      status: 'GENERATED',
      answers: SEED_ANSWERS.map(([questionId, question, answer]) => ({
        questionId,
        question,
        answer,
      })),
      questionIndex: 4,
      followUps: 1,
      currentQuestion: '',
    },
    {
      id: nextId('ct-interview'),
      projectId,
      templateId: 'tpl-feature',
      kind: 'FEATURE',
      title: 'Photo attachments',
      status: 'COMPLETE',
      answers: [
        {
          questionId: 'behaviour',
          question: 'Describe the behaviour the feature should have.',
          answer: 'Technicians attach photos to a work order.',
        },
        {
          questionId: 'acceptance',
          question: 'How will we know it works? List acceptance criteria.',
          answer: 'Up to 10 photos; each under 5 MB.',
        },
      ],
      questionIndex: 3,
      followUps: 0,
      currentQuestion: '',
    },
    {
      id: nextId('ct-interview'),
      projectId,
      templateId: 'tpl-feature',
      kind: 'FEATURE',
      title: 'Customer signature on completion',
      status: 'ACTIVE',
      answers: [
        {
          questionId: 'behaviour',
          question: 'Describe the behaviour the feature should have.',
          answer: 'The customer signs on the technician device.',
        },
      ],
      questionIndex: 1,
      followUps: 0,
      currentQuestion: 'How will we know it works? List acceptance criteria.',
    },
  );
}

/** A spec is ready when it is approved and every dependency exists and is done. */
const isReady = (s: Rec, own: Rec[]) =>
  s.status === 'APPROVED' &&
  (s.dependsOn as string[]).every((d) => own.find((o) => o.id === d)?.status === 'DONE');

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
    const created = repositories[repositories.length - 1];
    seedRepository(str(created?.id));
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
add('PUT', '/templates/:id', ({ p, body }) => {
  const current = findBy(templates, 'id', id0(p), 'Template');
  if (current.builtIn)
    throw new MockError(409, 'BUILT_IN_TEMPLATE', 'Built-in templates cannot be changed');
  return upsert(templates, 'id', id0(p), { ...body, id: id0(p), builtIn: false });
});
add('DELETE', '/templates/:id', ({ p }) => {
  const current = findBy(templates, 'id', id0(p), 'Template');
  if (current.builtIn)
    throw new MockError(409, 'BUILT_IN_TEMPLATE', 'Built-in templates cannot be deleted');
  remove(templates, 'id', id0(p), 'Template');
  return null;
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
    interviewId: current.id,
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
      ready: isReady(s, own),
    })),
    topologicalOrder: own.map((s) => s.id),
  };
});
add('GET', '/projects/:id/queue/proposal', ({ p }) => {
  const own = byProject(specs, id0(p));
  return own
    .filter((s) => isReady(s, own))
    .map((s, index) => ({
      specId: s.id,
      title: s.title,
      path: s.specPath,
      priority: index + 1,
      reason: 'All dependencies are done.',
    }));
});
add('POST', '/projects/:id/queue/dispatch', ({ p }) => {
  const own = byProject(specs, id0(p));
  return own
    .filter((s) => isReady(s, own))
    .map((s) => {
      // The webhooks spec simulates an uncertain HTTP outcome: it is reported UNKNOWN and not marked dispatched.
      if (s.slug === 'webhooks') return { specId: s.id, result: 'UNKNOWN' };
      s.status = 'DISPATCHED';
      return { specId: s.id, result: 'DISPATCHED' };
    });
});

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
