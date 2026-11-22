import { act, screen, waitFor, within } from '@testing-library/react';
import { chooseOption } from '@openjcockpit/ui/testing';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
import {
  AVAILABLE_AGENTS,
  GROUPS,
  WORKFLOWS,
  renderWorkflowsTab,
} from '../testUtils/designFixtures';

// The designer and overview load linkable agents from the agent catalog; these tests stub that
// catalog with agent-definition fixtures (ids act as agent references).
vi.mock('../linkableAgents', async () => {
  const actual = await vi.importActual<typeof import('../linkableAgents')>('../linkableAgents');
  return { ...actual, fetchLinkableAgents: vi.fn(), loadLinkableAgents: vi.fn() };
});

vi.mock('@openjcockpit/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openjcockpit/api')>();
  return {
    ...actual,
    listWorkflows: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    listWorkflowGroups: vi.fn(),
    createWorkflowGroup: vi.fn(),
    updateWorkflowGroup: vi.fn(),
    deleteWorkflowGroup: vi.fn(),
    exportWorkflows: vi.fn(),
    importWorkflows: vi.fn(),
    listAgentSpecs: vi.fn(),
    deleteAgentSpec: vi.fn(),
    getAgentCatalog: vi.fn(),
    getProviderAgentCard: vi.fn(),
    getSkillCatalog: vi.fn(),
    createSkillSpec: vi.fn(),
    updateSkillSpec: vi.fn(),
    deleteSkillSpec: vi.fn(),
    generateSkillSpec: vi.fn(),
  };
});

describe('workflows panel actions', () => {
  const LINKED: WorkflowDefinition[] = WORKFLOWS.map((w) => ({ ...w, agentIds: ['requirement'] }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('filters to workflows without a group', async () => {
    await renderWorkflowsTab();
    chooseOption(screen.getByLabelText(/^Group$/), 'No group');
    expect(screen.queryByText('Customer Onboarding')).not.toBeInTheDocument();
    expect(screen.getByText('Spec to pull request')).toBeInTheDocument();
  });

  it('closes the editor without saving on Cancel', async () => {
    await renderWorkflowsTab();
    await act(async () => {
      screen.getByText('+ New workflow').click();
    });
    expect(screen.getByLabelText('Workflow name')).toBeInTheDocument();
    await act(async () => {
      screen.getByText('Cancel').click();
    });
    expect(screen.queryByLabelText('Workflow name')).not.toBeInTheDocument();
  });

  it('replaces only the saved workflow in the list after an update', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue(LINKED);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(AVAILABLE_AGENTS);
    vi.mocked(workflowApi.updateWorkflow).mockResolvedValue({
      ...LINKED[0]!,
      name: 'Renamed onboarding',
    });
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Customer Onboarding');
    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!).getByLabelText('Edit').click();
    });
    await act(async () => {
      screen.getByText('Save').click();
    });
    expect(await screen.findByText('Renamed onboarding')).toBeInTheDocument();
    expect(screen.getByText('Spec to pull request')).toBeInTheDocument();
  });

  it('falls back to a generic message when saving fails with a non-Error', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue(LINKED);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(AVAILABLE_AGENTS);
    vi.mocked(workflowApi.updateWorkflow).mockRejectedValue('boom');
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Customer Onboarding');
    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!).getByLabelText('Edit').click();
    });
    await act(async () => {
      screen.getByText('Save').click();
    });
    expect((await screen.findAllByText('Failed to save the workflow.')).length).toBeGreaterThan(0);
  });

  it('removes a deleted workflow from the list', async () => {
    vi.mocked(workflowApi.deleteWorkflow).mockResolvedValue();
    await renderWorkflowsTab();
    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!)
        .getByLabelText('Delete')
        .click();
    });
    await act(async () => {
      screen.getByTestId('confirm-action-confirm').click();
    });
    await waitFor(() => expect(screen.queryByText('Customer Onboarding')).not.toBeInTheDocument());
    expect(workflowApi.deleteWorkflow).toHaveBeenCalledWith('wf-1');
  });

  it('falls back to a generic message when deleting fails with a non-Error', async () => {
    vi.mocked(workflowApi.deleteWorkflow).mockRejectedValue('nope');
    await renderWorkflowsTab();
    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!)
        .getByLabelText('Delete')
        .click();
    });
    await act(async () => {
      screen.getByTestId('confirm-action-confirm').click();
    });
    expect(await screen.findByText('Failed to delete the workflow.')).toBeInTheDocument();
    expect(screen.getByText('Customer Onboarding')).toBeInTheDocument();
  });

  it('shows an error when exporting fails', async () => {
    vi.mocked(workflowApi.exportWorkflows).mockRejectedValue(new Error('down'));
    await renderWorkflowsTab();
    await act(async () => {
      screen.getByText('Export JSON').click();
    });
    expect(await screen.findByText('Failed to export the workflows.')).toBeInTheDocument();
  });

  it('shows a generic catalogue error when loading fails with a non-Error', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue(WORKFLOWS);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    vi.mocked(linkable.fetchLinkableAgents).mockRejectedValue('catalog down');
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    expect(await screen.findByText('Failed to load the agent catalog.')).toBeInTheDocument();
  });
});
