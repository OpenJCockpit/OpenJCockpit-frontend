import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  getControlTowerGraph,
  getControlTowerProjectByCockpitProject,
  getControlTowerQueueProposal,
  getControlTowerSettings,
  listControlTowerInterviews,
  listControlTowerSpecTemplates,
  listControlTowerSpecs,
  listControlTowerTemplates,
  queryKeys,
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
import { useSelectedProject } from '@openjcockpit/hub-contract';

/** The ControlTower repository linked to the selected Cockpit project; `null` data means none is linked. */
export function useControlTowerRepository(): UseQueryResult<ControlTowerProject | null> {
  const project = useSelectedProject();
  return useQuery({
    queryKey: queryKeys.controlTowerProject(project.id),
    queryFn: ({ signal }) => getControlTowerProjectByCockpitProject(project.id, signal),
  });
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

/**
 * A mutation that refreshes everything of one repository afterwards: an approval changes the specs, the graph and the queue.
 * Pass `null` for data that is not tied to a repository.
 */
export function useRepositoryMutation<TData, TVariables>(
  repositoryId: string | null,
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  const client = useQueryClient();
  return useMutation({
    // Not passed on as is: the library adds a second argument, which request functions with optional parameters would take.
    mutationFn: (variables: TVariables) => mutationFn(variables),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: repositoryId ? ['controltower', repositoryId] : ['controltower'],
      });
    },
  });
}
