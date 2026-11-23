import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getSpecInitStatus } from '@openjcockpit/api';
import {
  ADMIN_PERMISSION,
  PROJECT_SETTINGS_PATH,
  useCan,
  useSelectedProject,
} from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { StatusChip, formTitleClass, fieldHintClass } from '@openjcockpit/ui';
import { WithTranslations } from '../registerTranslations';
import { projectSetupStatus, type SetupItemState } from '../projectSetupStatus';
import { specInitQueryKey } from '../useProjectSetupComplete';
import styles from './ProjectOverview.module.scss';

const CHIP_KIND = { done: 'ok', todo: 'waiting', pending: 'review', unknown: 'neutral' } as const;

/** Rows that need admin rights to change; others stay readable for everyone on the project. */
const ADMIN_SECTIONS = ['general', 'repository'];

/** A checklist of what the selected project still needs, each row linking to the section that fixes it. */
export function ProjectOverview() {
  const { t } = useTranslation('project');
  const project = useSelectedProject();
  const isAdmin = useCan(ADMIN_PERMISSION);
  // A failed request (inactive project, Git unreachable) leaves the spec folder "unknown", not "todo".
  const specInit = useQuery({
    queryKey: specInitQueryKey(project.id),
    queryFn: ({ signal }) => getSpecInitStatus(project.id, signal),
    retry: false,
  });
  const status = projectSetupStatus(project, specInit.isSuccess ? specInit.data : undefined);

  return (
    <section aria-labelledby="project-overview-title">
      <h2 id="project-overview-title" className={formTitleClass}>
        {t('overview.title')}
      </h2>
      <p className={fieldHintClass} data-testid="overview-summary">
        {status.complete
          ? t('overview.complete')
          : t('overview.summary', { done: status.done, total: status.total })}
      </p>
      <ul className={styles.list}>
        {status.items.map((item) => {
          const label = t(`overview.items.${item.id}`);
          const linked = isAdmin || !ADMIN_SECTIONS.includes(item.sectionId);
          return (
            <li key={item.id} className={styles.row}>
              <StatusChip
                kind={CHIP_KIND[item.state]}
                label={t(`overview.state.${item.state satisfies SetupItemState}`)}
              />
              {linked ? (
                <Link to={`${PROJECT_SETTINGS_PATH}/${item.sectionId}`}>{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ProjectOverviewSection() {
  return (
    <WithTranslations>
      <ProjectOverview />
    </WithTranslations>
  );
}
