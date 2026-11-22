import { useState } from 'react';
import { triggerGitCheck } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useProjectCache } from './projectCache';

/** Runs the Git check of one project and writes the result back into the cached lists. */
export function useGitCheck(projectId: string) {
  const { t } = useTranslation('project');
  const updateProjects = useProjectCache();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setChecking(true);
    setError(null);
    try {
      const status = await triggerGitCheck(projectId);
      updateProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                gitStatus: status.gitStatus,
                gitStatusCheckedAt: status.gitStatusCheckedAt,
                gitStatusMessage: status.gitStatusMessage,
              }
            : p,
        ),
      );
    } catch {
      setError(t('settings.errors.gitCheckFailed'));
    } finally {
      setChecking(false);
    }
  }

  return { checking, error, check };
}
