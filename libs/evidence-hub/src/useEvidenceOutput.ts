import { useQuery } from '@tanstack/react-query';
import { loadEvidenceOutput, queryKeys } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';

/** Full output of one agent, fetched only once its row is expanded. Page only (behind `RequireProject`). */
export function useEvidenceOutput(
  runId: string,
  agentKey: string | null | undefined,
  open: boolean,
) {
  const projectId = useHubProject().selected?.id as string;
  return useQuery({
    queryKey: queryKeys.evidenceOutput(projectId, runId, agentKey ?? ''),
    queryFn: ({ signal }) => loadEvidenceOutput(projectId, runId, agentKey as string, signal),
    enabled: open && !!agentKey,
  });
}
