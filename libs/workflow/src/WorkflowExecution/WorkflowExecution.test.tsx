import { act, screen, waitFor } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withQueryClient } from '../testUtils/queryClient';
import { WorkflowExecution } from './WorkflowExecution';
import * as api from '@openjcockpit/api';
import * as workflowApi from '@openjcockpit/api';
import { WORKFLOW, runWithStatus, stubExecutionDefaults } from '../testUtils/executionFixtures';

// The run view labels agents from the agent catalog; these tests stub that catalog.
vi.mock('../linkableAgents', async () => {
  const actual = await vi.importActual<typeof import('../linkableAgents')>('../linkableAgents');
  return { ...actual, fetchLinkableAgents: vi.fn(), loadLinkableAgents: vi.fn() };
});

vi.mock('@openjcockpit/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openjcockpit/api')>();
  return {
    ...actual,
    getAgentRun: vi.fn(),
    stopAgentRun: vi.fn(),
    getApprovalGateContext: vi.fn(),
    submitApprovalDecision: vi.fn(),
    listWorkflowExecutions: vi.fn(),
    getWorkflowExecution: vi.fn(),
    listWorkflows: vi.fn(),
  };
});

describe('WorkflowExecution', () => {
  beforeEach(stubExecutionDefaults);

  it('shows an empty state when no workflow has been opened yet', async () => {
    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={null} runId={null} />));
    });

    expect(screen.getByText(/Start a workflow from the Overview tab/)).toBeInTheDocument();
  });

  it('shows a not-running state when a workflow is opened without an active run', async () => {
    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
    });

    expect(screen.getByText('Customer Onboarding')).toBeInTheDocument();
    expect(screen.getByText(/No active execution for this workflow/)).toBeInTheDocument();
  });

  it('shows a Stop button and RUNNING status as soon as a run is opened', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows the Stop button while the run status is still loading', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockReturnValue(new Promise(() => undefined));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('still renders the run status when listWorkflows rejects', async () => {
    vi.mocked(workflowApi.listWorkflows).mockRejectedValue(new Error('boom'));
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(
      () => expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-1'),
      { timeout: 3000 },
    );
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('polls the run and renders the agent sequencer while active', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('RUNNING', {
        events: [
          {
            timestamp: new Date().toISOString(),
            agentId: 'requirement',
            title: 'Working',
            status: 'RUNNING',
            evidenceRef: '',
          },
        ],
      }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(
      () => expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-1'),
      { timeout: 3000 },
    );
    expect(await screen.findByText('Requirement Agent')).toBeInTheDocument();
    expect(screen.getByText('Evidence Agent')).toBeInTheDocument();
  });

  it('shows the active agent log console with its latest event', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('RUNNING', {
        events: [
          {
            timestamp: new Date().toISOString(),
            agentId: 'requirement',
            title: 'Extracting requirements',
            status: 'RUNNING',
            evidenceRef: '',
          },
        ],
      }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(
      () => expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-1'),
      { timeout: 3000 },
    );
    const logTextarea = await screen.findByLabelText<HTMLTextAreaElement>('Agent execution log');
    expect(logTextarea.value).toContain('Extracting requirements');
    expect(screen.getByText(/AGENT LOG \/\/ Requirement Agent/)).toBeInTheDocument();
  });

  it('keeps a workflow-definition failure event visible in the log console while another agent is active', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('RUNNING', {
        events: [
          {
            timestamp: new Date().toISOString(),
            agentId: 'requirement',
            title: 'Extracting requirements',
            status: 'RUNNING',
            evidenceRef: '',
          },
          {
            timestamp: new Date().toISOString(),
            agentId: 'workflow-definition',
            title: 'Workflow definition could not be read',
            status: 'FAILED',
            evidenceRef: '',
          },
        ],
      }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(
      () => expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-1'),
      { timeout: 3000 },
    );
    const logTextarea = await screen.findByLabelText<HTMLTextAreaElement>('Agent execution log');
    expect(logTextarea.value).toContain('Workflow definition could not be read');
    expect(logTextarea.readOnly).toBe(true);
  });

  it('announces a workflow-definition failure event via the status live region', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('RUNNING', {
        events: [
          {
            timestamp: new Date().toISOString(),
            agentId: 'requirement',
            title: 'Extracting requirements',
            status: 'RUNNING',
            evidenceRef: '',
          },
          {
            timestamp: new Date().toISOString(),
            agentId: 'workflow-definition',
            title: 'Workflow definition could not be read',
            status: 'FAILED',
            evidenceRef: '',
          },
        ],
      }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(
      () => expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-1'),
      { timeout: 3000 },
    );
    const announcement = screen.getByText('Workflow definition could not be read', {
      selector: 'p.workflow-waiting-announcement',
    });
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onRunEnded once the run reaches a terminal status', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('COMPLETED'));
    const onRunEnded = vi.fn();

    await act(async () => {
      render(
        withQueryClient(
          <WorkflowExecution workflow={WORKFLOW} runId="run-1" onRunEnded={onRunEnded} />,
        ),
      );
    });

    await waitFor(() => expect(onRunEnded).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('stops the run when the Stop button is clicked', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));
    vi.mocked(api.stopAgentRun).mockResolvedValue(undefined);

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await act(async () => {
      screen.getByText('Stop').click();
    });

    await waitFor(() => expect(api.stopAgentRun).toHaveBeenCalledWith('run-1'));
  });

  it('disables the Stop button while the stop request is pending', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));
    vi.mocked(api.stopAgentRun).mockReturnValue(new Promise(() => undefined));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });
    await act(async () => {
      screen.getByText('Stop').click();
    });

    expect((await screen.findByText('⟳ Stopping…')).closest('button')).toBeDisabled();
  });

  it('shows an error and keeps the run status when stopping fails', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));
    vi.mocked(api.stopAgentRun).mockRejectedValue(new Error('Stop refused'));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await act(async () => {
      screen.getByText('Stop').click();
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Stop refused');
    expect(screen.getByText('Stop')).toBeEnabled();
  });

  it('renders a FAILED run failureSummary inside an aria-live polite status element', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('FAILED', { failureSummary: 'the run failed because X' }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(() => {
      expect(screen.getByText('the run failed because X')).toBeInTheDocument();
    });
    const el = screen.getByText('the run failed because X');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el).toHaveAttribute('role', 'status');
  });

  it('renders no failure summary text for a COMPLETED run', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('COMPLETED'));

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
    expect(screen.queryByText(/the run failed/)).not.toBeInTheDocument();
  });

  it('renders no failure summary text for a FAILED run whose failureSummary is null', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('FAILED', { failureSummary: null }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
    expect(screen.queryByText(/the run failed/)).not.toBeInTheDocument();
  });

  it('clears the previously-shown failure summary when the selected run changes', async () => {
    vi.mocked(workflowApi.getWorkflowExecution).mockImplementation(
      async (_workflowId: string, currentRunId: string) => {
        if (currentRunId === 'run-1') {
          return runWithStatus('FAILED', { failureSummary: 'run one failed' });
        }
        return runWithStatus('RUNNING', { runId: 'run-2' });
      },
    );

    let rerender!: ReturnType<typeof render>['rerender'];
    await act(async () => {
      const result = render(
        withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />),
      );
      rerender = result.rerender;
    });

    await waitFor(() => {
      expect(screen.getByText('run one failed')).toBeInTheDocument();
    });

    await act(async () => {
      rerender(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-2" />));
    });

    await waitFor(() => {
      expect(screen.queryByText('run one failed')).not.toBeInTheDocument();
    });
  });

  it('renders a failureSummary containing script- and URL-like text as inert literal text', async () => {
    const dangerous = 'error at <script>alert(1)</script> see https://example.com/evil for details';
    vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
      runWithStatus('FAILED', { failureSummary: dangerous }),
    );

    await act(async () => {
      render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
    });

    await waitFor(() => {
      expect(screen.getByText(dangerous)).toBeInTheDocument();
    });
    const el = screen.getByText(dangerous);
    expect(el.textContent).toBe(dangerous);
    expect(document.querySelector('a')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
  });
});
