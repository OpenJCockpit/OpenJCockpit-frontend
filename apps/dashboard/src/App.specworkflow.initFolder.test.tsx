import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutedApp } from './testUtils/renderRoutedApp';
import * as api from '@openjcockpit/api';
import * as workflowApi from '@openjcockpit/api';
import { mockWorkspace } from '@openjcockpit/api/testing';
import { PROJECT, WORKFLOW } from './testUtils/dashboardFixtures';
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

describe('when the .specify folder already exists but there are no specs yet', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const SPEC_CREATE_WORKFLOW = {
    ...WORKFLOW,
    id: 'wf-spec-create',
    name: 'Create spec from prompt (RAG)',
    projectName: '',
    groupId: 'wg-spec-workflow',
    promptRequired: true,
  };

  async function renderWithExistingTemplate(workflows = [SPEC_CREATE_WORKFLOW], pending = false) {
    localStorage.setItem('openjcockpit_project_id', PROJECT.id);
    vi.mocked(api.loadProjects).mockResolvedValue([PROJECT_WITH_GIT]);
    vi.mocked(api.loadWorkspace).mockResolvedValue(mockWorkspace);
    vi.mocked(api.loadProjectSpecs).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue(workflows);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([
      { id: 'wg-spec-workflow', name: 'Spec-driven development', description: '', projectName: '' },
    ]);
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({
      pending,
      ...(pending
        ? {
            branch: 'spec-init/test-project/20260705-abc',
            pullRequestUrl:
              'https://github.com/org/repo/compare/main...spec-init/test-project/20260705-abc?expand=1',
          }
        : {}),
      templateExists: true,
    });

    renderRoutedApp();
    await enterDashboard();
    await screen.findByText('Create spec with prompt');
  }

  it('offers the spec-create workflow instead of the init pull-request flow', async () => {
    await renderWithExistingTemplate();

    expect(screen.getByText(/already has a \.specify folder, but no specs/)).toBeInTheDocument();
    expect(screen.queryByText(/Spec folder initialization/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Merge the corresponding pull request/)).not.toBeInTheDocument();
  });

  it('hides the pull-request message even when a spec-init branch is still open', async () => {
    await renderWithExistingTemplate([SPEC_CREATE_WORKFLOW], true);

    expect(screen.queryByText('Pull request open')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open pull request/ })).not.toBeInTheDocument();
    expect(screen.getByText('Create spec with prompt')).toBeInTheDocument();
  });

  it('opens the themed prompt dialog and starts the spec-create workflow', async () => {
    await renderWithExistingTemplate();
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
      workflowId: 'wf-spec-create',
      executionId: 'exec-11',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      message: 'started',
    });
    vi.mocked(api.getAgentRun).mockResolvedValue({
      runId: 'exec-11',
      customerId: mockWorkspace.customer.id,
      specFile: 'spec',
      repositoryUrl: '',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      events: [],
      generatedArtifacts: [],
    });

    await act(async () => {
      screen.getByText('Create spec with prompt').click();
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Create a spec for the login page' },
    });
    await act(async () => {
      screen.getByText('Start with prompt').click();
    });

    await waitFor(() => {
      expect(workflowApi.startWorkflow).toHaveBeenCalledWith('wf-spec-create', {
        prompt: 'Create a spec for the login page',
        specFile: undefined,
        repositoryUrl: 'https://github.com/org/test-project.git',
        projectId: 'project-1',
      });
    });
  });

  it('disables the button when the spec-create workflow is not available', async () => {
    await renderWithExistingTemplate([]);

    expect(screen.getByText('Create spec with prompt')).toBeDisabled();
    expect(screen.getByText(/is not available for this project/)).toBeInTheDocument();
  });
});

describe('spec folder initialisation when no specs are found', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows the initialisation workflow in the dropdown when there are no specs', async () => {
    await renderDashboard([]);

    const dropdown = screen.getByLabelText('Workflow');
    expect(within(dropdown).getByText(/Spec folder initialization/)).toBeInTheDocument();
    expect(screen.getByText(/offers it as a pull request/)).toBeInTheDocument();
  });

  it('starts the spec-init workflow and shows the pull request link on success', async () => {
    await renderDashboard([]);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(api.initSpecFolder).mockResolvedValue({
      projectId: PROJECT.id,
      branch: 'spec-init/test-project/20260705-abc',
      baseBranch: 'main',
      commitHash: 'abc123',
      fileName: 'spec-template.md',
      pullRequestUrl:
        'https://github.com/org/repo/compare/main...spec-init/test-project/20260705-abc?expand=1',
      message: 'Starter spec pushed to branch spec-init/test-project/20260705-abc',
    });

    await act(async () => {
      screen.getByText('Start').click();
    });

    await waitFor(() => {
      expect(api.initSpecFolder).toHaveBeenCalledWith(PROJECT.id);
      expect(screen.getByText('Pull request offered')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /Open pull request/ });
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/org/repo/compare/main...spec-init/test-project/20260705-abc?expand=1',
      );
    });
    expect(screen.queryByLabelText('Workflow')).not.toBeInTheDocument();
  });

  it('reloads the specs when requested after initialisation', async () => {
    await renderDashboard([]);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(api.initSpecFolder).mockResolvedValue({
      projectId: PROJECT.id,
      branch: 'spec-init/test-project/20260705-abc',
      baseBranch: 'main',
      commitHash: 'abc123',
      fileName: 'spec-template.md',
      message: 'Starter spec pushed',
    });

    await act(async () => {
      screen.getByText('Start').click();
    });
    await screen.findByText('Pull request offered');

    vi.mocked(api.loadProjectSpecs).mockResolvedValue(SPECS);
    await act(async () => {
      screen.getByText('⟳ Reload specs').click();
    });

    await waitFor(() => {
      expect(screen.getAllByText('checkout-flow.md').length).toBeGreaterThan(0);
    });
  });

  it('shows the error message when initialisation fails', async () => {
    await renderDashboard([]);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(api.initSpecFolder).mockRejectedValue(
      new Error('NO_CHANGES: Spec folder already contains files'),
    );

    await act(async () => {
      screen.getByText('Start').click();
    });

    await waitFor(() => {
      expect(
        screen.getByText('NO_CHANGES: Spec folder already contains files'),
      ).toBeInTheDocument();
    });
  });

  it('runs the pre-flight check before initialising the spec folder', async () => {
    await renderDashboard([]);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({
      passed: false,
      errors: [{ code: 'GIT_REPOSITORY_UNAVAILABLE', message: 'Repository not reachable.' }],
    });

    await act(async () => {
      screen.getByText('Start').click();
    });

    await waitFor(() => {
      expect(screen.getByText(/The Git repository is not reachable/)).toBeInTheDocument();
    });
    expect(api.initSpecFolder).not.toHaveBeenCalled();
  });
});
