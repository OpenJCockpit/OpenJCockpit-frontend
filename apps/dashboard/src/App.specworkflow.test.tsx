import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from './routes';
import { renderRoutedApp } from './testUtils/renderRoutedApp';
import { specsRemotes } from './testUtils/specsRemoteStubs';
import * as api from '@openjcockpit/api';
import { mockDashboardApis, PROJECT } from './testUtils/dashboardFixtures';
import { enterDashboard } from './testUtils/dom';
import { SPECS, PROJECT_WITH_GIT, renderDashboard } from './testUtils/specWorkflowFixtures';

vi.mock(
  '@openjcockpit/landing-hub',
  async () => (await import('./testUtils/landingHubStub')).landingHubStub,
);

vi.mock('@openjcockpit/auth', async () => ({
  ...(await vi.importActual<typeof import('@openjcockpit/auth')>('@openjcockpit/auth')),
  getKeycloak: () => ({
    init: () => Promise.resolve(true),
    token: 'fake-token',
    updateToken: () => Promise.resolve(false),
    login: vi.fn(),
  }),
}));

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadProjects: vi.fn(),
  loadWorkspace: vi.fn(),
  loadProjectSpecs: vi.fn(),
  initSpecFolder: vi.fn(),
  getSpecInitStatus: vi.fn(),
  checkWorkflowPreflight: vi.fn(),
  getAgentRun: vi.fn(),
  stopAgentRun: vi.fn(),
  listWorkflows: vi.fn(),
  listWorkflowGroups: vi.fn(),
  startWorkflow: vi.fn(),
}));

describe('when the specs cannot be loaded', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function renderFailing() {
    mockDashboardApis({ project: PROJECT_WITH_GIT });
    vi.mocked(api.loadProjectSpecs).mockRejectedValue(new Error('down'));
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });
    renderRoutedApp(ROUTES.landing, specsRemotes);
    await enterDashboard();
    await screen.findByTestId('flow-specs-error');
  }

  it('shows the failure in both panels', async () => {
    await renderFailing();
    expect(screen.getByTestId('specs-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load the specs')).toBeInTheDocument();
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
  });

  it.each([['Retry'], ['⟳ Reload specs']])('recovers through "%s"', async (label) => {
    await renderFailing();
    vi.mocked(api.loadProjectSpecs).mockResolvedValue(SPECS);
    await act(async () => {
      screen.getByRole('button', { name: label }).click();
    });
    expect(await screen.findByText('Start')).toBeInTheDocument();
    expect(screen.queryByTestId('flow-specs-error')).not.toBeInTheDocument();
  });
});

describe('spec files in the left pane', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('lists the spec files from the repository specs/ folder', async () => {
    await renderDashboard(SPECS);

    expect(api.loadProjectSpecs).toHaveBeenCalledWith(PROJECT.id, expect.any(AbortSignal));
    expect(screen.getAllByText('checkout-flow.md').length).toBeGreaterThan(0);
    expect(screen.getByText('pricing-rules.md')).toBeInTheDocument();
    expect(screen.queryByText('No specs found')).not.toBeInTheDocument();
  });

  it('selects another spec when clicked and shows its title in the center header', async () => {
    await renderDashboard(SPECS);

    await act(async () => {
      screen.getByText('pricing-rules.md').click();
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Pricing rules' })).toBeInTheDocument();
  });

  it('shows a non-interactive No specs found state when the repository has no specs', async () => {
    await renderDashboard([]);

    const title = screen.getByText('No specs found', { selector: 'strong' });
    expect(title.closest('button')).toBeNull();
  });

  it('offers a button to the workflow design screen when there are no specs', async () => {
    await renderDashboard([]);

    await act(async () => {
      screen.getByText(/Go to Workflow Design & Execution/).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('nav-app-workflow')).toHaveAttribute('aria-current', 'page'),
    );
    expect(screen.queryByText('No specs found')).not.toBeInTheDocument();
  });

  it('navigates to the Spec Files Dashboard when "View all specs" is clicked', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...SPECS[0]!,
      id: `spec-${i}`,
      fileName: `spec-${i}.md`,
    }));
    await renderDashboard(many);

    await act(async () => {
      screen.getByText(/View all specs \(5\)/).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('nav-app-spec-files')).toHaveAttribute('aria-current', 'page'),
    );
    expect(screen.getByRole('heading', { name: 'Specs' })).toBeInTheDocument();
  });
});
