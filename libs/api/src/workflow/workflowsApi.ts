import { apiRequest, apiRequestVoid } from '../core/http';
import type {
  WorkflowDefinition,
  WorkflowExportBundle,
  WorkflowGroup,
  WorkflowImportResult,
  WorkflowStartInput,
  WorkflowStartResponse,
} from './workflowTypes';

// ── Workflows ────────────────────────────────────────────────────────────

export function listWorkflows(signal?: AbortSignal): Promise<WorkflowDefinition[]> {
  return apiRequest('/api/workflows', { signal, errorMessage: 'Failed to load workflows' });
}

export function getWorkflow(id: string): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows/${id}`, {
    errorMessage: 'Failed to load workflow',
  });
}

export function createWorkflow(request: WorkflowDefinition): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to create workflow',
  });
}

export function updateWorkflow(
  id: string,
  request: WorkflowDefinition,
): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows/${id}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to update workflow',
  });
}

export function deleteWorkflow(id: string): Promise<void> {
  return apiRequestVoid(`/api/workflows/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete workflow',
  });
}

export function startWorkflow(
  id: string,
  input: WorkflowStartInput = {},
): Promise<WorkflowStartResponse> {
  return apiRequest(`/api/workflows/${id}/start`, {
    method: 'POST',
    body: input,
    errorMessage: 'Failed to start workflow',
  });
}

// ── Workflow groups & export/import ──────────────────────────────────────

export function listWorkflowGroups(signal?: AbortSignal): Promise<WorkflowGroup[]> {
  return apiRequest('/api/workflow-groups', {
    signal,
    errorMessage: 'Failed to load workflow groups',
  });
}

export function createWorkflowGroup(request: WorkflowGroup): Promise<WorkflowGroup> {
  return apiRequest(`/api/workflow-groups`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to create workflow group',
  });
}

export function updateWorkflowGroup(id: string, request: WorkflowGroup): Promise<WorkflowGroup> {
  return apiRequest(`/api/workflow-groups/${id}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to update workflow group',
  });
}

export function deleteWorkflowGroup(id: string): Promise<void> {
  return apiRequestVoid(`/api/workflow-groups/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete workflow group',
  });
}

export function exportWorkflows(): Promise<WorkflowExportBundle> {
  return apiRequest(`/api/workflows/export`, {
    errorMessage: 'Failed to export workflows',
  });
}

export function importWorkflows(bundle: WorkflowExportBundle): Promise<WorkflowImportResult> {
  return apiRequest(`/api/workflows/import`, {
    method: 'POST',
    body: bundle,
    errorMessage: 'Failed to import workflows',
  });
}
