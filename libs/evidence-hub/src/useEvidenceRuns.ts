import { useInfiniteQuery } from '@tanstack/react-query';
import { loadEvidenceRuns, queryKeys } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';

export const RUNS_PAGE_SIZE = 20;

/** Runs of the selected project, newest first, loaded a page at a time. Page only: its route is behind `RequireProject`. */
export function useEvidenceRuns() {
  const projectId = useHubProject().selected?.id as string;
  return useInfiniteQuery({
    queryKey: queryKeys.evidenceRuns(projectId),
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      loadEvidenceRuns(projectId, { limit: RUNS_PAGE_SIZE, offset: pageParam }, signal),
    getNextPageParam: (last) =>
      last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined,
  });
}
