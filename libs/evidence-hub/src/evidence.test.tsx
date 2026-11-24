import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { saveBlob } from './saveBlob';

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadEvidenceRuns: vi.fn(),
  loadEvidenceRun: vi.fn(),
  loadLatestEvidenceRun: vi.fn(),
  loadEvidenceOutput: vi.fn(),
  exportEvidenceRun: vi.fn(),
}));

vi.mock('./saveBlob', () => ({ saveBlob: vi.fn() }));

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

    it('lists the runs on the index route without loading any run', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockClear();
      await renderPage();
      expect(await screen.findByText('2 failed events')).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(2);
      expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/evidence/r1');
      expect(api.loadEvidenceRun).not.toHaveBeenCalled();
    });

    it('shows a run with summary and grouped timeline on its own route', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage(['/evidence/r1']);
      expect(await screen.findByText('r1 first')).toBeInTheDocument();
      expect(api.loadEvidenceRun).toHaveBeenCalledWith('p1', 'r1', expect.anything());
      expect(api.loadEvidenceRuns).not.toHaveBeenCalled();
      expect(screen.getByText('abc123')).toBeInTheDocument();
      expect(screen.getByText('feature/x')).toBeInTheDocument();
      expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
      // two agent events of one agent form a step, the git event another
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    });

    it('filters the listed runs by search text', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue({
        ...PAGE1,
        items: [summary('r1', { startedBy: 'Jan' }), summary('r2', { startedBy: 'Maria' })],
      });
      await renderPage();
      await screen.findByText(/Jan/);
      fireEvent.change(screen.getByTestId('evidence-run-search'), { target: { value: 'mar' } });
      expect(screen.queryByText(/Jan/)).not.toBeInTheDocument();
      expect(screen.getByText(/Maria/)).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('evidence-run-search'), { target: { value: 'zzz' } });
      expect(screen.getByText('No runs match your search.')).toBeInTheDocument();
    });

    it('opens a run from the list and returns to the list', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      await renderPage();
      fireEvent.click(await screen.findByText('2 failed events'));
      expect(await screen.findByText('r2 first')).toBeInTheDocument();
      expect(api.loadEvidenceRun).not.toHaveBeenCalledWith('p1', 'r1', expect.anything());
      fireEvent.click(screen.getByRole('button', { name: /All runs/ }));
      expect(await screen.findByText('2 failed events')).toBeInTheDocument();
    });

    it('loads more runs', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValueOnce(PAGE1);
      vi.mocked(api.loadEvidenceRuns).mockResolvedValueOnce({
        items: [summary('r3', { startedBy: 'Third' })],
        total: 3,
        limit: 2,
        offset: 2,
      });
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

    const DETAILED: EvidenceRun = {
      details: {
        ...runOf('r1').details,
        branch: 'feature/x',
        commitHash: 'abc123',
        artifacts: ['impact.md', 'fix.patch'],
        failureSummary: 'Implementation agent failed.',
      },
      events: [
        event(1, { title: 'Spec loaded', outputRef: 'requirement' }),
        event(2, { title: 'Broke', status: 'failed', detail: 'Three tests are red.' }),
        event(3, { source: 'approval', agentId: null, actor: 'Maria', title: 'Approved' }),
        event(4, { source: 'git', agentId: null, title: 'Pushed feature/x' }),
        event(5, { source: 'git', agentId: null, title: 'Cloned repository' }),
      ],
    };
    const withGit = { ...PROJECT, gitUrl: 'git@github.com:org/repo.git' } as Project;

    async function openDetailed() {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockResolvedValue(DETAILED);
      await renderPage(['/evidence/r1'], withGit);
      await screen.findByText('Spec loaded');
    }

    it('shows the failure summary and the generated artifacts', async () => {
      await openDetailed();
      expect(screen.getByRole('alert')).toHaveTextContent('Implementation agent failed.');
      expect(screen.getByText('impact.md')).toBeInTheDocument();
      expect(screen.getByText('fix.patch')).toBeInTheDocument();
    });

    it('filters by source, status and failed only', async () => {
      await openDetailed();
      fireEvent.click(screen.getByTestId('evidence-filter-source'));
      fireEvent.click(screen.getByRole('option', { name: 'Git' }));
      expect(screen.queryByText('Spec loaded')).not.toBeInTheDocument();
      expect(screen.getByText('Cloned repository')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('evidence-filter-source'));
      fireEvent.click(screen.getByRole('option', { name: 'All sources' }));
      fireEvent.click(screen.getByLabelText('Failed only'));
      expect(screen.getByText('Broke')).toBeInTheDocument();
      expect(screen.queryByText('Spec loaded')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('evidence-filter-source'));
      fireEvent.click(screen.getByRole('option', { name: 'Approval' }));
      expect(screen.getByText('No events match the filters.')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Failed only'));
      fireEvent.click(screen.getByTestId('evidence-filter-status'));
      fireEvent.click(screen.getByRole('option', { name: 'Done' }));
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('expands a row to its detail and loads the agent output only then', async () => {
      vi.mocked(api.loadEvidenceOutput).mockResolvedValue({
        agentKey: 'requirement',
        output: 'Full requirement output',
      });
      await openDetailed();
      expect(api.loadEvidenceOutput).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Spec loaded' }));
      expect(await screen.findByText('Full requirement output')).toBeInTheDocument();
      expect(api.loadEvidenceOutput).toHaveBeenCalledWith(
        'p1',
        'r1',
        'requirement',
        expect.anything(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Broke' }));
      expect(screen.getByText('Three tests are red.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Broke' }));
      expect(screen.queryByText('Three tests are red.')).not.toBeInTheDocument();
    });

    it('shows a retryable error when the agent output fails to load', async () => {
      vi.mocked(api.loadEvidenceOutput).mockRejectedValueOnce(new Error('boom'));
      vi.mocked(api.loadEvidenceOutput).mockResolvedValue({
        agentKey: 'requirement',
        output: 'ok now',
      });
      await openDetailed();
      fireEvent.click(screen.getByRole('button', { name: 'Spec loaded' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
      expect(await screen.findByText('ok now')).toBeInTheDocument();
    });

    it('links the commit, the branch and git events that name them', async () => {
      await openDetailed();
      expect(screen.getByRole('link', { name: 'abc123' })).toHaveAttribute(
        'href',
        'https://github.com/org/repo/commit/abc123',
      );
      expect(screen.getAllByRole('link', { name: 'feature/x' })[0]).toHaveAttribute(
        'href',
        'https://github.com/org/repo/tree/feature/x',
      );
      expect(screen.getByRole('link', { name: 'Pushed feature/x' })).toHaveAttribute(
        'href',
        'https://github.com/org/repo/tree/feature/x',
      );
      expect(screen.queryByRole('link', { name: 'Cloned repository' })).not.toBeInTheDocument();
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
      await renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
      expect(await screen.findByText('2 failed events')).toBeInTheDocument();
    });

    it('shows an error for a run that fails to load', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockRejectedValue(new Error('boom'));
      await renderPage(['/evidence/r1']);
      expect(await screen.findByText('Failed to load the data.')).toBeInTheDocument();
    });

    it('exports the whole run from the detail page and saves the file', async () => {
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      const blob = new Blob(['a,b']);
      vi.mocked(api.exportEvidenceRun).mockResolvedValue({ blob, filename: 'evidence-r1.csv' });
      await renderPage(['/evidence/r1']);
      fireEvent.click(await screen.findByRole('button', { name: 'Export this run' }));
      fireEvent.click(screen.getByText('CSV (timeline events)'));
      await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(blob, 'evidence-r1.csv'));
      expect(api.exportEvidenceRun).toHaveBeenCalledWith('p1', 'r1', {
        format: 'csv',
        includeOutputs: false,
      });
    });

    it('shows an export error and lets the user try again', async () => {
      vi.mocked(api.loadEvidenceRun).mockImplementation(async (_p, id) => runOf(id));
      vi.mocked(api.exportEvidenceRun).mockRejectedValueOnce(new Error('boom'));
      await renderPage(['/evidence/r1']);
      fireEvent.click(await screen.findByRole('button', { name: 'Export this run' }));
      fireEvent.click(screen.getByText('JSON (full data)'));
      expect(await screen.findByRole('alert')).toHaveTextContent('The export failed');
      expect(screen.getByRole('button', { name: 'Export this run' })).toBeEnabled();
    });

    it('shows a hint when a run has no events', async () => {
      vi.mocked(api.loadEvidenceRuns).mockResolvedValue(PAGE1);
      vi.mocked(api.loadEvidenceRun).mockResolvedValue({ ...runOf('r1'), events: [] });
      await renderPage(['/evidence/r1']);
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
