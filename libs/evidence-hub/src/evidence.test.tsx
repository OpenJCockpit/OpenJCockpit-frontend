import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type { EvidenceRun, EvidenceTimelineEvent, Project, Workspace } from '@openjcockpit/api';
import { createI18n, I18nProvider } from '@openjcockpit/i18n';
import { isAppDefinition } from '@openjcockpit/hub-contract';
import {
  FakeHubProjectProvider,
  FakeHubSession,
  FakeHubSessionProvider,
} from '@openjcockpit/hub-contract/testing';
import { evidenceApp } from './index';

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadWorkspace: vi.fn(),
  loadLatestEvidenceRun: vi.fn(),
}));

const PROJECT = { id: 'p1', name: 'Demo', customerId: 'c1' } as Project;
const WORKSPACE = {
  evidenceEvents: [
    { time: '13:16', title: 'Spec loaded', actor: 'Requirement Agent', status: 'ok' },
    { time: '13:22', title: 'Human approval logged', actor: 'Review Agent', status: 'ok' },
    { time: '13:30', title: 'Custom step', actor: 'Custom Agent', status: 'ok' },
  ],
  qualityControls: [
    { name: 'Unit test coverage', status: 'Compliant', statusText: '92%' },
    { name: 'Custom gate', status: 'Compliant', statusText: '' },
  ],
} as unknown as Workspace;

const event = (n: number, extra: Partial<EvidenceTimelineEvent> = {}): EvidenceTimelineEvent => ({
  timestamp: `2026-11-24T10:0${n}:00Z`,
  source: 'agent',
  agentId: 'review',
  title: `Step ${n}`,
  status: 'ok',
  ...extra,
});
const RUN = {
  details: { runId: 'r1', status: 'COMPLETED', artifacts: [] },
  events: [1, 2, 3, 4, 5, 6, 7].map((n) => event(n)),
} as EvidenceRun;

function renderWith(
  ui: React.ReactNode,
  project: Project | null = PROJECT,
  locale: 'en' | 'nl' = 'en',
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const i18n = createI18n({ locale, resources: {} });
  return render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <FakeHubSessionProvider session={new FakeHubSession()}>
          <FakeHubProjectProvider selected={project}>{ui}</FakeHubProjectProvider>
        </FakeHubSessionProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

async function widget() {
  return (await evidenceApp.widgets![0]!.component()).default;
}

describe('evidenceApp', () => {
  it('is a valid app definition with one widget linking to its page', () => {
    expect(isAppDefinition(evidenceApp)).toBe(true);
    expect(evidenceApp).toMatchObject({
      id: 'evidence',
      route: '/evidence',
      requiredPermissions: [],
    });
    expect(evidenceApp.widgets).toHaveLength(1);
    expect(evidenceApp.widgets![0]!.link).toBe('/evidence');
  });

  it('shows the 5 newest events of the latest run in the widget', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValue(RUN);
    const Widget = await widget();
    renderWith(<Widget />);
    expect(await screen.findByText('Step 7')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.queryByText('Step 2')).not.toBeInTheDocument();
    expect(api.loadLatestEvidenceRun).toHaveBeenCalledWith('p1', expect.anything());
  });

  it('shows approvers and agents, and flags a failed event', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValue({
      ...RUN,
      events: [
        event(1, { source: 'approval', actor: 'Maria', agentId: null, title: 'Approved' }),
        event(2, { source: 'git', agentId: null, title: 'Pushed' }),
        event(3, { title: 'Broke', status: 'failed' }),
      ],
    });
    const Widget = await widget();
    renderWith(<Widget />);
    expect(await screen.findByText('By: Maria')).toBeInTheDocument();
    expect(screen.getByText('By: review')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Failed' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Done' })).toHaveLength(2);
  });

  it('shows an empty state when the project has no run', async () => {
    const Widget = await widget();
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValueOnce(null);
    const first = renderWith(<Widget />);
    expect(await screen.findByTestId('evidence-widget-empty')).toBeInTheDocument();
    first.unmount();
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValueOnce({ ...RUN, events: [] });
    renderWith(<Widget />);
    expect(await screen.findByTestId('evidence-widget-empty')).toBeInTheDocument();
  });

  it('shows a hint without a project and loads nothing', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockClear();
    const Widget = await widget();
    renderWith(<Widget />, null);
    expect(await screen.findByTestId('evidence-widget-no-project')).toBeInTheDocument();
    expect(api.loadLatestEvidenceRun).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the latest run fails to load', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockRejectedValue(new Error('boom'));
    const Widget = await widget();
    renderWith(<Widget />);
    expect(await screen.findByText('Failed to load the data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a loading state before the latest run arrives', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockReturnValue(new Promise(() => {}));
    const Widget = await widget();
    renderWith(<Widget />);
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
  });

  it('mounts its page route with the full list', async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue(WORKSPACE);
    const routes = await evidenceApp.loadRoutes();
    renderWith(<RouterProvider router={createMemoryRouter(routes)} />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Spec loaded')).toBeInTheDocument();
  });

  it('shows the page error state and its loading state', async () => {
    vi.mocked(api.loadWorkspace).mockRejectedValue(new Error('boom'));
    const routes = await evidenceApp.loadRoutes();
    renderWith(<RouterProvider router={createMemoryRouter(routes)} />);
    expect(await screen.findByText('Failed to load the data.')).toBeInTheDocument();
  });

  it('retries the widget load', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValue(RUN);
    const Widget = await widget();
    renderWith(<Widget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Step 7')).toBeInTheDocument();
  });

  it('queries the page workspace by customer id, falling back to the project id', async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue(WORKSPACE);
    const routes = await evidenceApp.loadRoutes();
    renderWith(<RouterProvider router={createMemoryRouter(routes)} />, {
      id: 'p2',
      name: 'Solo',
    } as Project);
    await screen.findByText('Spec loaded');
    expect(api.loadWorkspace).toHaveBeenLastCalledWith('p2', expect.anything());
  });

  it('sends the page to the project list without a project and loads nothing', async () => {
    vi.mocked(api.loadWorkspace).mockClear();
    const routes = [
      { path: '/projects', element: <p>projects</p> },
      { path: '/evidence', children: await evidenceApp.loadRoutes() },
    ];
    renderWith(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/evidence'] })} />,
      null,
    );
    expect(await screen.findByText('projects')).toBeInTheDocument();
    expect(api.loadWorkspace).not.toHaveBeenCalled();
  });

  it('retries the page load and shows its loading state', async () => {
    vi.mocked(api.loadWorkspace).mockReturnValueOnce(new Promise(() => {}));
    const routes = await evidenceApp.loadRoutes();
    const { unmount } = renderWith(<RouterProvider router={createMemoryRouter(routes)} />);
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    unmount();
    vi.mocked(api.loadWorkspace).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(api.loadWorkspace).mockResolvedValue(WORKSPACE);
    renderWith(<RouterProvider router={createMemoryRouter(routes)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Spec loaded')).toBeInTheDocument();
  });

  it('goes back to the dashboard from the default header', async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue(WORKSPACE);
    const routes = [
      { path: '/home', element: <p>dashboard</p> },
      { path: '/evidence', children: await evidenceApp.loadRoutes() },
    ];
    renderWith(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/evidence'] })} />,
    );
    fireEvent.click(await screen.findByTitle('Back to dashboard'));
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  // The lazy locale chunk is transformed on first import, which is slow on a cold CI runner.
  // The test timeout must exceed the inner findBy timeout, or the test dies before the wait does.
  it('loads a non-English translation lazily', { timeout: 20_000 }, async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue(WORKSPACE);
    const routes = await evidenceApp.loadRoutes();
    renderWith(<RouterProvider router={createMemoryRouter(routes)} />, PROJECT, 'nl');
    expect(
      await screen.findByText(/Uitvoeringsbewijs/, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
  });
});
