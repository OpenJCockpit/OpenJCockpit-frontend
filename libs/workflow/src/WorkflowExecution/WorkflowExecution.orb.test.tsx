import { act, screen, waitFor } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withQueryClient } from '../testUtils/queryClient';
import { WorkflowExecution } from './WorkflowExecution';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
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

  describe('workflow orb chain status', () => {
    it('keeps polling and does not call onRunEnded while AWAITING_CHILD_WORKFLOW', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_CHILD_WORKFLOW'),
      );
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
      expect(screen.getByText('Waiting for child workflow')).toBeInTheDocument();
    });

    it('stops polling and calls onRunEnded when the run reaches TIMED_OUT', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('TIMED_OUT'));
      const onRunEnded = vi.fn();

      await act(async () => {
        render(
          withQueryClient(
            <WorkflowExecution workflow={WORKFLOW} runId="run-1" onRunEnded={onRunEnded} />,
          ),
        );
      });

      await waitFor(() => expect(onRunEnded).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect(screen.getByText('Timed out')).toBeInTheDocument();
    });

    it('stops polling and calls onRunEnded when the run reaches BLOCKED', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('BLOCKED'));
      const onRunEnded = vi.fn();

      await act(async () => {
        render(
          withQueryClient(
            <WorkflowExecution workflow={WORKFLOW} runId="run-1" onRunEnded={onRunEnded} />,
          ),
        );
      });

      await waitFor(() => expect(onRunEnded).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('renders the latest workflow-orb event as plain selectable text with the child run id', async () => {
      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('RUNNING', {
          events: [
            {
              timestamp: new Date().toISOString(),
              agentId: 'workflow-orb',
              title: "Workflow 'Spec creation' started (SEQUENTIAL, run child-run-42)",
              status: 'RUNNING',
              evidenceRef: 'run://child-run-42',
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
      const childRunIdEl = await screen.findByText('child-run-42');
      expect(childRunIdEl.tagName).toBe('CODE');
    });

    it('announces only the latest waiting-for-child transition, not an accumulation of every poll tick', async () => {
      vi.mocked(workflowApi.getWorkflowExecution)
        .mockResolvedValueOnce(runWithStatus('RUNNING'))
        .mockResolvedValueOnce(runWithStatus('AWAITING_CHILD_WORKFLOW'))
        .mockResolvedValueOnce(runWithStatus('AWAITING_CHILD_WORKFLOW'))
        .mockResolvedValueOnce(runWithStatus('COMPLETED'));

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

      expect(screen.getByText(/No longer waiting/i)).toBeInTheDocument();
      expect(screen.queryAllByText(/Waiting for a triggered child workflow/i)).toHaveLength(0);
    });

    it('renders a workflow orb from workflow.workflowOrbs at its configured anchor, with a Running status derived from the run event stream', async () => {
      const workflowWithOrb: WorkflowDefinition = {
        ...WORKFLOW,
        workflowOrbs: [
          { workflowId: 'wf-child', mode: 'SEQUENTIAL', placementStage: 'requirement' },
        ],
      };

      vi.mocked(workflowApi.listWorkflows).mockResolvedValue([
        { ...WORKFLOW, id: 'wf-child', name: 'Spec Creation Child' },
      ]);

      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(
        runWithStatus('AWAITING_CHILD_WORKFLOW', {
          events: [
            {
              timestamp: 't1',
              agentId: 'requirement',
              title: 'x',
              status: 'RUNNING',
              evidenceRef: '',
            },
            {
              timestamp: 't2',
              agentId: 'workflow-orb',
              title: 'Started child workflow Spec Creation Child (SEQUENTIAL)',
              status: 'AWAITING_CHILD_WORKFLOW',
              evidenceRef: 'run://child-run-1',
            },
          ],
        }),
      );

      await act(async () => {
        render(withQueryClient(<WorkflowExecution workflow={workflowWithOrb} runId="run-1" />));
      });

      await waitFor(
        () => {
          const orbEl = screen.getByLabelText('Workflow orb: Spec Creation Child, sequential');
          expect(orbEl.textContent).toContain('Running');
          const names = Array.from(
            screen.getByLabelText('Agent pipeline sequence').querySelectorAll('strong'),
          ).map((el) => el.textContent);
          expect(names).toEqual(['Requirement Agent', 'Spec Creation Child', 'Evidence Agent']);
        },
        { timeout: 3000 },
      );
    });

    it('renders an orb with an unknown (non-blank) placementStage last, with a visible anchor-removed indicator, distinct from a blank-placementStage orb', async () => {
      const workflowWithOrphanedOrb: WorkflowDefinition = {
        ...WORKFLOW,
        workflowOrbs: [
          { workflowId: 'wf-child', mode: 'SEQUENTIAL', placementStage: 'implementation' },
        ],
      };

      vi.mocked(workflowApi.listWorkflows).mockResolvedValue([
        { ...WORKFLOW, id: 'wf-child', name: 'Spec Creation Child' },
      ]);

      vi.mocked(workflowApi.getWorkflowExecution).mockResolvedValue(runWithStatus('RUNNING'));

      await act(async () => {
        render(
          withQueryClient(<WorkflowExecution workflow={workflowWithOrphanedOrb} runId="run-1" />),
        );
      });

      await waitFor(
        () => {
          const orbEl = screen.getByLabelText('Workflow orb: Spec Creation Child, sequential');
          expect(orbEl.textContent).toContain('anchor stage removed');
          const names = Array.from(
            screen.getByLabelText('Agent pipeline sequence').querySelectorAll('strong'),
          ).map((el) => el.textContent);
          expect(names).toEqual(['Requirement Agent', 'Evidence Agent', 'Spec Creation Child']);
        },
        { timeout: 3000 },
      );
    });
  });
});
