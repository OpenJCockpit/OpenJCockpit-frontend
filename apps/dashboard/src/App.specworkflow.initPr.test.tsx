import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutedApp } from './testUtils/renderRoutedApp';
import * as api from '@openjcockpit/api';
import * as workflowApi from '@openjcockpit/api';
import { mockWorkspace } from '@openjcockpit/api/testing';
import { PROJECT, WORKFLOW } from './testUtils/dashboardFixtures';
import { enterDashboard } from './testUtils/dom';
import { PROJECT_WITH_GIT } from './testUtils/specWorkflowFixtures';

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

describe('when a spec-init pull request is already open', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function renderWithPendingBranch() {
    localStorage.setItem('openjcockpit_project_id', PROJECT.id);
    vi.mocked(api.loadProjects).mockResolvedValue([PROJECT_WITH_GIT]);
    vi.mocked(api.loadWorkspace).mockResolvedValue(mockWorkspace);
    vi.mocked(api.loadProjectSpecs).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({
      pending: true,
      branch: 'spec-init/test-project/20260705-abc',
      branchUrl: 'https://github.com/org/repo/tree/spec-init/test-project/20260705-abc',
      pullRequestUrl:
        'https://github.com/org/repo/compare/main...spec-init/test-project/20260705-abc?expand=1',
    });

    renderRoutedApp();
    await enterDashboard();
    await screen.findByText('Pull request open');
  }

  it('hides the init Start button and shows a link to the branch on the web', async () => {
    await renderWithPendingBranch();

    expect(screen.queryByText('Start')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Workflow')).not.toBeInTheDocument();
    const branchLink = screen.getByRole('link', { name: /View branch on the repository/ });
    expect(branchLink).toHaveAttribute(
      'href',
      'https://github.com/org/repo/tree/spec-init/test-project/20260705-abc',
    );
    expect(api.initSpecFolder).not.toHaveBeenCalled();
  });

  it('omits the branch name and links when the status carries none', async () => {
    localStorage.setItem('openjcockpit_project_id', PROJECT.id);
    vi.mocked(api.loadProjects).mockResolvedValue([PROJECT_WITH_GIT]);
    vi.mocked(api.loadWorkspace).mockResolvedValue(mockWorkspace);
    vi.mocked(api.loadProjectSpecs).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: true });

    renderRoutedApp();
    await enterDashboard();
    await screen.findByText('Pull request open');

    expect(
      screen.getByText(/A branch with the spec template is already prepared\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View branch on the repository/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Open pull request/ })).toBeNull();
  });

  it('shows the branch name and the pull request link', async () => {
    await renderWithPendingBranch();

    expect(screen.getByText(/spec-init\/test-project\/20260705-abc/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open pull request/ })).toHaveAttribute(
      'href',
      'https://github.com/org/repo/compare/main...spec-init/test-project/20260705-abc?expand=1',
    );
  });

  it('shows the init workflow again after reloading when the branch is merged', async () => {
    await renderWithPendingBranch();

    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });
    await act(async () => {
      screen.getByText('⟳ Reload specs').click();
    });

    await waitFor(() => {
      expect(screen.getByText(/Spec folder initialization/)).toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
    });
  });
});
