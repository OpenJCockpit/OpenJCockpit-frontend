import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ApiError,
  cancelEvidenceExport,
  createEvidenceExport,
  downloadEvidenceExport,
  getEvidenceExport,
  queryKeys,
} from '@openjcockpit/api';
import type { EvidenceExportFormat, EvidenceExportProgress } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';
import { saveBlob } from './saveBlob';

export const EXPORT_POLL_MS = 1000;

export type ExportErrorKind = 'failed' | 'expired' | 'tooManyJobs';

export interface EvidenceExportJobOptions {
  format: EvidenceExportFormat;
  includeOutputs: boolean;
  /** ISO date-time bounds; both optional. */
  from?: string;
  to?: string;
}

const storageKey = (projectId: string) => `evidence-export-job:${projectId}`;
const readJobId = (projectId: string) => {
  try {
    return sessionStorage.getItem(storageKey(projectId));
  } catch {
    return null;
  }
};
const writeJobId = (projectId: string, jobId: string | null) => {
  try {
    if (jobId) sessionStorage.setItem(storageKey(projectId), jobId);
    else sessionStorage.removeItem(storageKey(projectId));
  } catch {
    // storage unavailable: the job still works, it just cannot resume after a reload
  }
};

/**
 * Async export of all runs of a workflow, or of the project: creates the job, polls it, saves the
 * file once when it is done. The active job id survives a reload (`sessionStorage`, one per project).
 * Polling stops on done, failed, cancelled and on unmount. Page only (behind `RequireProject`).
 */
export function useEvidenceExportJob(workflowId?: string) {
  const projectId = useHubProject().selected?.id as string;
  const [jobId, setJobId] = useState<string | null>(() => readJobId(projectId));
  const [error, setError] = useState<ExportErrorKind | null>(null);

  const track = useCallback(
    (id: string | null) => {
      writeJobId(projectId, id);
      setJobId(id);
    },
    [projectId],
  );

  const create = useMutation({
    mutationFn: (options: EvidenceExportJobOptions) =>
      createEvidenceExport(projectId, {
        scope: workflowId ? 'workflow' : 'project',
        workflowId: workflowId ?? null,
        format: options.format,
        includeOutputs: options.includeOutputs,
        from: options.from ?? null,
        to: options.to ?? null,
      }),
    onMutate: () => setError(null),
    onSuccess: (job) => track(job.jobId),
    onError: (e) => setError(e instanceof ApiError && e.status === 429 ? 'tooManyJobs' : 'failed'),
  });

  const status = useQuery({
    queryKey: queryKeys.evidenceExport(projectId, jobId ?? ''),
    enabled: !!jobId,
    retry: false,
    queryFn: ({ signal }) => getEvidenceExport(projectId, jobId as string, signal),
    refetchInterval: (query) => {
      const current = query.state.data?.status;
      return current === 'queued' || current === 'running' || current === undefined
        ? EXPORT_POLL_MS
        : false;
    },
  });
  const state = status.data?.status;

  // A job that is gone (404), failed or cancelled elsewhere has ended: nothing left to resume.
  const ended = !!jobId && (status.isError || state === 'failed' || state === 'cancelled');
  useEffect(() => {
    if (ended) writeJobId(projectId, null);
  }, [ended, projectId]);

  // Download and save exactly once per job; clean up if the component goes away mid-download.
  const saved = useRef<string | null>(null);
  useEffect(() => {
    if (!jobId || state !== 'done' || saved.current === jobId) return;
    saved.current = jobId;
    const controller = new AbortController();
    downloadEvidenceExport(projectId, jobId, controller.signal)
      .then(({ blob, filename }) => {
        saveBlob(blob, filename);
        track(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof ApiError && e.status === 410 ? 'expired' : 'failed');
        track(null);
      });
    return () => {
      controller.abort();
      saved.current = null;
    };
  }, [jobId, state, projectId, track]);

  const cancel = useMutation({
    mutationFn: (id: string) => cancelEvidenceExport(projectId, id),
    onSettled: () => track(null),
  });

  const progress: EvidenceExportProgress | undefined = status.data?.progress;
  const running = create.isPending || (!!jobId && !ended);
  const endedInError = ended && state !== 'cancelled';

  return {
    start: (options: EvidenceExportJobOptions) => create.mutate(options),
    cancel: () => {
      // The cancel button only renders with progress, which needs a job id: the empty case is unreachable.
      /* v8 ignore next -- @preserve */
      if (jobId) cancel.mutate(jobId);
    },
    running,
    progress: running && jobId ? progress : undefined,
    error: error ?? (endedInError ? ('failed' as const) : null),
  };
}
