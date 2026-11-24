import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { loadLatestEvidenceRun, queryKeys } from '@openjcockpit/api';
import type { EvidenceRun } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';

/** Latest run of the selected project; `null` data means it has no run yet. Disabled without a project. */
export function useLatestEvidence(): UseQueryResult<EvidenceRun | null> & { hasProject: boolean } {
  const projectId = useHubProject().selected?.id ?? null;
  const query = useQuery({
    queryKey: queryKeys.evidenceLatest(projectId ?? ''),
    queryFn: ({ signal }) => loadLatestEvidenceRun(projectId as string, signal),
    enabled: projectId !== null,
  });
  return Object.assign(query, { hasProject: projectId !== null });
}
