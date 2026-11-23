import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { chooseOption, optionLabels } from '@openjcockpit/ui/testing';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
import { WORKFLOWS, PIPELINE_ORDERED_AGENTS } from '../testUtils/designFixtures';

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

describe('human approval gate (designer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function openNewWorkflowWithAgents(agentIds: string[]) {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.loadLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    const newWorkflowButton = await screen.findByText('+ New workflow');
    await act(async () => {
      newWorkflowButton.click();
    });
    for (const id of agentIds) {
      const agent = PIPELINE_ORDERED_AGENTS.find((a) => a.id === id)!;
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(agent.name) }));
      });
    }
  }

  it('lists exactly the linked agents in execution order, defaulting to the last one (AC-01/AC-02)', async () => {
    // The link order is the execution order; the dropdown follows it.
    await openNewWorkflowWithAgents(['realisation', 'requirement', 'test-design']);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Human approval gate/ }));
    });

    const select = screen.getByLabelText('Gate placement');
    expect(optionLabels(select)).toEqual([
      'Realisation Agent',
      'Requirement Agent',
      'Test Design Agent',
    ]);
    expect(select).toHaveTextContent('Test Design Agent');
  });

  it('defaults to the last linked agent in execution order (AC-02)', async () => {
    await openNewWorkflowWithAgents(['impact', 'requirement']);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Human approval gate/ }));
    });

    expect(screen.getByLabelText('Gate placement')).toHaveTextContent('Requirement Agent');
  });

  it('offers feedback re-runs at any linked agent, as text only (AC-60)', async () => {
    await openNewWorkflowWithAgents(['requirement', 'realisation']);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Human approval gate/ }));
    });

    expect(
      screen.getByText(/Up to 3 feedback iterations are available at this gate/),
    ).toBeInTheDocument();

    const select = screen.getByLabelText('Gate placement');
    chooseOption(select, 'Requirement Agent');

    expect(
      screen.getByText(/Up to 3 feedback iterations are available at this gate/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/This gate offers Accept and Deny only/)).not.toBeInTheDocument();
    expect(select).toHaveAttribute('aria-describedby', 'approval-gate-note');
  });

  it('shows the checkbox ticked and the saved placement selected when re-opening a gated workflow (AC-01)', async () => {
    const gatedWorkflow: WorkflowDefinition = {
      id: 'wf-gated',
      name: 'Gated workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: ['requirement', 'realisation'],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      approvalGate: { enabled: true, placementStage: 'realisation' },
      status: 'ACTIVE',
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([gatedWorkflow]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.loadLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Gated workflow');

    await act(async () => {
      within(screen.getByText('Gated workflow').closest('tr')!).getByLabelText('Edit').click();
    });

    expect(screen.getByRole('checkbox', { name: /Human approval gate/ })).toBeChecked();
    expect(screen.getByLabelText('Gate placement')).toHaveTextContent('Realisation Agent');
  });

  it('displays the server-provided validation message instead of a generic failure (AC-03)', async () => {
    vi.mocked(workflowApi.createWorkflow).mockRejectedValue(
      new Error(
        'The approval gate placement "realisation" is not among the selected pipeline agents.',
      ),
    );
    await openNewWorkflowWithAgents(['requirement']);
    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'Bad gate workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), { target: { value: 'Test Project' } });

    await act(async () => {
      screen.getByText('Save').click();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'The approval gate placement "realisation" is not among the selected pipeline agents.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('displays the server-provided message naming the referencing workflow when delete is refused (AC-08)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOWS[0]!]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.loadLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(workflowApi.deleteWorkflow).mockRejectedValue(
      new Error("Cannot delete workflow 'C': it is still referenced by workflow orb(s) in: [W]"),
    );
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Customer Onboarding');

    await act(async () => {
      within(screen.getByText('Customer Onboarding').closest('tr')!)
        .getByLabelText('Delete')
        .click();
    });

    await act(async () => {
      screen.getByTestId('confirm-action-confirm').click();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Cannot delete workflow 'C': it is still referenced by workflow orb(s) in: [W]",
        ),
      ).toBeInTheDocument();
    });
  });
});
