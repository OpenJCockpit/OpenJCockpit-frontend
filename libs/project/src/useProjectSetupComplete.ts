import { useQuery } from '@tanstack/react-query';
import { getSpecInitStatus } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';
import { projectSetupStatus } from './projectSetupStatus';

/** Query shared with the setup checklist, so opening it right after costs no second request. */
export function specInitQueryKey(projectId: string) {
  return ['projects', projectId, 'spec-init-status'] as const;
}

/** True once every setup step of the selected project is done; false while loading or when unknown. */
export function useProjectSetupComplete(): boolean {
  const { selected } = useHubProject();
  const id = selected?.id ?? '';
  const specInit = useQuery({
    queryKey: specInitQueryKey(id),
    queryFn: ({ signal }) => getSpecInitStatus(id, signal),
    retry: false,
    enabled: id !== '',
  });
  if (!selected) return false;
  return projectSetupStatus(selected, specInit.isSuccess ? specInit.data : undefined).complete;
}
