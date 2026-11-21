import { apiRequest, apiRequestVoid } from '../core/http';
import type {
  ControlTowerConnectionCheckRequest,
  ControlTowerConnectionCheckResult,
  ControlTowerCreateSpecTemplate,
  ControlTowerCreateTemplate,
  ControlTowerCreateInterview,
  ControlTowerDispatchOutcome,
  ControlTowerGraph,
  ControlTowerInterview,
  ControlTowerPolicySettings,
  ControlTowerPolicyStatus,
  ControlTowerProject,
  ControlTowerProjectRequest,
  ControlTowerQueueCandidate,
  ControlTowerSettingsView,
  ControlTowerSpec,
  ControlTowerSpecGenerationRequest,
  ControlTowerSpecTemplate,
  ControlTowerTemplate,
} from './controltowerTypes';

/**
 * Same-origin prefix of the ControlTower backend. The host nginx and the Vite dev proxy rewrite
 * `/controltower-api/` to the backend's `/api/`, because both backends use `/api/projects`.
 */
export const CONTROLTOWER_API_PREFIX = '/controltower-api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

function request<T>(
  path: string,
  method: Method,
  errorMessage: string | ((status: number) => string),
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest(`${CONTROLTOWER_API_PREFIX}${path}`, { method, body, signal, errorMessage });
}

function id(value: string): string {
  return encodeURIComponent(value);
}

// --- Repositories ---

export function listControlTowerProjects(signal?: AbortSignal): Promise<ControlTowerProject[]> {
  return request('/projects', 'GET', 'Failed to load the repositories', undefined, signal);
}

/** The repository linked to a Cockpit project, or `null` when it has none (at most one exists). */
export async function getControlTowerProjectByCockpitProject(
  cockpitProjectId: string,
  signal?: AbortSignal,
): Promise<ControlTowerProject | null> {
  const projects = await request<ControlTowerProject[]>(
    `/projects?cockpitProjectId=${id(cockpitProjectId)}`,
    'GET',
    'Failed to load the repository',
    undefined,
    signal,
  );
  return projects[0] ?? null;
}

export function createControlTowerProject(
  body: ControlTowerProjectRequest,
): Promise<ControlTowerProject> {
  return request('/projects', 'POST', 'Failed to add the repository', body);
}

export function updateControlTowerProject(
  projectId: string,
  body: ControlTowerProjectRequest,
): Promise<ControlTowerProject> {
  return request(`/projects/${id(projectId)}`, 'PUT', 'Failed to save the repository', body);
}

export function checkControlTowerConnection(
  body: ControlTowerConnectionCheckRequest,
): Promise<ControlTowerConnectionCheckResult> {
  return request('/projects/connection-check', 'POST', 'Failed to check the connection', body);
}

// --- Templates ---

export function listControlTowerTemplates(signal?: AbortSignal): Promise<ControlTowerTemplate[]> {
  return request('/templates', 'GET', 'Failed to load the interview templates', undefined, signal);
}

export function createControlTowerTemplate(
  body: ControlTowerCreateTemplate,
): Promise<ControlTowerTemplate> {
  return request('/templates', 'POST', 'Failed to save the interview template', body);
}

export function updateControlTowerTemplate(
  templateId: string,
  body: ControlTowerCreateTemplate,
): Promise<ControlTowerTemplate> {
  return request(
    `/templates/${id(templateId)}`,
    'PUT',
    'Failed to save the interview template',
    body,
  );
}

export function deleteControlTowerTemplate(templateId: string): Promise<void> {
  return apiRequestVoid(`${CONTROLTOWER_API_PREFIX}/templates/${id(templateId)}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete the interview template',
  });
}

export function listControlTowerSpecTemplates(
  signal?: AbortSignal,
): Promise<ControlTowerSpecTemplate[]> {
  return request('/spec-templates', 'GET', 'Failed to load the spec templates', undefined, signal);
}

export function createControlTowerSpecTemplate(
  body: ControlTowerCreateSpecTemplate,
): Promise<ControlTowerSpecTemplate> {
  return request('/spec-templates', 'POST', 'Failed to save the spec template', body);
}

// --- Interviews ---

export function listControlTowerInterviews(
  projectId: string,
  signal?: AbortSignal,
): Promise<ControlTowerInterview[]> {
  return request(
    `/projects/${id(projectId)}/interviews`,
    'GET',
    'Failed to load the interviews',
    undefined,
    signal,
  );
}

export function getControlTowerInterview(
  interviewId: string,
  signal?: AbortSignal,
): Promise<ControlTowerInterview> {
  return request(
    `/interviews/${id(interviewId)}`,
    'GET',
    'Failed to load the interview',
    undefined,
    signal,
  );
}

export function startControlTowerInterview(
  body: ControlTowerCreateInterview,
): Promise<ControlTowerInterview> {
  return request('/interviews', 'POST', 'Failed to start the interview', body);
}

export function answerControlTowerInterview(
  interviewId: string,
  answer: string,
): Promise<ControlTowerInterview> {
  return request(`/interviews/${id(interviewId)}/answers`, 'POST', 'Failed to send the answer', {
    answer,
  });
}

export function generateControlTowerSpecs(
  interviewId: string,
  body?: ControlTowerSpecGenerationRequest,
): Promise<ControlTowerSpec[]> {
  return request(
    `/interviews/${id(interviewId)}/generate`,
    'POST',
    'Failed to generate the specifications',
    body,
  );
}

// --- Specifications and graph ---

export function listControlTowerSpecs(
  projectId: string,
  signal?: AbortSignal,
): Promise<ControlTowerSpec[]> {
  return request(
    `/projects/${id(projectId)}/specs`,
    'GET',
    'Failed to load the specifications',
    undefined,
    signal,
  );
}

/** Pushes the spec files to a new Git branch; a failed Git job answers 409 with its reason. */
export function approveControlTowerSpec(specId: string): Promise<ControlTowerSpec> {
  return request(`/specs/${id(specId)}/approve`, 'POST', 'Failed to approve the spec');
}

export function completeControlTowerSpec(specId: string): Promise<ControlTowerSpec> {
  return request(`/specs/${id(specId)}/complete`, 'POST', 'Failed to mark the spec as done');
}

export function getControlTowerGraph(
  projectId: string,
  signal?: AbortSignal,
): Promise<ControlTowerGraph> {
  return request(
    `/projects/${id(projectId)}/graph`,
    'GET',
    'Failed to load the dependency graph',
    undefined,
    signal,
  );
}

// --- Dispatch queue ---

export function getControlTowerQueueProposal(
  projectId: string,
  signal?: AbortSignal,
): Promise<ControlTowerQueueCandidate[]> {
  return request(
    `/projects/${id(projectId)}/queue/proposal`,
    'GET',
    'Failed to load the dispatch queue',
    undefined,
    signal,
  );
}

/** Asks the backend to mark dispatched specs DONE when OpenJCockpit reports their queue item finished; answers the specs that changed. */
export function reconcileControlTowerSpecs(projectId: string): Promise<ControlTowerSpec[]> {
  return request(
    `/projects/${id(projectId)}/queue/reconcile`,
    'POST',
    'Failed to check the dispatched specs',
  );
}

export function dispatchControlTowerSpecs(
  projectId: string,
  repositoryPublished: boolean,
): Promise<ControlTowerDispatchOutcome[]> {
  return request(`/projects/${id(projectId)}/queue/dispatch`, 'POST', 'Failed to dispatch', {
    repositoryPublished,
  });
}

// --- Settings (policy) ---

export function getControlTowerSettings(signal?: AbortSignal): Promise<ControlTowerSettingsView> {
  return request('/settings', 'GET', 'Failed to load the settings', undefined, signal);
}

export function saveControlTowerPolicy(
  body: ControlTowerPolicySettings,
): Promise<ControlTowerPolicySettings> {
  return request('/settings/policy', 'PUT', 'Failed to save the policy settings', body);
}

export function testControlTowerPolicy(
  body: ControlTowerPolicySettings,
): Promise<ControlTowerPolicyStatus> {
  return request('/settings/policy/test', 'POST', 'Failed to test the policy settings', body);
}
