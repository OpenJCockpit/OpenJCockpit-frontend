import { createElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type {
  ControlTowerGraph,
  ControlTowerInterview,
  ControlTowerProject,
  ControlTowerQueueCandidate,
  ControlTowerSpec,
  ControlTowerTemplate,
  Project,
} from '@openjcockpit/api';
import { createI18n, I18nProvider } from '@openjcockpit/i18n';
import {
  FakeHubProjectProvider,
  FakeHubSession,
  FakeHubSessionProvider,
} from '@openjcockpit/hub-contract/testing';

/** A page that only says where the user landed. */
const marker = (text: string) => createElement('p', null, text);

export const COCKPIT_PROJECT = { id: 'cp1', name: 'Demo', customerId: 'c1' } as Project;

export const REPOSITORY: ControlTowerProject = {
  id: 'r1',
  name: 'demo-repo',
  gitUrl: 'https://github.com/org/demo.git',
  defaultBranch: 'main',
  credentialType: 'HTTPS_TOKEN',
  gitUsername: null,
  hasSecret: true,
  cockpitProjectId: 'cp1',
  workflowId: 'wf1',
};

export const SPEC_DRAFT: ControlTowerSpec = {
  id: 's1',
  projectId: 'r1',
  title: 'Login page',
  slug: 'login',
  status: 'DRAFT',
  body: '# Login',
  dependsOn: [],
  specPath: 'login.md',
  branch: null,
  interviewId: 'i1',
};

export const SPEC_DISPATCHED: ControlTowerSpec = {
  ...SPEC_DRAFT,
  id: 's2',
  title: 'Logout',
  status: 'DISPATCHED',
  dependsOn: ['s1'],
  branch: 'spec/s2',
};

export const GRAPH: ControlTowerGraph = {
  nodes: [
    { id: 's1', title: 'Login page', status: 'DONE', dependsOn: [], ready: false },
    {
      id: 's2',
      title: 'A very long specification title that is clipped',
      status: 'APPROVED',
      dependsOn: ['s1'],
      ready: true,
    },
  ],
  topologicalOrder: ['s1', 's2'],
};

export const QUEUE: ControlTowerQueueCandidate[] = [
  { specId: 's2', title: 'Logout', path: 'specs/logout.md', priority: 1, reason: 'deps done' },
];

export const TEMPLATE: ControlTowerTemplate = {
  id: 't1',
  name: 'Standard project',
  kind: 'PROJECT',
  questions: [],
  builtIn: false,
};

export const FEATURE_TEMPLATE: ControlTowerTemplate = {
  ...TEMPLATE,
  id: 't2',
  name: 'Feature',
  kind: 'FEATURE',
};

export const INTERVIEW: ControlTowerInterview = {
  id: 'i1',
  projectId: 'r1',
  templateId: 't1',
  kind: 'PROJECT',
  title: 'Kick-off',
  status: 'ACTIVE',
  answers: [],
  questionIndex: 0,
  followUps: 0,
  currentQuestion: 'What is the goal?',
};

export const OPERATOR = ['openjcockpit-operator'];
export const ADMIN = ['openjcockpit-admin'];

type ControlTowerRequests = {
  [
    Name in keyof typeof api as Name extends `${string}ControlTower${string}` ? Name : never
  ]: ReturnType<typeof vi.fn>;
};

/** The mocked ControlTower requests of `@openjcockpit/api`. */
export const ct = api as unknown as ControlTowerRequests & Record<string, ReturnType<typeof vi.fn>>;

/** Default answers of a signed-in operator on a project with a repository. */
export function stubApi() {
  for (const fn of Object.values(ct)) if (vi.isMockFunction(fn)) fn.mockReset();
  ct.getControlTowerProjectByCockpitProject.mockResolvedValue(REPOSITORY);
  ct.listControlTowerInterviews.mockResolvedValue([INTERVIEW]);
  // The detail screen loads one interview; serve it from whatever the list mock currently holds.
  vi.mocked(api.getControlTowerInterview).mockImplementation((interviewId: string) =>
    api.listControlTowerInterviews('r1').then((rows) => {
      const found = rows.find((i) => i.id === interviewId);
      if (!found) throw new Error(`no interview ${interviewId}`);
      return found;
    }),
  );
  ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DISPATCHED]);
  ct.getControlTowerGraph.mockResolvedValue(GRAPH);
  ct.getControlTowerQueueProposal.mockResolvedValue(QUEUE);
  ct.listControlTowerTemplates.mockResolvedValue([TEMPLATE, FEATURE_TEMPLATE]);
  ct.listControlTowerSpecTemplates.mockResolvedValue([
    { id: 'st1', name: 'Default', content: '#', defaultTemplate: true },
    { id: 'st2', name: 'Mine', content: '#', defaultTemplate: false },
  ]);
}

interface Options {
  path?: string;
  permissions?: string[];
  project?: Project | null;
  locale?: 'en' | 'nl';
}

/** Renders `ui` (or the given routes) with the host contexts a remote runs in. */
export function renderWith(ui: ReactNode, options: Options = {}) {
  const { permissions = OPERATOR, project = COCKPIT_PROJECT, locale = 'en' } = options;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const i18n = createI18n({ locale, resources: {} });
  return render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <FakeHubSessionProvider session={new FakeHubSession(permissions)}>
          <FakeHubProjectProvider selected={project}>{ui}</FakeHubProjectProvider>
        </FakeHubSessionProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

/** Renders the app routes at `path`, with a marker page where the host would send the user. */
export function renderRoutes(routes: RouteObject[], options: Options = {}) {
  const router = createMemoryRouter(
    [
      { path: '/controltower', children: routes },
      { path: '/projects', element: marker('project selection') },
      { path: '/project-settings/*', element: marker('project settings') },
      { path: '/spec-queue', element: marker('spec queue') },
      { path: '/home', element: marker('dashboard') },
    ],
    { initialEntries: [options.path ?? '/controltower'] },
  );
  return { router, ...renderWith(<RouterProvider router={router} />, options) };
}
