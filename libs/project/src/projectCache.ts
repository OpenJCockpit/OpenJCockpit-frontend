import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '@openjcockpit/api';

/** Every project, active or not (admins). The host's list of active projects is cached under ['projects']. */
export const ALL_PROJECTS_KEY = ['projects', 'all'];

/** Applies a change to the cached full list and refreshes the host's list of active projects. */
export function useProjectCache() {
  const queryClient = useQueryClient();
  return function updateProjects(update: (prev: Project[]) => Project[]) {
    queryClient.setQueryData<Project[]>(ALL_PROJECTS_KEY, (prev) => prev && update(prev));
    void queryClient.invalidateQueries({ queryKey: ['projects'], exact: true });
  };
}
