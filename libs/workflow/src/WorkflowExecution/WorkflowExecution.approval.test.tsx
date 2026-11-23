import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withQueryClient } from '../testUtils/queryClient';
import { WorkflowExecution } from './WorkflowExecution';
import * as api from '@openjcockpit/api';
import * as workflowApi from '@openjcockpit/api';
import type { ApprovalGateContext } from '@openjcockpit/api';
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

  describe('human approval gate', () => {
    const CONTEXT: ApprovalGateContext = {
      runId: 'run-1',
      workflowId: 'wf-1',
      placementStage: 'realisation',
      stageOutcome: 'PUBLISHED',
      changeSummary: 'Added an export button.',
      changedPaths: ['src/A.tsx'],
      changedFileCount: 1,
      omittedFileCount: 0,
      branchName: 'realisation/wf-1-abc',
      pullRequestUrl: 'https://git.example.com/org/repo/pull/1',
      branchCompareUrl: 'https://git.example.com/org/repo/compare',
      iteration: 1,
      maxFeedbackIterations: 3,
      feedbackSupported: true,
      furtherFeedbackAllowed: true,
      commentHistory: [],
      openedAt: new Date().toISOString(),
    };

    it('keeps polling and does not call onRunEnded while AWAITING_APPROVAL', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL'),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue(CONTEXT);
      const onRunEnded = vi.fn();

      vi.useFakeTimers();
      try {
        render(
          withQueryClient(
            <WorkflowExecution workflow={WORKFLOW} runId="run-1" onRunEnded={onRunEnded} />,
          ),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(onRunEnded).not.toHaveBeenCalled();
      expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    });

    it('tells the operator when the approval context cannot be loaded, then recovers on retry', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL'),
      );
      vi.mocked(workflowApi.getApprovalGateContext)
        .mockRejectedValueOnce(new Error('ctx down'))
        .mockResolvedValue(CONTEXT);

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
        expect(screen.getByRole('alert')).toHaveTextContent(/approval request could not be loaded/);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(screen.queryByText(/approval request could not be loaded/)).toBeNull();
      expect(workflowApi.getApprovalGateContext).toHaveBeenCalledTimes(2);
    });

    it('fetches the approval context exactly once per transition into AWAITING_APPROVAL, including a re-gate', async () => {
      vi.mocked(workflowApi.getWorkflowExecution)
        .mockResolvedValueOnce(runWithStatus('AWAITING_APPROVAL'))
        .mockResolvedValueOnce(runWithStatus('AWAITING_APPROVAL'))
        .mockResolvedValueOnce(runWithStatus('RUNNING'))
        .mockResolvedValueOnce(runWithStatus('AWAITING_APPROVAL'));
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue(CONTEXT);

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(workflowApi.getApprovalGateContext).toHaveBeenCalledTimes(2);
    });

    it('hosts the approval decision modal and submits Accept with the current iteration', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL'),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue(CONTEXT);
      vi.mocked(workflowApi.submitApprovalDecision).mockResolvedValue({
        runId: 'run-1',
        status: 'RUNNING',
        iteration: 1,
        message: 'ok',
      });

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
      });

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), {
        timeout: 3000,
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
      });

      await waitFor(() =>
        expect(workflowApi.submitApprovalDecision).toHaveBeenCalledWith('run-1', {
          decision: 'ACCEPT',
          iteration: 1,
          comment: undefined,
        }),
      );
    });

    async function openGate() {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL'),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue(CONTEXT);
      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
      });
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), {
        timeout: 3000,
      });
    }

    it('submits Deny and Accept-with-comments decisions', async () => {
      vi.mocked(workflowApi.submitApprovalDecision).mockResolvedValue({
        runId: 'run-1',
        status: 'RUNNING',
        iteration: 1,
        message: 'ok',
      });
      await openGate();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
      });
      await waitFor(() =>
        expect(workflowApi.submitApprovalDecision).toHaveBeenCalledWith('run-1', {
          decision: 'DENY',
          iteration: 1,
          comment: undefined,
        }),
      );
    });

    it('submits Accept-with-comments with the typed comment', async () => {
      vi.mocked(workflowApi.submitApprovalDecision).mockResolvedValue({
        runId: 'run-1',
        status: 'RUNNING',
        iteration: 1,
        message: 'ok',
      });
      await openGate();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Accept with my comments' }));
      });
      fireEvent.change(screen.getByLabelText('Feedback for the next attempt'), {
        target: { value: 'Please rename' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() =>
        expect(workflowApi.submitApprovalDecision).toHaveBeenCalledWith('run-1', {
          decision: 'ACCEPT_WITH_COMMENTS',
          iteration: 1,
          comment: 'Please rename',
        }),
      );
    });

    it('shows the error message when submitting a decision fails, with a generic fallback', async () => {
      vi.mocked(workflowApi.submitApprovalDecision)
        .mockRejectedValueOnce(new Error('Gate already closed'))
        .mockRejectedValueOnce('nope');
      await openGate();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
      });
      expect(await screen.findByText('Gate already closed')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
      });
      expect(
        await screen.findByText('Failed to submit the approval decision.'),
      ).toBeInTheDocument();
    });

    it('lets the operator dismiss the decision modal and reopen it via "Review pending approval"', async () => {
      await openGate();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Review pending approval' }));
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('stops a run awaiting approval, closes the modal and notifies onRunEnded', async () => {
      vi.mocked(api.stopAgentRun).mockResolvedValue(undefined);
      const onRunEnded = vi.fn();
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL'),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue(CONTEXT);
      await act(async () => {
        render(
          withQueryClient(
            <WorkflowExecution workflow={WORKFLOW} runId="run-1" onRunEnded={onRunEnded} />,
          ),
        );
      });
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), {
        timeout: 3000,
      });

      await act(async () => {
        screen.getByText('Stop').click();
      });

      await waitFor(() => expect(onRunEnded).toHaveBeenCalled());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('stops polling and renders a terminal explanation with a restart affordance for RUN_STATE_LOST', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockRejectedValue(
        Object.assign(new Error('Failed to load workflow execution: 404'), { status: 404 }),
      );
      const onRestartRequested = vi.fn();

      await act(async () => {
        render(
          withQueryClient(
            <WorkflowExecution
              workflow={WORKFLOW}
              runId="run-1"
              onRestartRequested={onRestartRequested}
            />,
          ),
        );
      });

      await waitFor(
        () => expect(screen.getByRole('alert')).toHaveTextContent(/state of this run was lost/i),
        { timeout: 3000 },
      );
      const callsAtTerminal = vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length;

      vi.useFakeTimers();
      try {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000);
        });
      } finally {
        vi.useRealTimers();
      }
      expect(vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length).toBe(callsAtTerminal);

      fireEvent.click(screen.getByText('Start again'));
      expect(onRestartRequested).toHaveBeenCalledTimes(1);
    });

    it('renders a DENIED status chip with a label distinct from FAILED and CANCELLED', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('DENIED'));

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
      });

      await waitFor(() => expect(screen.getByText('Denied')).toBeInTheDocument(), {
        timeout: 3000,
      });
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
    });

    it('renders the branch artifact as plain text and the pull-request artifact as a link with rel="noopener noreferrer"', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('RUNNING', {
          generatedArtifacts: [
            'git-branch:realisation/wf-1-abc',
            'pull-request:https://git.example.com/org/repo/pull/7',
          ],
        }),
      );

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
      });

      const branchLabel = await screen.findByText(
        'Branch: realisation/wf-1-abc',
        {},
        { timeout: 3000 },
      );
      expect(branchLabel.closest('a')).toBeNull();
      expect(screen.queryByRole('link', { name: /branch/i })).not.toBeInTheDocument();

      const prLink = screen.getByText('Pull request');
      expect(prLink.closest('a')).toHaveAttribute(
        'href',
        'https://git.example.com/org/repo/pull/7',
      );
      expect(prLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
