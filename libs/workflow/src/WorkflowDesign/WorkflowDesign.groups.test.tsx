import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { chooseOption, optionLabels } from '@openjcockpit/ui/testing';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as workflowApi from '@openjcockpit/api';
import { GROUPS, WORKFLOWS, renderWorkflowsTab } from '../testUtils/designFixtures';

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

describe('workflow groups in the design tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the group name of each workflow in the table', async () => {
    await renderWorkflowsTab();

    const row = screen.getByText('Customer Onboarding').closest('tr')!;
    expect(within(row).getByText('Onboarding flows')).toBeInTheDocument();
    const ungroupedRow = screen.getByText('Spec to pull request').closest('tr')!;
    expect(within(ungroupedRow).getByText('—')).toBeInTheDocument();
  });

  it('filters the workflow table by group', async () => {
    await renderWorkflowsTab();

    const filter = screen.getByLabelText(/^Group$/);
    chooseOption(filter, 'Onboarding flows');

    expect(screen.getByText('Customer Onboarding')).toBeInTheDocument();
    expect(screen.queryByText('Spec to pull request')).not.toBeInTheDocument();
  });

  it('offers the groups as options when editing a workflow', async () => {
    await renderWorkflowsTab();

    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!).getByLabelText('Edit').click();
    });

    const groupSelect = screen
      .getAllByRole('combobox', { name: /Group/ })
      .find((sel) => sel.textContent === 'Onboarding flows')!;
    expect(groupSelect).toBeDefined();
    expect(optionLabels(groupSelect)).toEqual(['No group', 'Onboarding flows', 'Compliance']);
  });

  it('manages groups on the Groups tab', async () => {
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    vi.mocked(workflowApi.createWorkflowGroup).mockResolvedValue({
      id: 'wg-new',
      name: 'Reporting',
      description: 'Reporting workflows',
    });
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });

    await act(async () => {
      screen.getByText('Groups').click();
    });
    await screen.findByText('Onboarding flows');
    expect(screen.getByText('Compliance')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('+ New group').click();
    });
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Reporting' } });
    await act(async () => {
      screen.getByText('Save').click();
    });

    await waitFor(() => {
      expect(workflowApi.createWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Reporting' }),
      );
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    });
  });

  it('shows whether a group is project-bound or global', async () => {
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });

    await act(async () => {
      screen.getByText('Groups').click();
    });
    await screen.findByText('Onboarding flows');

    const bound = screen.getByText('Onboarding flows').closest('tr')!;
    expect(within(bound).getByText('Test Project')).toBeInTheDocument();
    const globalRow = screen.getByText('Compliance').closest('tr')!;
    expect(within(globalRow).getByText('Global (all projects)')).toBeInTheDocument();
  });

  it('refuses to save a workflow without group and without project', async () => {
    await renderWorkflowsTab();

    await act(async () => {
      screen.getByText('+ New workflow').click();
    });
    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'Standalone workflow' },
    });
    await act(async () => {
      screen.getByText('Save').click();
    });

    expect(
      screen.getByText(/Link the workflow to a group or enter a project name/),
    ).toBeInTheDocument();
    expect(workflowApi.createWorkflow).not.toHaveBeenCalled();
  });

  it('offers the available pipeline agents as checkboxes and saves selected ids', async () => {
    vi.mocked(workflowApi.createWorkflow).mockResolvedValue({
      ...WORKFLOWS[0]!,
      id: 'wf-new',
      name: 'Standalone workflow',
      agentIds: ['realisation'],
    });
    await renderWorkflowsTab();

    await act(async () => {
      screen.getByText('+ New workflow').click();
    });
    expect(screen.getByText('Realisation Agent')).toBeInTheDocument();
    expect(screen.getByText('Apply implementation in the repository')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'Standalone workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), { target: { value: 'Test Project' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Realisation Agent/ }));
    });
    await act(async () => {
      screen.getByText('Save').click();
    });

    await waitFor(() => {
      expect(workflowApi.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ agentIds: ['realisation'] }),
      );
    });
  });

  it('deletes a group from the Groups tab', async () => {
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
    vi.mocked(workflowApi.deleteWorkflowGroup).mockResolvedValue();
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });

    await act(async () => {
      screen.getByText('Groups').click();
    });
    await screen.findByText('Onboarding flows');

    await act(async () => {
      within(screen.getByText('Onboarding flows').closest('tr')!).getByLabelText('Delete').click();
    });

    await act(async () => {
      screen.getByTestId('confirm-action-confirm').click();
    });

    await waitFor(() => {
      expect(workflowApi.deleteWorkflowGroup).toHaveBeenCalledWith('wg-onboarding');
      expect(screen.queryByText('Onboarding flows')).not.toBeInTheDocument();
    });
  });
});
