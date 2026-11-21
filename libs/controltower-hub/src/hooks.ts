import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  getControlTowerGraph,
  getControlTowerInterview,
  getControlTowerProjectByCockpitProject,
  getControlTowerQueueProposal,
  getControlTowerSettings,
  listControlTowerInterviews,
  listControlTowerSpecTemplates,
  listControlTowerSpecs,
  listControlTowerTemplates,
  queryKeys,
  reconcileControlTowerSpecs,
} from '@openjcockpit/api';
import type {
  ControlTowerGraph,
  ControlTowerInterview,
  ControlTowerProject,
  ControlTowerQueueCandidate,
  ControlTowerSettingsView,
  ControlTowerSpec,
  ControlTowerSpecTemplate,
  ControlTowerTemplate,
} from '@openjcockpit/api';
import { useHubProject, useSelectedProject } from '@openjcockpit/hub-contract';

function useRepositoryQuery(
  cockpitProjectId: string | null,
): UseQueryResult<ControlTowerProject | null> {
  return useQuery({
    queryKey: queryKeys.controlTowerProject(cockpitProjectId),
    queryFn: ({ signal }) =>
      getControlTowerProjectByCockpitProject(cockpitProjectId as string, signal),
    enabled: cockpitProjectId !== null,
  });
}

/** The ControlTower repository linked to the selected Cockpit project; `null` data means none is linked. */
export function useControlTowerRepository(): UseQueryResult<ControlTowerProject | null> {
  return useRepositoryQuery(useSelectedProject().id);
}

/** Like `useControlTowerRepository`, but for places that can render without a selected project (home widgets). The query stays idle then. */
export function useOptionalControlTowerRepository(): UseQueryResult<ControlTowerProject | null> {
  return useRepositoryQuery(useHubProject().selected?.id ?? null);
}

export function useTemplates(): UseQueryResult<ControlTowerTemplate[]> {
  return useQuery({
    queryKey: queryKeys.controlTowerTemplates,
    queryFn: ({ signal }) => listControlTowerTemplates(signal),
  });
}

export function useSpecTemplates(): UseQueryResult<ControlTowerSpecTemplate[]> {
  return useQuery({
    queryKey: queryKeys.controlTowerSpecTemplates,
    queryFn: ({ signal }) => listControlTowerSpecTemplates(signal),
  });
}

export function useInterviews(repositoryId: string): UseQueryResult<ControlTowerInterview[]> {
  return useQuery({
    queryKey: queryKeys.controlTowerInterviews(repositoryId),
    queryFn: ({ signal }) => listControlTowerInterviews(repositoryId, signal),
  });
}

export function useInterview(interviewId: string): UseQueryResult<ControlTowerInterview> {
  return useQuery({
    queryKey: queryKeys.controlTowerInterview(interviewId),
    queryFn: ({ signal }) => getControlTowerInterview(interviewId, signal),
  });
}

export function useSpecs(repositoryId: string): UseQueryResult<ControlTowerSpec[]> {
  return useQuery({
    queryKey: queryKeys.controlTowerSpecs(repositoryId),
    queryFn: ({ signal }) => listControlTowerSpecs(repositoryId, signal),
  });
}

export function useGraph(repositoryId: string): UseQueryResult<ControlTowerGraph> {
  return useQuery({
    queryKey: queryKeys.controlTowerGraph(repositoryId),
    queryFn: ({ signal }) => getControlTowerGraph(repositoryId, signal),
  });
}

export function useQueueProposal(
  repositoryId: string | null,
): UseQueryResult<ControlTowerQueueCandidate[]> {
  return useQuery({
    queryKey: queryKeys.controlTowerQueue(repositoryId),
    queryFn: ({ signal }) => getControlTowerQueueProposal(repositoryId as string, signal),
    enabled: repositoryId !== null,
  });
}

export function useControlTowerSettings(): UseQueryResult<ControlTowerSettingsView> {
  return useQuery({
    queryKey: queryKeys.controlTowerSettings,
    queryFn: ({ signal }) => getControlTowerSettings(signal),
  });
}

function useControlTowerMutation<TData, TVariables>(
  scopeKey: readonly string[],
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  const client = useQueryClient();
  return useMutation({
    // Not passed on as is: the library adds a second argument, which request functions with optional parameters would take.
    mutationFn: (variables: TVariables) => mutationFn(variables),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: scopeKey });
    },
  });
}

/** A mutation that refreshes everything of one repository afterwards: an approval changes the specs, the graph and the queue. */
export function useRepositoryMutation<TData, TVariables>(
  repositoryId: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  return useControlTowerMutation(['controltower', repositoryId], mutationFn);
}

/** A mutation on data that is not tied to a repository (templates, policy, the repository link). Refreshes all ControlTower queries. */
export function useGlobalMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  return useControlTowerMutation(['controltower'], mutationFn);
}

export interface ControlTowerCounts {
  drafts: number;
  approved: number;
  dispatched: number;
  done: number;
  /** Specs the queue proposes for dispatch. */
  ready: number;
  interviews: number;
  /** Interviews still being answered. */
  activeInterviews: number;
  /** Finished interviews whose specs are not generated yet. */
  completeInterviews: number;
  templates: number;
}

/** Counts for badges and the overview. Each field is `undefined` until its query has loaded. Reuses the page queries, so it adds no requests. */
export function useControlTowerCounts(repositoryId: string): {
  [K in keyof ControlTowerCounts]: ControlTowerCounts[K] | undefined;
} {
  const specs = useSpecs(repositoryId).data;
  const ready = useQueueProposal(repositoryId).data;
  const interviews = useInterviews(repositoryId).data;
  const templates = useTemplates().data;
  const countStatus = (status: string) => specs?.filter((s) => s.status === status).length;
  return {
    drafts: countStatus('DRAFT'),
    approved: countStatus('APPROVED'),
    dispatched: countStatus('DISPATCHED'),
    done: countStatus('DONE'),
    ready: ready?.length,
    interviews: interviews?.length,
    activeInterviews: interviews?.filter((i) => i.status === 'ACTIVE').length,
    completeInterviews: interviews?.filter((i) => i.status === 'COMPLETE').length,
    templates: templates?.length,
  };
}

/** How often dispatched specs are checked against OpenJCockpit while a Control Tower page is open. */
export const RECONCILE_INTERVAL_MS = 30_000;

/**
 * While specs are waiting on OpenJCockpit, asks the backend now and then whether their queue items have finished.
 * Specs it marks DONE refresh the repository's data. Checks pause while the tab is hidden, and a failure is ignored:
 * "Mark done manually" stays as the fallback.
 */
export function useReconcileDispatched(repositoryId: string, enabled: boolean): void {
  const client = useQueryClient();
  const hasDispatched = useSpecs(repositoryId).data?.some((s) => s.status === 'DISPATCHED');
  useEffect(() => {
    if (!enabled || !hasDispatched) return;
    let inFlight = false;
    const check = () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      reconcileControlTowerSpecs(repositoryId)
        .then(
          (changed) =>
            changed.length > 0
              ? client.invalidateQueries({ queryKey: ['controltower', repositoryId] })
              : undefined,
          () => undefined,
        )
        .finally(() => {
          inFlight = false;
        });
    };
    check();
    const timer = setInterval(check, RECONCILE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, hasDispatched, repositoryId, client]);
}
