import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clickAsync, renderAsync } from '../testUtils/dom';
import { WorkflowOverview } from './WorkflowOverview';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
import * as linkable from '../linkableAgents';
import { WORKFLOW, FULL_AGENT_CATALOGUE } from '../testUtils/overviewFixtures';

// The designer and overview load linkable agents from the agent catalog; these tests stub that
// catalog with agent-definition fixtures (ids act as agent references).
vi.mock('../linkableAgents', async () => {
  const actual = await vi.importActual<typeof import('../linkableAgents')>('../linkableAgents');
  return { ...actual, fetchLinkableAgents: vi.fn(), loadLinkableAgents: vi.fn() };
});

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils/mockApi')).automockApiClients(await importOriginal()),
);

describe('WorkflowOverview — BLOCKED start outcomes and agent visibility (workflow-designer-pipeline-agents-linkage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowApi.getOpaConfig).mockResolvedValue({
      enabled: false,
      baseUrl: '',
      policyPath: '',
      healthPath: '',
      timeoutSeconds: 3,
      failMode: 'FAIL_CLOSED',
      decisionLoggingEnabled: true,
      decisionLogExportEnabled: true,
      environment: '',
      customerLabel: '',
      projectLabel: '',
      hasAuthToken: false,
    });
    vi.mocked(workflowApi.getWorkflowDecisionLogs).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([
      { id: 'wg-spec-workflow', name: 'Spec-driven development', description: '', projectName: '' },
    ]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(FULL_AGENT_CATALOGUE);
  });

  it('renders the server BLOCKED message instead of the generic Started text (AC-20)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
      workflowId: 'wf-1',
      executionId: null as unknown as string,
      status: 'BLOCKED',
      startedAt: new Date().toISOString(),
      message:
        "Workflow 'wf-1' has no pipeline agents configured; select at least one agent in Design → Workflows.",
    });

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    await clickAsync(screen.getByText('Start'));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Workflow 'wf-1' has no pipeline agents configured; select at least one agent in Design → Workflows.",
        ),
      ).toBeInTheDocument();
    });
  });

  it('never renders the literal string None for a workflow that has agents configured (AC-22)', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    expect(screen.getByText('Requirement Agent, Evidence Agent')).toBeInTheDocument();
    expect(screen.queryByText('requirement, evidence')).not.toBeInTheDocument();
    const agentsRow = screen.getByText('Agents').closest('div')!;
    expect(within(agentsRow).queryByText('None')).not.toBeInTheDocument();
  });

  it('T-F1: resolves agent ids to names and never shows the raw id string', async () => {
    const workflow: WorkflowDefinition = { ...WORKFLOW, agentIds: ['requirement', 'evidence'] };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    expect(screen.getByText('Requirement Agent, Evidence Agent')).toBeInTheDocument();
    expect(screen.queryByText('requirement, evidence')).toBeNull();
    const agentsRow = screen.getByText('Agents').closest('div')!;
    expect(within(agentsRow).queryByText('None')).not.toBeInTheDocument();
  });

  it('T-F2: renders resolved agent names in the workflow execution order', async () => {
    const workflow: WorkflowDefinition = { ...WORKFLOW, agentIds: ['evidence', 'impact'] };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    expect(screen.getByText('Evidence Agent, Impact Agent')).toBeInTheDocument();
  });

  it('T-F3: fetches the agent catalogue exactly once for the whole mount, not once per card', async () => {
    const workflowA: WorkflowDefinition = {
      ...WORKFLOW,
      id: 'wf-a',
      name: 'Workflow A',
      agentIds: ['requirement'],
    };
    const workflowB: WorkflowDefinition = {
      ...WORKFLOW,
      id: 'wf-b',
      name: 'Workflow B',
      agentIds: ['evidence'],
    };
    const workflowC: WorkflowDefinition = {
      ...WORKFLOW,
      id: 'wf-c',
      name: 'Workflow C',
      agentIds: ['impact'],
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflowA, workflowB, workflowC]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Workflow A');
    await screen.findByText('Workflow B');
    await screen.findByText('Workflow C');

    expect(linkable.fetchLinkableAgents).toHaveBeenCalledTimes(1);
  });

  it('T-F4: shows raw ids and a degraded notice when the agent catalogue fails to load, but still renders the workflow cards', async () => {
    vi.mocked(linkable.fetchLinkableAgents).mockRejectedValue(new Error('boom'));
    const workflow: WorkflowDefinition = { ...WORKFLOW, agentIds: ['requirement', 'evidence'] };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    expect(screen.getByText('requirement, evidence')).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Agent names could not be loaded — showing agent ids.');
    expect(screen.queryByText(/\(unrecognised\)/)).not.toBeInTheDocument();
  });

  it('T-F5: renders known agent ids as names and unknown ids with an unrecognised marker', async () => {
    const workflow: WorkflowDefinition = {
      ...WORKFLOW,
      agentIds: ['requirement', 'unknown-agent'],
    };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    expect(screen.getByText('Requirement Agent, unknown-agent (unrecognised)')).toBeInTheDocument();
  });

  it('T-F6: still renders None for a workflow with no agents configured', async () => {
    const workflow: WorkflowDefinition = { ...WORKFLOW, agentIds: [] };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([workflow]);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    const agentsRow = screen.getByText('Agents').closest('div')!;
    expect(within(agentsRow).getByText('None')).toBeInTheDocument();
  });
});
