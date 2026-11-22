import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  activateProject,
  deactivateProject,
  isAbortError,
  loadAllProjects,
} from '@openjcockpit/api';
import type { Project } from '@openjcockpit/api';
import { ADMIN_PERMISSION, useCan, useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { ALL_PROJECTS_KEY, useProjectCache } from './projectCache';

/**
 * The projects the signed-in user may see: admins get every project (inactive ones too) and can switch
 * them on and off; everyone else gets the host's list of active projects.
 */
export function useProjectList() {
  const { t } = useTranslation('project');
  const isAdmin = useCan(ADMIN_PERMISSION);
  const { projects: active } = useHubProject();
  const updateProjects = useProjectCache();
  const query = useQuery({
    queryKey: ALL_PROJECTS_KEY,
    enabled: isAdmin,
    queryFn: async ({ signal }) => {
      try {
        return await loadAllProjects(signal);
      } catch (err) {
        if (!isAbortError(err)) console.error(err);
        throw err;
      }
    },
  });
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(project: Project) {
    setError(null);
    const next = project.active === 1 ? 0 : 1;
    try {
      await (next === 0 ? deactivateProject(project.id) : activateProject(project.id));
      updateProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, active: next } : p)));
    } catch {
      setError(t('settings.errors.statusChangeFailed'));
    }
  }

  return {
    isAdmin,
    projects: isAdmin ? (query.data ?? []) : active,
    // A failed load keeps the loading message, as before.
    loaded: !isAdmin || query.data !== undefined,
    error,
    toggleActive,
  };
}
