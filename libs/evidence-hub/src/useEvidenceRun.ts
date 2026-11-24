import { useQuery } from '@tanstack/react-query';
import { loadEvidenceRun, queryKeys } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';

/** One run with its merged timeline. Page only: its route is behind `RequireProject`. */
export function useEvidenceRun(runId: string) {
  const projectId = useHubProject().selected?.id as string;
  return useQuery({
    queryKey: queryKeys.evidenceRun(projectId, runId),
    queryFn: ({ signal }) => loadEvidenceRun(projectId, runId, signal),
  });
}
