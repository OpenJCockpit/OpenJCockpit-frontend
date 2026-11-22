import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { chooseOption, optionLabels } from '@openjcockpit/ui/testing';
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

describe('workflow orb authoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const OTHER_WORKFLOW: WorkflowDefinition = {
    id: 'wf-other',
    name: 'Spec creation',
    projectName: 'Test Project',
    description: '',
    agentIds: [],
    subagentNames: [],
    skillNames: [],
    mcpTools: [],
    status: 'ACTIVE',
  };

  async function openNewWorkflowForOrbAuthoring() {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([OTHER_WORKFLOW]);
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
    fireEvent.change(screen.getByLabelText('Workflow name'), {
      target: { value: 'New workflow' },
    });
    fireEvent.change(screen.getByLabelText(/^Project name/), {
      target: { value: 'Test Project' },
    });
    const requirementCheckbox = screen.getByRole('checkbox', { name: /Requirement Agent/ });
    await act(async () => {
      fireEvent.click(requirementCheckbox);
    });
  }

  it('shows no execution mode pre-selected for a new orb (AC-02)', async () => {
    await openNewWorkflowForOrbAuthoring();
    await act(async () => {
      screen.getByText('+ Add orb').click();
    });

    const sequentialRadio = screen.getByRole('radio', { name: /Sequential/ });
    const parallelRadio = screen.getByRole('radio', { name: /Parallel/ });
    expect(sequentialRadio).not.toBeChecked();
    expect(parallelRadio).not.toBeChecked();
  });

  it('refuses to save when an orb has no execution mode chosen (AC-02)', async () => {
    await openNewWorkflowForOrbAuthoring();
    await act(async () => {
      screen.getByText('+ Add orb').click();
    });
    chooseOption(screen.getByLabelText('Referenced workflow'), OTHER_WORKFLOW.name);

    await act(async () => {
      screen.getByText('Save').click();
    });

    expect(screen.getByText(/choose an execution mode/i)).toBeInTheDocument();
    expect(workflowApi.createWorkflow).not.toHaveBeenCalled();
  });

  it('defaults the placement anchor to "run first" when none is chosen (AC-03)', async () => {
    await openNewWorkflowForOrbAuthoring();
    await act(async () => {
      screen.getByText('+ Add orb').click();
    });

    const placementSelect = screen.getByLabelText('Placement anchor');
    expect(placementSelect.textContent).toMatch(/run first/i);
    expect(optionLabels(placementSelect)[0]).toMatch(/run first/i);
  });

  it('disables Add orb once 5 orbs are already present (UX cap hint)', async () => {
    await openNewWorkflowForOrbAuthoring();
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        screen.getByText('+ Add orb').click();
      });
    }

    expect(screen.getByText('+ Add orb')).toBeDisabled();
  });

  it('shows the server-provided validation error associated with the orbs section and announced to assistive technology (AC-62)', async () => {
    vi.mocked(workflowApi.createWorkflow).mockRejectedValue(
      new Error('Workflow orb references itself: New workflow.'),
    );
    await openNewWorkflowForOrbAuthoring();
    await act(async () => {
      screen.getByText('+ Add orb').click();
    });
    chooseOption(screen.getByLabelText('Referenced workflow'), OTHER_WORKFLOW.name);
    const sequentialRadio = screen.getByRole('radio', { name: /Sequential/ });
    await act(async () => {
      fireEvent.click(sequentialRadio);
    });

    await act(async () => {
      screen.getByText('Save').click();
    });

    const errorEl = await screen.findByText('Workflow orb references itself: New workflow.');
    expect(errorEl).toHaveAttribute('role', 'alert');
    expect(errorEl).toHaveAttribute('id', 'workflow-save-error');
    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton).toHaveAttribute('aria-describedby', 'workflow-save-error');
  });

  it('degrades gracefully when workflowOrbs is entirely absent (older-backend response) and preserves an unrecognized extra field through a subsequent save (AC-53/AC-54)', async () => {
    const legacyWorkflow = {
      id: 'wf-legacy',
      name: 'Legacy workflow',
      projectName: 'Test Project',
      description: '',
      agentIds: ['requirement'],
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
      status: 'ACTIVE',
      // Simulates a field an older/newer backend might send that this dashboard build
      // doesn't declare in WorkflowDefinition — must round-trip harmlessly, not crash.
      someFutureField: 'unexpected-value',
    } as unknown as WorkflowDefinition;
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([legacyWorkflow]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.loadLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(PIPELINE_ORDERED_AGENTS);
    vi.mocked(workflowApi.updateWorkflow).mockResolvedValue({
      ...legacyWorkflow,
      description: 'updated',
    });

    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await screen.findByText('Legacy workflow');

    // No workflowOrbs field at all — renders without throwing, shows zero orb rows,
    // and the "+ Add orb" control is present/usable (AC-54: degrades to "no orbs", no error).
    await act(async () => {
      within(screen.getByText('Legacy workflow').closest('tr')!).getByLabelText('Edit').click();
    });
    expect(screen.getByText('+ Add orb')).toBeInTheDocument();
    expect(screen.queryByLabelText('Referenced workflow')).not.toBeInTheDocument();

    // Editing an unrelated field and saving must not corrupt or drop the unrecognized field
    // or any other existing field (AC-53).
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'updated' },
    });
    await act(async () => {
      screen.getByText('Save').click();
    });

    await waitFor(() => expect(workflowApi.updateWorkflow).toHaveBeenCalled());
    const [, savedRequest] = vi.mocked(workflowApi.updateWorkflow).mock.calls[0]!;
    expect(savedRequest).toEqual(expect.objectContaining({ someFutureField: 'unexpected-value' }));
    expect(savedRequest).toEqual(expect.objectContaining({ agentIds: ['requirement'] }));
  });
});
