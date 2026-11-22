import { lazy, Suspense } from 'react';
import { useNavigate, type RouteObject } from 'react-router';
import {
  ADMIN_PERMISSION,
  PROJECTS_PATH,
  RequirePermission,
  useHubHeader,
} from '@openjcockpit/hub-contract';
import { HubPage, Panel, Skeleton } from '@openjcockpit/ui';
import { ProjectsPage } from './ProjectsPage/ProjectsPage';
import styles from './projectsRoutes.module.scss';
import { WithTranslations } from './registerTranslations';

const ProjectWizard = lazy(() => import('./ProjectWizard/ProjectWizard'));

/** Keeps the page chrome on screen while the wizard chunk (and its translations) load, instead of a blank page. */
function WizardFallback() {
  const navigate = useNavigate();
  const header = useHubHeader();
  return (
    <HubPage
      eyebrow={<Skeleton width="80px" height="14px" />}
      title={<Skeleton width="180px" height="32px" />}
      header={header}
      onBack={() => void navigate(PROJECTS_PATH)}
    >
      <Panel as="section" aria-busy="true" className={styles.fallbackPanel} />
    </HubPage>
  );
}

/** Relative to the app route, which the host mounts as `/projects/*`. */
export const projectsRoutes: RouteObject[] = [
  {
    index: true,
    element: (
      <WithTranslations>
        <ProjectsPage />
      </WithTranslations>
    ),
  },
  {
    path: 'new',
    element: (
      <RequirePermission any={[ADMIN_PERMISSION]}>
        <Suspense fallback={<WizardFallback />}>
          <ProjectWizard />
        </Suspense>
      </RequirePermission>
    ),
  },
];
