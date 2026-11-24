import { ApiError, apiRequest, apiRequestBlob, apiRequestVoid } from '../core/http';
import type {
  EvidenceExportFormat,
  EvidenceExportJob,
  EvidenceExportJobCreated,
  EvidenceExportRequest,
  EvidenceOutput,
  EvidenceRun,
  EvidenceRunPage,
} from './evidenceTypes';

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

const EXPORT_EXTENSION: Record<EvidenceExportFormat, string> = {
  json: 'json',
  csv: 'csv',
  markdown: 'md',
  pdf: 'pdf',
};

export interface EvidenceExportOptions {
  format: EvidenceExportFormat;
  /** Include agent outputs (json, markdown, pdf); the server ignores it for csv. Default false. */
  includeOutputs?: boolean;
}

/** A file ready to save: the server's filename, or `evidence-<runId>.<ext>` when it sent none. */
export interface EvidenceExportFile {
  blob: Blob;
  filename: string;
}

/** Synchronous download of one whole run (never a filtered view). 404 for a run of another project. */
export async function exportEvidenceRun(
  projectId: string,
  runId: string,
  { format, includeOutputs = false }: EvidenceExportOptions,
  signal?: AbortSignal,
): Promise<EvidenceExportFile> {
  const query = new URLSearchParams({ format, includeOutputs: String(includeOutputs) });
  const { blob, filename } = await apiRequestBlob(
    `${base(projectId)}/runs/${encodeURIComponent(runId)}/export?${query}`,
    { signal, errorMessage: 'Failed to export evidence run' },
  );
  return { blob, filename: filename ?? `evidence-${runId}.${EXPORT_EXTENSION[format]}` };
}

/** Starts an async export of all runs of a workflow, or of the project. Resolves with the job to poll. */
export function createEvidenceExport(
  projectId: string,
  request: EvidenceExportRequest,
  signal?: AbortSignal,
): Promise<EvidenceExportJobCreated> {
  return apiRequest(`${base(projectId)}/exports`, {
    method: 'POST',
    body: request,
    signal,
    errorMessage: (status) =>
      status === 429 ? 'Too many export jobs running' : 'Failed to start evidence export',
  });
}

/** Status and progress of an export job; 404 when the job is gone or not visible to the caller. */
export function getEvidenceExport(
  projectId: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<EvidenceExportJob> {
  return apiRequest(`${base(projectId)}/exports/${encodeURIComponent(jobId)}`, {
    signal,
    errorMessage: 'Failed to load evidence export',
  });
}

/** File of a finished job. 409 when it is not done yet, 410 when it has expired. */
export async function downloadEvidenceExport(
  projectId: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<EvidenceExportFile> {
  const { blob, filename } = await apiRequestBlob(
    `${base(projectId)}/exports/${encodeURIComponent(jobId)}/download`,
    {
      signal,
      errorMessage: (status) =>
        status === 410 ? 'The evidence export has expired' : 'Failed to download evidence export',
    },
  );
  return { blob, filename: filename ?? `evidence-${jobId}` };
}

/** Cancels a running job, or deletes a finished file. */
export function cancelEvidenceExport(
  projectId: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequestVoid(`${base(projectId)}/exports/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    signal,
    errorMessage: 'Failed to cancel evidence export',
  });
}
