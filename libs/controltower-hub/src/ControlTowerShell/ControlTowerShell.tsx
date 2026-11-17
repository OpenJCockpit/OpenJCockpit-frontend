import { Suspense } from 'react';
import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router';
import { DASHBOARD_PATH, useHubHeader, useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  HubPage,
  Skeleton,
  StatusChip,
  StatusMessage,
  TabNav,
  cx,
  tabActiveClass,
  tabClass,
} from '@openjcockpit/ui';
import { useOptionalControlTowerRepository } from '../hooks';
import { pageUrl, pages } from '../pages';
import { CONTROLTOWER_REPOSITORY_SETTINGS_PATH, CONTROLTOWER_ROUTE } from '../routePaths';
import { ToastProvider } from '../ToastContext';
import { useWriteAccess } from '../useWriteAccess';
import { PageTabBadge } from './PageTabBadge';
import styles from './ControlTowerShell.module.scss';

/** Stands in for a lazy page or the repository lookup, shaped like a panel so the layout does not jump. */
function PageSkeleton() {
  const { t } = useTranslation('controltower');
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      <span className={styles.visuallyHidden}>{t('loading')}</span>
      <Skeleton width="40%" height="1.4em" />
      <Skeleton height="5em" />
      <Skeleton height="5em" />
    </div>
  );
}

/** Page chrome shared by every ControlTower page: the host header, the title and the page tabs. */
export function ControlTowerShell() {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const header = useHubHeader();
  const project = useHubProject().selected;
  const onOverview = useMatch(CONTROLTOWER_ROUTE) !== null;
  const repository = useOptionalControlTowerRepository().data;
  const repositoryId = repository?.id;
  const canWrite = useWriteAccess();

  return (
    <HubPage
      eyebrow={t('title')}
      title={project?.name}
      subtitle={onOverview ? <p>{t('subtitle')}</p> : undefined}
      header={header}
      onBack={() => void navigate(DASHBOARD_PATH)}
      backTitle={t('back')}
      tabs={
        <TabNav secondary aria-label={t('tabs.label')}>
          {pages.map((page) => (
            <NavLink
              key={page.tabKey}
              to={pageUrl(page)}
              end
              className={({ isActive }) =>
                cx(
                  tabClass,
                  isActive && tabActiveClass,
                  page.scope === 'global' && styles.globalTab,
                )
              }
            >
              {t(`tabs.${page.tabKey}`)}
              {repositoryId && <PageTabBadge tabKey={page.tabKey} repositoryId={repositoryId} />}
            </NavLink>
          ))}
        </TabNav>
      }
    >
      {repository && !onOverview && (
        <div className={styles.repository}>
          <StatusChip label={repository.name} kind="neutral" />
          <Link to={CONTROLTOWER_REPOSITORY_SETTINGS_PATH}>{t('repositorySettings')}</Link>
        </div>
      )}
      {!canWrite && !onOverview && <StatusMessage>{t('readOnly')}</StatusMessage>}
      <ToastProvider>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </ToastProvider>
    </HubPage>
  );
}
