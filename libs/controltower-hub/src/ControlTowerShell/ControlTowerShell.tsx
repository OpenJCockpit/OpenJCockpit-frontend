import { Suspense } from 'react';
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router';
import { DASHBOARD_PATH, useHubHeader, useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { HubPage, TabNav, cx, tabActiveClass, tabClass } from '@openjcockpit/ui';
import { useOptionalControlTowerRepository } from '../hooks';
import { pageUrl, pages } from '../pages';
import { CONTROLTOWER_ROUTE } from '../routePaths';
import { PageTabBadge } from './PageTabBadge';

/** Page chrome shared by every ControlTower page: the host header, the title and the page tabs. */
export function ControlTowerShell() {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const header = useHubHeader();
  const project = useHubProject().selected;
  const onOverview = useMatch(CONTROLTOWER_ROUTE) !== null;
  const repositoryId = useOptionalControlTowerRepository().data?.id;

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
              className={({ isActive }) => cx(tabClass, isActive && tabActiveClass)}
            >
              {t(`tabs.${page.tabKey}`)}
              {repositoryId && <PageTabBadge tabKey={page.tabKey} repositoryId={repositoryId} />}
            </NavLink>
          ))}
        </TabNav>
      }
    >
      <Suspense fallback={<p>{t('loading')}</p>}>
        <Outlet />
      </Suspense>
    </HubPage>
  );
}
