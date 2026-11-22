import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { ADMIN_PERMISSION, RequirePermission } from '@openjcockpit/hub-contract';
import { ProjectsPage } from './ProjectsPage/ProjectsPage';
import { WithTranslations } from './registerTranslations';

const ProjectWizard = lazy(() => import('./ProjectWizard/ProjectWizard'));

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
        <Suspense fallback={null}>
          <ProjectWizard />
        </Suspense>
      </RequirePermission>
    ),
  },
];
