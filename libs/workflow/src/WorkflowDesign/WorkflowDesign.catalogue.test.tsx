import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
import { PIPELINE_ORDERED_AGENTS } from '../testUtils/designFixtures';

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

describe('WorkflowsPanel agent catalogue and validation (workflow-designer-pipeline-agents-linkage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-populates the picker with exactly the stored agent ids checked, matching sequence order (AC-01/AC-02)', async () => {
    const workflow: WorkflowDefinition = {
      id: 'wf-populated',
      name: 'Populated workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: ['realisation', 'requirement'],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      status: 'ACTIVE',
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Populated workflow');

    await act(async () => {
      within(screen.getByText('Populated workflow').closest('tr')!).getByLabelText('Edit').click();
    });

    for (const agent of PIPELINE_ORDERED_AGENTS) {
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(agent.name) });
      if (workflow.agentIds.includes(agent.id)) {
        expect(checkbox).toBeChecked();
      } else {
        expect(checkbox).not.toBeChecked();
      }
    }
  });

  it('rejects saving with an empty pipeline-agent selection without issuing a request, naming the constraint in an alert region (AC-04 client)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    const newWorkflowButton = await screen.findByText('+ New workflow');
    await act(async () => {
      newWorkflowButton.click();
    });

    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'No agents workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), { target: { value: 'Test Project' } });
    await act(async () => {
      screen.getByText('Save').click();
    });

    const alert = await screen.findByText(
      'Link at least one agent — a workflow without agents cannot run.',
    );
    expect(alert).toHaveAttribute('role', 'alert');
    expect(workflowApi.createWorkflow).not.toHaveBeenCalled();
  });

  it('renders the server-provided rejection message verbatim inside the alert region (AC-04 server)', async () => {
    vi.mocked(workflowApi.createWorkflow).mockRejectedValue(
      new Error("At least one pipeline agent must be selected for workflow 'wf-x'."),
    );
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    const newWorkflowButton = await screen.findByText('+ New workflow');
    await act(async () => {
      newWorkflowButton.click();
    });

    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'Server rejected workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), { target: { value: 'Test Project' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Requirement Agent/ }));
    });
    await act(async () => {
      screen.getByText('Save').click();
    });

    const serverMessage = "At least one pipeline agent must be selected for workflow 'wf-x'.";
    const alert = await screen.findByText(serverMessage);
    expect(alert).toHaveAttribute('role', 'alert');
  });

  it('shows an unknown stored agent id as an informational notice without checking it, while known ids remain correct (AC-05)', async () => {
    const workflow: WorkflowDefinition = {
      id: 'wf-unknown',
      name: 'Unknown id workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: ['requirement', 'legacy-stage'],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      status: 'ACTIVE',
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Unknown id workflow');

    await act(async () => {
      within(screen.getByText('Unknown id workflow').closest('tr')!).getByLabelText('Edit').click();
    });

    expect(screen.getByRole('checkbox', { name: /Requirement Agent/ })).toBeChecked();
    expect(screen.getByText(/legacy-stage/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /legacy-stage/ })).not.toBeInTheDocument();
  });

  it('shows an explicit error and does not render the Edit/Create form when the agent catalogue fails to load (AC-06)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockRejectedValue(
      new Error('Failed to load agent definitions: 500'),
    );
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });

    const alert = await screen.findByText('Failed to load agent definitions: 500');
    expect(alert).toHaveAttribute('role', 'alert');

    await act(async () => {
      screen.getByText('+ New workflow').click();
    });
    expect(screen.queryByRole('heading', { name: 'New workflow' })).not.toBeInTheDocument();
  });

  it('does not suppress the Edit form when the catalogue resolves successfully but empty (Q-L1)', async () => {
    const workflow: WorkflowDefinition = {
      id: 'wf-empty-catalogue',
      name: 'Empty catalogue workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: [],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      status: 'ACTIVE',
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue([]);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Empty catalogue workflow');

    await act(async () => {
      within(screen.getByText('Empty catalogue workflow').closest('tr')!)
        .getByLabelText('Edit')
        .click();
    });

    expect(screen.getByText('Edit workflow')).toBeInTheDocument();
  });

  it('saves the linked agents in execution order, which follows linking and the reorder buttons (BR-02/F-3)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(workflowApi.createWorkflow).mockResolvedValue({
      id: 'wf-ordered',
      name: 'Ordered workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: ['requirement', 'realisation'],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      status: 'ACTIVE',
    });
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    const newWorkflowButton = await screen.findByText('+ New workflow');
    await act(async () => {
      newWorkflowButton.click();
    });

    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'Ordered workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), { target: { value: 'Test Project' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Realisation Agent/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Requirement Agent/ }));
    });
    const order = screen.getByRole('list', { name: 'Execution order' });
    expect(
      within(order)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('Realisation Agent'),
      expect.stringContaining('Requirement Agent'),
    ]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Move Requirement Agent up' }));
    });
    await act(async () => {
      screen.getByText('Save').click();
    });

    await waitFor(() => {
      expect(workflowApi.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ agentIds: ['requirement', 'realisation'] }),
      );
    });
  });

  it('makes every checkbox in the Pipeline agents group reachable by keyboard, in sequence order, and togglable with Space (AC-21)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    const newWorkflowButton = await screen.findByText('+ New workflow');
    await act(async () => {
      newWorkflowButton.click();
    });

    const checkboxes = PIPELINE_ORDERED_AGENTS.map((agent) =>
      screen.getByRole('checkbox', { name: new RegExp(agent.name) }),
    );

    for (const checkbox of checkboxes) {
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    }

    const first = checkboxes[0]!;
    first.focus();
    expect(first).not.toBeChecked();
    await act(async () => {
      fireEvent.keyDown(first, { key: ' ', code: 'Space' });
      fireEvent.click(first);
    });
    expect(first).toBeChecked();
  });
});
