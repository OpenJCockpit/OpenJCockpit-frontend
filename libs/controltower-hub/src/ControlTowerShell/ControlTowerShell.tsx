import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { DASHBOARD_PATH, useHubHeader } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  AppHeader,
  AppShell,
  Icon,
  IconBox,
  Tab,
  TabNav,
  pageClass,
  pageHeaderClass,
} from '@openjcockpit/ui';
import { pageUrl, pages } from '../pages';

/** Page chrome shared by every ControlTower page: the host header, the title and the page tabs. */
export function ControlTowerShell() {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const header = useHubHeader();
  const pathname = useLocation().pathname.replace(/\/+$/, '');

  return (
    <AppShell>
      {header ?? <AppHeader onBack={() => void navigate(DASHBOARD_PATH)} backTitle={t('back')} />}
      <main className={pageClass}>
        <div className={pageHeaderClass}>
          <div>
            <h1>
              <IconBox label={<Icon name="controltower" />} compact /> {t('title')}
            </h1>
            <p>{t('subtitle')}</p>
          </div>
        </div>
        <TabNav secondary aria-label={t('tabs.label')}>
          {pages.map((page) => {
            const path = pageUrl(page);
            return (
              <Tab
                key={page.tabKey}
                type="button"
                active={pathname === path}
                aria-current={pathname === path ? 'page' : undefined}
                onClick={() => void navigate(path)}
              >
                {t(`tabs.${page.tabKey}`)}
              </Tab>
            );
          })}
        </TabNav>
        <Suspense fallback={<p>{t('loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
    </AppShell>
  );
}
