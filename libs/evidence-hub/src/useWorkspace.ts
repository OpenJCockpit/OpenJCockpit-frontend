import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { loadWorkspace, queryKeys } from '@openjcockpit/api';
import type { Workspace } from '@openjcockpit/api';
import { useHubProject, type HubProject } from '@openjcockpit/hub-contract';

/** Workspace of the selected project, on the cache entry the dashboard reads. Page only: its route is behind `RequireProject`. */
export function useWorkspace(): UseQueryResult<Workspace> {
  const selected = useHubProject().selected as HubProject;
  const customerId = selected.customerId ?? selected.id;
  return useQuery({
    queryKey: queryKeys.workspace(customerId),
    queryFn: ({ signal }) => loadWorkspace(customerId, signal),
  });
}
