import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type {
  EvidenceRun,
  EvidenceRunPage,
  EvidenceTimelineEvent,
  Project,
} from '@openjcockpit/api';
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
  loadEvidenceRuns: vi.fn(),
  loadEvidenceRun: vi.fn(),
  loadLatestEvidenceRun: vi.fn(),
}));

const PROJECT = { id: 'p1', name: 'Demo', customerId: 'c1' } as Project;
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

  it('retries the widget load', async () => {
    vi.mocked(api.loadLatestEvidenceRun).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(api.loadLatestEvidenceRun).mockResolvedValue(RUN);
    const Widget = await widget();
    renderWith(<Widget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Step 7')).toBeInTheDocument();
  });

  describe('page', () => {
    const summary = (runId: string, extra = {}) => ({
      runId,
      workflowId: 'spec-to-pr',
      status: 'COMPLETED',
      startedAt: '2026-11-24T10:00:00Z',
      completedAt: '2026-11-24T10:30:00Z',
      startedBy: 'Jan',
      branch: 'feature/x',
      eventCount: 3,
      failedEventCount: 0,
      ...extra,
    });
    const PAGE1: EvidenceRunPage = {
      items: [summary('r1'), summary('r2', { status: 'FAILED', failedEventCount: 2 })],
      total: 3,
      limit: 2,
      offset: 0,
    };
    const runOf = (runId: string): EvidenceRun => ({
      details: {
        runId,
        workflowId: 'spec-to-pr',
        status: 'COMPLETED',
        startedBy: 'Jan',
        startedAt: '2026-11-24T10:00:00Z',
        completedAt: '2026-11-24T10:30:00Z',
        branch: 'feature/x',
        commitHash: 'abc123',
        artifacts: [],
      },
      events: [
        event(1, { title: `${runId} first` }),
        event(2, { title: `${runId} second` }),
        event(3, { source: 'git', agentId: null, title: `${runId} pushed` }),
      ],
    });

    async function renderPage(initialEntries = ['/evidence'], project: Project | null = PROJECT) {
      const routes = [
        { path: '/projects', element: <p>projects</p> },
        { path: '/home', element: <p>dashboard</p> },
        { path: '/evidence', children: await evidenceApp.loadRoutes() },
      ];
      return renderWith(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries })} />,
        project,
      );
    }

    it('shows the latest run by default with summary and grouped timeline', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      expect(await screen.findByText('r1 first')).toBeInTheDocument();
      expect(api.loadEvidenceRun).toHaveBeenCalledWith('p1', 'r1', expect.anything());
      expect(screen.getByText('abc123')).toBeInTheDocument();
      expect(screen.getByText('feature/x')).toBeInTheDocument();
      expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
      // two agent events of one agent form a step, the git event another
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    });

    it('selects a run from the list and keeps it in the URL', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      await screen.findByText('r1 first');
      fireEvent.click(screen.getByText('2 failed events'));
      expect(await screen.findByText('r2 first')).toBeInTheDocument();
    });

    it('opens the run named in ?run=', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage(['/evidence?run=r2']);
      expect(await screen.findByText('r2 first')).toBeInTheDocument();
      expect(api.loadEvidenceRun).not.toHaveBeenCalledWith('p1', 'r1', expect.anything());
    });

    it('loads more runs', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValueOnce(PAGE1);
      vi.mocked(api.loadEvidenceRuns).mockResolvedValueOnce({
        items: [summary('r3', { startedBy: 'Third' })],
        total: 3,
        limit: 2,
        offset: 2,
      });
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
      expect(await screen.findByText(/Third/)).toBeInTheDocument();
      expect(api.loadEvidenceRuns).toHaveBeenLastCalledWith(
        'p1',
        { limit: 20, offset: 2 },
        expect.anything(),
      );
      expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    });

    it('shows an empty state without runs', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      await renderPage();
      expect(await screen.findByText('No runs yet.')).toBeInTheDocument();
    });

    it('shows a retryable error when the run list fails, and a loading state', async () => {
      vi.mocked(api.loadEvidenceRuns).mockReturnValueOnce(new Promise(() => {}));
      const first = await renderPage();
      expect(await screen.findByText('Loading…')).toBeInTheDocument();
      first.unmount();
      vi.mocked(api.loadEvidenceRuns).mockRejectedValueOnce(new Error('boom'));
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
      expect(await screen.findByText('r1 first')).toBeInTheDocument();
    });

    it('shows an error for a run that fails to load', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockRejectedValue(new Error('boom'));
      await renderPage();
      expect(await screen.findByText('Failed to load the data.')).toBeInTheDocument();
    });

    it('shows a hint when a run has no events', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockResolvedValue({ ...runOf('r1'), events: [] });
      await renderPage();
      expect(await screen.findByText('No events recorded for this run.')).toBeInTheDocument();
    });

    it('sends the page to the project list without a project and loads nothing', async () => {
      vi.mocked(api.loadEvidenceRuns).mockClear();
      await renderPage(['/evidence'], null);
      expect(await screen.findByText('projects')).toBeInTheDocument();
      expect(api.loadEvidenceRuns).not.toHaveBeenCalled();
    });

    it('goes back to the dashboard from the default header', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      fireEvent.click(await screen.findByTitle('Back to dashboard'));
      expect(await screen.findByText('dashboard')).toBeInTheDocument();
    });

    // The lazy locale chunk is transformed on first import, which is slow on a cold CI runner.
    // The test timeout must exceed the inner findBy timeout, or the test dies before the wait does.
    it('loads a non-English translation lazily', { timeout: 20_000 }, async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      const routes = await evidenceApp.loadRoutes();
      renderWith(<RouterProvider router={createMemoryRouter(routes)} />, PROJECT, 'nl');
      expect(
        await screen.findByText(/Uitvoeringsbewijs/, undefined, { timeout: 15_000 }),
      ).toBeInTheDocument();
    });
  });
});
