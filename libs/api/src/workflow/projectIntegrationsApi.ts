import { apiRequest, apiRequestVoid } from '../core/http';
import type {
  DocumentFolderConfig,
  DocumentFolderConfigRequest,
  HermesConfig,
  HermesConfigRequest,
  JiraConfig,
  JiraConfigRequest,
} from './workflowTypes';

// ── Project integration config ───────────────────────────────────────────

export function getHermesConfig(projectId: string): Promise<HermesConfig> {
  return apiRequest(`/api/projects/${projectId}/hermes-config`, {
    errorMessage: 'Failed to load Hermes config',
  });
}

export function saveHermesConfig(
  projectId: string,
  request: HermesConfigRequest,
): Promise<HermesConfig> {
  return apiRequest(`/api/projects/${projectId}/hermes-config`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to save Hermes config',
  });
}

export function deleteHermesConfig(projectId: string): Promise<void> {
  return apiRequestVoid(`/api/projects/${projectId}/hermes-config`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete Hermes config',
  });
}

export function getJiraConfig(projectId: string): Promise<JiraConfig> {
  return apiRequest(`/api/projects/${projectId}/jira-config`, {
    errorMessage: 'Failed to load Jira config',
  });
}

export function saveJiraConfig(projectId: string, request: JiraConfigRequest): Promise<JiraConfig> {
  return apiRequest(`/api/projects/${projectId}/jira-config`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to save Jira config',
  });
}

export function deleteJiraConfig(projectId: string): Promise<void> {
  return apiRequestVoid(`/api/projects/${projectId}/jira-config`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete Jira config',
  });
}

export function getDocumentFolderConfig(projectId: string): Promise<DocumentFolderConfig> {
  return apiRequest(`/api/projects/${projectId}/document-folder-config`, {
    errorMessage: 'Failed to load document folder config',
  });
}

export function saveDocumentFolderConfig(
  projectId: string,
  request: DocumentFolderConfigRequest,
): Promise<DocumentFolderConfig> {
  return apiRequest(`/api/projects/${projectId}/document-folder-config`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to save document folder config',
  });
}

export function deleteDocumentFolderConfig(projectId: string): Promise<void> {
  return apiRequestVoid(`/api/projects/${projectId}/document-folder-config`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete document folder config',
  });
}
