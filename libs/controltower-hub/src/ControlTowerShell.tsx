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
import {
  CONTROLTOWER_GRAPH_PATH,
  CONTROLTOWER_INTERVIEWS_PATH,
  CONTROLTOWER_QUEUE_PATH,
  CONTROLTOWER_ROUTE,
  CONTROLTOWER_SPECS_PATH,
  CONTROLTOWER_TEMPLATES_PATH,
} from './routePaths';

const TABS = [
  { path: CONTROLTOWER_ROUTE, key: 'overview' },
  { path: CONTROLTOWER_INTERVIEWS_PATH, key: 'interviews' },
  { path: CONTROLTOWER_SPECS_PATH, key: 'specs' },
  { path: CONTROLTOWER_GRAPH_PATH, key: 'graph' },
  { path: CONTROLTOWER_QUEUE_PATH, key: 'queue' },
  { path: CONTROLTOWER_TEMPLATES_PATH, key: 'templates' },
] as const;

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
          {TABS.map(({ path, key }) => (
            <Tab
              key={key}
              type="button"
              active={pathname === path}
              aria-current={pathname === path ? 'page' : undefined}
              onClick={() => void navigate(path)}
            >
              {t(`tabs.${key}`)}
            </Tab>
          ))}
        </TabNav>
        <Outlet />
      </main>
    </AppShell>
  );
}
