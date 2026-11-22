import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import * as workflowApi from '@openjcockpit/api';
import { mockWorkspace } from '@openjcockpit/api/testing';
import { WORKFLOW } from './testUtils/dashboardFixtures';
import { SPECS, renderDashboard } from './testUtils/specWorkflowFixtures';

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

describe('workflow selection in the center pane', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows a dropdown with the project workflows when a spec is selected', async () => {
    await renderDashboard(SPECS);

    const dropdown = screen.getByLabelText('Workflow');
    expect(within(dropdown).getByText('Spec to pull request')).toBeInTheDocument();
  });

  it('hides the dropdown and shows the workflow execution after Start', async () => {
    await renderDashboard(SPECS);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
      workflowId: WORKFLOW.id,
      executionId: 'exec-1',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      message: 'started',
    });
    vi.mocked(api.getAgentRun).mockResolvedValue({
      runId: 'exec-1',
      customerId: mockWorkspace.customer.id,
      specFile: 'spec',
      repositoryUrl: '',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      events: [],
      generatedArtifacts: [],
    });

    await act(async () => {
      screen.getByText('Start').click();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Workflow')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: WORKFLOW.name })).toBeInTheDocument();
    });
  });

  it('passes the selected spec file when starting a workflow', async () => {
    await renderDashboard(SPECS);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
      workflowId: WORKFLOW.id,
      executionId: 'exec-2',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      message: 'started',
    });
    vi.mocked(api.getAgentRun).mockResolvedValue({
      runId: 'exec-2',
      customerId: mockWorkspace.customer.id,
      specFile: 'spec',
      repositoryUrl: '',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      events: [],
      generatedArtifacts: [],
    });

    await act(async () => {
      screen.getByText('Start').click();
    });

    await waitFor(() => {
      expect(workflowApi.startWorkflow).toHaveBeenCalledWith(WORKFLOW.id, {
        specFile: 'checkout-flow.md',
        repositoryUrl: 'https://github.com/org/test-project.git',
        projectId: 'project-1',
      });
    });
  });

  it('asks for a prompt in a themed dialog for prompt-required workflows and starts with it', async () => {
    const promptWorkflow = {
      ...WORKFLOW,
      id: 'wf-spec-create',
      name: 'Create spec from prompt (RAG)',
      promptRequired: true,
    };
    await renderDashboard(SPECS, [promptWorkflow]);
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({ passed: true, errors: [] });
    vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
      workflowId: 'wf-spec-create',
      executionId: 'exec-9',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      message: 'started',
    });
    vi.mocked(api.getAgentRun).mockResolvedValue({
      runId: 'exec-9',
      customerId: mockWorkspace.customer.id,
      specFile: 'spec',
      repositoryUrl: '',
      status: 'RUNNING',
      startedAt: '2026-01-01T00:00:00Z',
      events: [],
      generatedArtifacts: [],
    });

    await act(async () => {
      screen.getByText('Start').click();
    });

    expect(workflowApi.startWorkflow).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Start with prompt')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Add a CSV export' },
    });
    await act(async () => {
      screen.getByText('Start with prompt').click();
    });

    await waitFor(() => {
      expect(workflowApi.startWorkflow).toHaveBeenCalledWith('wf-spec-create', {
        prompt: 'Add a CSV export',
        specFile: 'checkout-flow.md',
        repositoryUrl: 'https://github.com/org/test-project.git',
        projectId: 'project-1',
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('offers workflows from a global group for every project', async () => {
    const globalWorkflow = {
      ...WORKFLOW,
      id: 'wf-spec-create',
      name: 'Create spec from prompt (RAG)',
      projectName: '',
      groupId: 'wg-spec-workflow',
      promptRequired: true,
    };
    await renderDashboard(SPECS, [globalWorkflow]);

    const dropdown = screen.getByLabelText('Workflow');
    expect(within(dropdown).getByText('Create spec from prompt (RAG)')).toBeInTheDocument();
  });

  it('disables Start when the project has no workflows', async () => {
    await renderDashboard(SPECS, []);

    expect(screen.getByText('Start')).toBeDisabled();
    expect(screen.getByText(/No workflows for this project/)).toBeInTheDocument();
  });
});
