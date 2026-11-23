import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withQueryClient } from '../testUtils/queryClient';
import { WorkflowExecution } from './WorkflowExecution';
import * as workflowApi from '@openjcockpit/api';
import type { AgentRun, WorkflowExecutionPage } from '@openjcockpit/api';
import {
  WORKFLOW,
  emptyHistoryPage,
  runWithStatus,
  stubExecutionDefaults,
} from '../testUtils/executionFixtures';

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

  describe('execution history integration', () => {
    it('still immediately renders the live detail for a run passed in via the runId prop (regression: just-started flow unchanged)', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
      });

      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(await screen.findByText('Requirement Agent')).toBeInTheDocument();
    });

    it('shows full live controls (Stop button, auto-opening approval modal) for a running execution opened from the history list, not via "just started"', async () => {
      vi.mocked(workflowApi.listWorkflowExecutions).mockResolvedValue({
        items: [
          {
            runId: 'run-9',
            workflowId: 'wf-1',
            status: 'RUNNING',
            startedAt: new Date().toISOString(),
            completedAt: null,
            durationMillis: null,
            startedBy: 'alice',
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      });
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL', { runId: 'run-9' }),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue({
        runId: 'run-9',
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
      });

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'run-9' }));
      });

      await waitFor(() =>
        expect(workflowApi.getWorkflowExecution).toHaveBeenCalledWith('wf-1', 'run-9'),
      );
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('surfaces the approval UI when an already-AWAITING_APPROVAL row is selected from the history list', async () => {
      vi.mocked(workflowApi.listWorkflowExecutions).mockResolvedValue({
        items: [
          {
            runId: 'run-99',
            workflowId: 'wf-1',
            status: 'AWAITING_APPROVAL',
            startedAt: new Date().toISOString(),
            completedAt: null,
            durationMillis: null,
            startedBy: 'alice',
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      });
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_APPROVAL', { runId: 'run-99' }),
      );
      vi.mocked(workflowApi.getApprovalGateContext).mockResolvedValue({
        runId: 'run-99',
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
      });

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'run-99' }));
      });

      await waitFor(() => expect(workflowApi.getApprovalGateContext).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    });

    it('updates a running history row in place when it transitions to a terminal status on the next refresh, without duplicating or removing it', async () => {
      const initialPage: WorkflowExecutionPage = {
        items: [
          {
            runId: 'run-1',
            workflowId: 'wf-1',
            status: 'RUNNING',
            startedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            completedAt: null,
            durationMillis: null,
            startedBy: 'alice',
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      };
      const refreshedPage: WorkflowExecutionPage = {
        ...initialPage,
        items: [
          {
            ...initialPage.items[0]!,
            status: 'COMPLETED',
            completedAt: new Date('2024-01-01T00:05:00.000Z').toISOString(),
            durationMillis: 300000,
          },
        ],
      };
      vi.mocked(workflowApi.listWorkflowExecutions)
        .mockResolvedValueOnce(initialPage)
        .mockResolvedValue(refreshedPage);
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
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

      const runButtons = screen.getAllByRole('button', { name: 'run-1' });
      expect(runButtons.length).toBe(1);
    });

    it('retries the history fetch when Retry is clicked', async () => {
      vi.mocked(workflowApi.listWorkflowExecutions)
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(emptyHistoryPage());

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      });

      expect(
        await screen.findByText('This workflow has not been executed yet.'),
      ).toBeInTheDocument();
    });

    it('shows the history error state (never an empty list) when the history fetch fails', async () => {
      vi.mocked(workflowApi.listWorkflowExecutions).mockRejectedValue(new Error('boom'));

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.queryByText('This workflow has not been executed yet.'),
      ).not.toBeInTheDocument();
    });

    it('uses exactly one polling interval: detail is fetched on every tick and history is refreshed only on every second tick while a row is live, with no extra calls once everything is terminal', async () => {
      // A DIFFERENT runId ('run-42') than the selected/live run ('run-1') is used for the
      // history row here deliberately: this isolates the periodic history-refresh cadence
      // from the in-place merge that already happens on every detail poll (mergeHistoryItem
      // only touches a history row whose runId matches the currently-selected run).
      const runningHistoryPage = {
        items: [
          {
            runId: 'run-42',
            workflowId: 'wf-1',
            status: 'RUNNING',
            startedAt: new Date().toISOString(),
            completedAt: null,
            durationMillis: null,
            startedBy: null,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      };
      const completedHistoryPage = {
        ...runningHistoryPage,
        items: [
          {
            ...runningHistoryPage.items[0]!,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            durationMillis: 1000,
          },
        ],
      };
      vi.mocked(workflowApi.listWorkflowExecutions)
        .mockResolvedValueOnce(runningHistoryPage)
        .mockResolvedValue(completedHistoryPage);
      vi.mocked(workflowApi.getWorkflowExecution)
        .mockResolvedValueOnce(runWithStatus('RUNNING'))
        .mockResolvedValue(runWithStatus('COMPLETED'));

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId="run-1" />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        const historyCallsAfterMount = vi.mocked(workflowApi.listWorkflowExecutions).mock.calls
          .length;
        const detailCallsAfterMount = vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length;

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

        const detailCallsAfterTicks = vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length;
        expect(detailCallsAfterTicks).toBeGreaterThan(detailCallsAfterMount);

        const historyCallsBeforeSettling = vi.mocked(workflowApi.listWorkflowExecutions).mock.calls
          .length;
        expect(historyCallsBeforeSettling).toBeGreaterThan(historyCallsAfterMount);

        const detailCallsAtSettling = vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length;

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });

        expect(vi.mocked(workflowApi.getWorkflowExecution).mock.calls.length).toBe(
          detailCallsAtSettling,
        );
        expect(vi.mocked(workflowApi.listWorkflowExecutions).mock.calls.length).toBe(
          historyCallsBeforeSettling,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('preserves rows loaded via "Load more" through a subsequent background refresh (no truncation, duplication, or reordering)', async () => {
      const makeRow = (n: number, status = 'COMPLETED') => ({
        runId: `run-${n}`,
        workflowId: 'wf-1',
        status,
        startedAt: new Date(2024, 0, n).toISOString(),
        completedAt: status === 'COMPLETED' ? new Date(2024, 0, n, 1).toISOString() : null,
        durationMillis: status === 'COMPLETED' ? 3600000 : null,
        startedBy: null,
      });
      const firstPage: WorkflowExecutionPage = {
        items: [makeRow(1, 'RUNNING'), ...Array.from({ length: 19 }, (_, i) => makeRow(i + 2))],
        limit: 20,
        offset: 0,
        total: 40,
        hasMore: true,
      };
      const secondPage: WorkflowExecutionPage = {
        items: Array.from({ length: 20 }, (_, i) => makeRow(i + 21)),
        limit: 20,
        offset: 20,
        total: 40,
        hasMore: false,
      };
      const refreshedWindow: WorkflowExecutionPage = {
        items: [makeRow(1, 'COMPLETED'), ...Array.from({ length: 39 }, (_, i) => makeRow(i + 2))],
        limit: 40,
        offset: 0,
        total: 40,
        hasMore: false,
      };
      vi.mocked(workflowApi.listWorkflowExecutions)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
        .mockResolvedValue(refreshedWindow);

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        let rows = screen.getAllByRole('row').slice(1); // drop header row
        expect(rows.length).toBe(40);

        expect(workflowApi.listWorkflowExecutions).toHaveBeenLastCalledWith('wf-1', {
          limit: 20,
          offset: 20,
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });

        expect(workflowApi.listWorkflowExecutions).toHaveBeenLastCalledWith('wf-1', {
          limit: 40,
          offset: 0,
        });

        rows = screen.getAllByRole('row').slice(1);
        expect(rows.length).toBe(40);
        const runIds = rows.map((row) => row.querySelector('button')?.textContent);
        const uniqueRunIds = new Set(runIds);
        expect(uniqueRunIds.size).toBe(40);
        expect(runIds[0]).toBe('run-1');
        expect(runIds[39]).toBe('run-40');
      } finally {
        vi.useRealTimers();
      }
    });

    it('refreshes the history list on the expected tick cadence even when no run is selected, transitioning a running row to terminal in place', async () => {
      const runningPage: WorkflowExecutionPage = {
        items: [
          {
            runId: 'run-77',
            workflowId: 'wf-1',
            status: 'RUNNING',
            startedAt: new Date().toISOString(),
            completedAt: null,
            durationMillis: null,
            startedBy: null,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      };
      const completedPage: WorkflowExecutionPage = {
        ...runningPage,
        items: [
          {
            ...runningPage.items[0]!,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            durationMillis: 1000,
          },
        ],
      };
      vi.mocked(workflowApi.listWorkflowExecutions)
        .mockResolvedValueOnce(runningPage)
        .mockResolvedValue(completedPage);

      vi.useFakeTimers();
      try {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(screen.getByRole('button', { name: 'run-77' })).toBeInTheDocument();
        expect(workflowApi.getWorkflowExecution).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });

        expect(workflowApi.getWorkflowExecution).not.toHaveBeenCalled();
        const row = screen.getByRole('button', { name: 'run-77' }).closest('tr')!;
        expect(row).toHaveTextContent('Completed');
      } finally {
        vi.useRealTimers();
      }
    });

    it('never renders a fabricated RUNNING status when a COMPLETED run is opened from the history list', async () => {
      vi.mocked(workflowApi.listWorkflowExecutions).mockResolvedValue({
        items: [
          {
            runId: 'run-88',
            workflowId: 'wf-1',
            status: 'COMPLETED',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMillis: 1000,
            startedBy: 'alice',
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      });
      let resolveDetail!: (run: AgentRun) => void;
      vi.mocked(workflowApi.getWorkflowExecution).mockReturnValue(
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
      );

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={WORKFLOW} runId={null} />));
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'run-88' }));
      });

      expect(screen.queryByText('Running')).not.toBeInTheDocument();
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);

      await act(async () => {
        resolveDetail(runWithStatus('COMPLETED', { runId: 'run-88' }));
      });

      expect(screen.queryByText('Running')).not.toBeInTheDocument();
    });

    it('does not fetch or render execution history when showHistory is false', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

      await act(async () => {
        render(
          withQueryClient(
            <WorkflowExecution workflow={WORKFLOW} runId="run-1" showHistory={false} />,
          ),
        );
      });

      expect(workflowApi.listWorkflowExecutions).not.toHaveBeenCalled();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(await screen.findByText('Requirement Agent')).toBeInTheDocument();
    });
  });
});
