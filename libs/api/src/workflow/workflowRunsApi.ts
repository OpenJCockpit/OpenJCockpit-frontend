import { apiRequest } from '../core/http';
import type {
  ApprovalDecisionAuditEntry,
  ApprovalDecisionRequest,
  ApprovalDecisionResult,
  ApprovalGateContext,
  DecisionLogFilter,
  PolicyDecisionAuditEntry,
  WorkflowExecutionPage,
} from './workflowTypes';
import type { AgentRun } from '../types/types';

// ── Decision logs ────────────────────────────────────────────────────────

function decisionLogQuery(filter?: DecisionLogFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (filter.agentId) params.set('agentId', filter.agentId);
  if (filter.subagentId) params.set('subagentId', filter.subagentId);
  if (filter.skillId) params.set('skillId', filter.skillId);
  if (filter.mcpToolName) params.set('mcpToolName', filter.mcpToolName);
  if (filter.result) params.set('result', filter.result);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getWorkflowDecisionLogs(
  workflowId: string,
  filter?: DecisionLogFilter,
): Promise<PolicyDecisionAuditEntry[]> {
  return apiRequest(`/api/workflows/${workflowId}/decision-logs${decisionLogQuery(filter)}`, {
    errorMessage: 'Failed to load decision logs',
  });
}

export function getWorkflowExecutionDecisionLogs(
  workflowExecutionId: string,
  filter?: DecisionLogFilter,
): Promise<PolicyDecisionAuditEntry[]> {
  return apiRequest(
    `/api/workflow-executions/${workflowExecutionId}/decision-logs${decisionLogQuery(filter)}`,
    {
      errorMessage: 'Failed to load decision logs',
    },
  );
}

// ── Human approval gate ──────────────────────────────────────────────────
// Throw-on-failure, deliberately never the listSkillSpecs swallow-to-mock idiom:
// a decision, its context, or its audit trail must never silently degrade into
// fabricated data.

export function getApprovalGateContext(runId: string): Promise<ApprovalGateContext> {
  return apiRequest(`/api/agent-runs/${runId}/approval-gate`, {
    errorMessage: 'Failed to load the approval gate',
  });
}

export function submitApprovalDecision(
  runId: string,
  request: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResult> {
  return apiRequest(`/api/agent-runs/${runId}/approval-gate/decision`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to submit the approval decision',
  });
}

export function listApprovalDecisions(runId: string): Promise<ApprovalDecisionAuditEntry[]> {
  return apiRequest(`/api/agent-runs/${runId}/approval-decisions`, {
    errorMessage: 'Failed to load approval decisions',
  });
}

// ── Workflow execution history ───────────────────────────────────────────
// Throw-on-failure, deliberately never the listWorkflows swallow-to-[] idiom:
// a downstream failure must never silently look like "zero executions".

export function listWorkflowExecutions(
  workflowId: string,
  params?: { limit?: number; offset?: number },
): Promise<WorkflowExecutionPage> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return apiRequest(
    `/api/workflows/${workflowId}/executions${queryString ? `?${queryString}` : ''}`,
    {
      errorMessage: 'Failed to load workflow executions',
    },
  );
}

export function getWorkflowExecution(workflowId: string, runId: string): Promise<AgentRun> {
  return apiRequest(`/api/workflows/${workflowId}/executions/${runId}`, {
    errorMessage: 'Failed to load workflow execution',
  });
}
