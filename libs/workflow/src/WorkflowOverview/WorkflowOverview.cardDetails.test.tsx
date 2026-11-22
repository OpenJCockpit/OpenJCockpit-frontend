import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clickAsync, renderAsync } from '../testUtils/dom';
import { withQueryClient } from '../testUtils/queryClient';
import { WorkflowOverview } from './WorkflowOverview';
import * as workflowApi from '@openjcockpit/api';
import type { Project, WorkflowDefinition } from '@openjcockpit/api';
import * as linkable from '../linkableAgents';
import { WORKFLOW, FULL_AGENT_CATALOGUE, mockStartResponse } from '../testUtils/overviewFixtures';

// The designer and overview load linkable agents from the agent catalog; these tests stub that
// catalog with agent-definition fixtures (ids act as agent references).
vi.mock('../linkableAgents', async () => {
  const actual = await vi.importActual<typeof import('../linkableAgents')>('../linkableAgents');
  return { ...actual, fetchLinkableAgents: vi.fn(), loadLinkableAgents: vi.fn() };
});

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils/mockApi')).automockApiClients(await importOriginal()),
);

describe('WorkflowOverview — card details and failure paths', () => {
  const entry = (over: Partial<workflowApi.PolicyDecisionAuditEntry>) =>
    ({
      id: 'd',
      workflowId: 'wf-1',
      opaDecisionId: 'opa-1',
      opaDecisionResult: 'ALLOWED',
      requiredApproval: false,
      auditTags: [],
      timestamp: new Date().toISOString(),
      policyUnavailable: false,
      ...over,
    }) as workflowApi.PolicyDecisionAuditEntry;

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

  it('summarises every enabled trigger, with "any" for a Hermes signal without a type', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([
      {
        ...WORKFLOW,
        id: 'wf-a',
        name: 'All triggers',
        trigger: {
          dashboardButtonEnabled: true,
          hermesSignalEnabled: true,
          hermesSignalType: 'deploy',
          fileDeliveryEnabled: true,
        },
      },
      {
        ...WORKFLOW,
        id: 'wf-b',
        name: 'Untyped hermes',
        trigger: {
          dashboardButtonEnabled: false,
          hermesSignalEnabled: true,
          fileDeliveryEnabled: false,
        },
      },
      { ...WORKFLOW, id: 'wf-c', name: 'No trigger', trigger: undefined },
    ]);

    await renderAsync(<WorkflowOverview project={null} />);

    expect(
      await screen.findByText('Dashboard button, Hermes signal (deploy), File delivery'),
    ).toBeInTheDocument();
    expect(screen.getByText('Hermes signal (any)')).toBeInTheDocument();
    expect(screen.getByText('None configured')).toBeInTheDocument();
  });

  it('lists subagents, skills and MCP tool names when configured and a missing status as a waiting chip', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([
      {
        ...WORKFLOW,
        status: undefined as unknown as string,
        subagentNames: ['sub-a', 'sub-b'],
        skillNames: ['skill-a'],
        mcpTools: [{ name: 'tool-a' }, { name: 'tool-b' }] as WorkflowDefinition['mcpTools'],
      },
    ]);

    await renderAsync(<WorkflowOverview project={null} />);

    expect(await screen.findByText('sub-a, sub-b')).toBeInTheDocument();
    expect(screen.getByText('skill-a')).toBeInTheDocument();
    expect(screen.getByText('tool-a, tool-b')).toBeInTheDocument();
  });

  it('falls back to the selected project name, then n/a, when the workflow has no project name', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([{ ...WORKFLOW, projectName: '' }]);
    await renderAsync(
      <WorkflowOverview project={{ id: 'p1', name: 'Fallback Project' } as Project} />,
    );
    expect(await screen.findByText('Fallback Project')).toBeInTheDocument();
  });

  it('shows n/a for the project when neither the workflow nor a selection names one', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([{ ...WORKFLOW, projectName: '' }]);
    await renderAsync(<WorkflowOverview project={null} />);
    const dt = await screen.findByText('Project');
    expect(dt.nextElementSibling).toHaveTextContent('n/a');
  });

  it('counts approvals and falls back to n/a for a decision without an id', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(workflowApi.getWorkflowDecisionLogs).mockResolvedValue([
      entry({ requiredApproval: true }),
      entry({ opaDecisionResult: 'OTHER' }),
      entry({ opaDecisionId: undefined }),
    ]);

    await renderAsync(<WorkflowOverview project={null} />);

    expect(await screen.findByText(/Last decision: ALLOWED \(n\/a\)/)).toBeInTheDocument();
    expect(screen.getByText(/Allowed 1 · Denied 0 · Requires approval 1/)).toBeInTheDocument();
  });

  it('shows zeroed decision counts while the decision logs are still loading', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(workflowApi.getWorkflowDecisionLogs).mockReturnValue(new Promise(() => {}));

    await renderAsync(<WorkflowOverview project={null} />);

    expect(
      await screen.findByText(/Allowed 0 · Denied 0 · Requires approval 0/),
    ).toBeInTheDocument();
  });

  it('treats OPA as disabled when its config cannot be loaded', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(workflowApi.getOpaConfig).mockRejectedValue(new Error('opa down'));

    await renderAsync(<WorkflowOverview project={null} />);

    expect(await screen.findByText('Disabled')).toBeInTheDocument();
  });

  it('uses a generic alert when the workflow list rejects with a non-Error', async () => {
    vi.mocked(workflowApi.listWorkflows).mockRejectedValue('nope');

    await renderAsync(<WorkflowOverview project={null} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Workflows could not be loaded — Failed to load workflows',
    );
  });

  it('warns and re-enables the export button when exporting decision logs fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');

    vi.mocked(workflowApi.getWorkflowDecisionLogs).mockRejectedValue(new Error('export failed'));
    await clickAsync(screen.getByText('Export decision logs'));

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Failed to export decision logs', expect.any(Error)),
    );
    expect(screen.getByText('Export decision logs')).not.toBeDisabled();
    warn.mockRestore();
  });

  it.each([
    ['the error message', new Error('Quota exceeded'), 'Quota exceeded'],
    ['a generic message for an empty error message', new Error(''), 'Failed to start workflow'],
    ['a generic message for a non-Error rejection', 'nope', 'Failed to start workflow'],
  ])('shows %s when starting fails', async (_label, rejection, expected) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
    vi.mocked(workflowApi.startWorkflow).mockRejectedValue(rejection);

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Customer Onboarding');
    await clickAsync(screen.getByText('Start'));

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.getByText('Start')).not.toBeDisabled();
    warn.mockRestore();
  });

  it('only updates the last execution of the started workflow, not of the others', async () => {
    const other: WorkflowDefinition = { ...WORKFLOW, id: 'wf-2', name: 'Other Workflow' };
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW, other]);
    mockStartResponse('wf-1', 'run-1', 'RUNNING', 'ok');

    await renderAsync(<WorkflowOverview project={null} />);
    await screen.findByText('Other Workflow');
    await clickAsync(screen.getAllByText('Start')[0]!);

    await waitFor(() => expect(screen.getAllByText('Never run')).toHaveLength(1));
  });
  describe('when unmounted before the requests settle', () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it('ignores a workflow list that resolves late', async () => {
      const list = deferred<WorkflowDefinition[]>();
      vi.mocked(workflowApi.listWorkflows).mockReturnValue(list.promise);
      const { unmount } = render(withQueryClient(<WorkflowOverview project={null} />));
      unmount();
      await act(async () => list.resolve([WORKFLOW]));
      expect(workflowApi.listWorkflowGroups).not.toHaveBeenCalled();
    });

    it('ignores decision summaries that resolve late', async () => {
      const logs = deferred<never[]>();
      vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
      vi.mocked(workflowApi.getWorkflowDecisionLogs).mockReturnValue(logs.promise);
      const { unmount } = render(withQueryClient(<WorkflowOverview project={null} />));
      await waitFor(() => expect(workflowApi.getWorkflowDecisionLogs).toHaveBeenCalled());
      unmount();
      await act(async () => logs.resolve([]));
    });

    it('ignores a workflow list failure that arrives late', async () => {
      const list = deferred<WorkflowDefinition[]>();
      vi.mocked(workflowApi.listWorkflows).mockReturnValue(list.promise);
      const { unmount } = render(withQueryClient(<WorkflowOverview project={null} />));
      unmount();
      await act(async () => list.reject(new Error('late')));
    });

    it('ignores an agent catalogue failure that arrives late', async () => {
      const agents = deferred<never[]>();
      vi.mocked(workflowApi.listWorkflows).mockResolvedValue([WORKFLOW]);
      vi.mocked(linkable.fetchLinkableAgents).mockReturnValue(agents.promise);
      const { unmount } = render(withQueryClient(<WorkflowOverview project={null} />));
      unmount();
      await act(async () => agents.reject(new Error('late')));
    });
  });

  it('falls back to a generic message when the list fails with a non-Error', async () => {
    vi.mocked(workflowApi.listWorkflows).mockRejectedValue('boom');

    await renderAsync(<WorkflowOverview project={null} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load workflows');
  });
});
