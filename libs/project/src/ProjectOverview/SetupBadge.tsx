import type { Project } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { StatusChip } from '@openjcockpit/ui';
import { projectSetupStatus } from '../projectSetupStatus';

/**
 * Setup completeness from what the project list already carries. The spec folder needs its own
 * request per project, so it is left out here and shown on the Overview only.
 */
export function SetupBadge({ project }: { project: Project }) {
  const { t } = useTranslation('project');
  const { done, total } = projectSetupStatus(project);
  const complete = done === total;
  return (
    <StatusChip
      kind={complete ? 'ok' : 'waiting'}
      label={
        complete ? t('overview.badge.complete') : t('overview.badge.progress', { done, total })
      }
      data-testid="setup-badge"
    />
  );
}
