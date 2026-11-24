import { ApiError, apiRequest } from '../core/http';
import type { EvidenceOutput, EvidenceRun, EvidenceRunPage } from './evidenceTypes';

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/evidence`;

/** Runs of a project, newest first. An empty `items` list means the project has no run yet. */
export function loadEvidenceRuns(
  projectId: string,
  params?: { limit?: number; offset?: number },
  signal?: AbortSignal,
): Promise<EvidenceRunPage> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return apiRequest(`${base(projectId)}/runs${queryString ? `?${queryString}` : ''}`, {
    signal,
    errorMessage: 'Failed to load evidence runs',
  });
}

/** Merged timeline of one run; the server answers 404 for a run of another project. */
export function loadEvidenceRun(
  projectId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<EvidenceRun> {
  return apiRequest(`${base(projectId)}/runs/${encodeURIComponent(runId)}`, {
    signal,
    errorMessage: 'Failed to load evidence run',
  });
}

/**
 * Timeline of the latest run, or `null` when the project has none (the server answers 404, which
 * is an empty state here, not a failure).
 */
export async function loadLatestEvidenceRun(
  projectId: string,
  signal?: AbortSignal,
): Promise<EvidenceRun | null> {
  try {
    return await apiRequest<EvidenceRun>(`${base(projectId)}/latest`, {
      signal,
      errorMessage: 'Failed to load latest evidence run',
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Full output of one agent, loaded on demand through an event's `outputRef`. */
export function loadEvidenceOutput(
  projectId: string,
  runId: string,
  agentKey: string,
  signal?: AbortSignal,
): Promise<EvidenceOutput> {
  return apiRequest(
    `${base(projectId)}/runs/${encodeURIComponent(runId)}/outputs/${encodeURIComponent(agentKey)}`,
    { signal, errorMessage: 'Failed to load agent output' },
  );
}
