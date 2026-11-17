import type { RouteObject } from 'react-router';
import { RequireProject } from '@openjcockpit/hub-contract';
import { ControlTowerShell } from './ControlTowerShell/ControlTowerShell';
import { pageRoute, pages } from './pages';
import { WithTranslations } from './registerTranslations';
import { RepositoryGate } from './RepositoryGate/RepositoryGate';

/** Relative to the app route, which the host mounts as `/controltower/*`. Templates are global; the rest need a project and its repository. */
export const controltowerRoutes: RouteObject[] = [
  {
    element: (
      <WithTranslations>
        <ControlTowerShell />
      </WithTranslations>
    ),
    children: [
      ...pages.filter((page) => page.scope === 'global').map(pageRoute),
      {
        element: (
          <RequireProject>
            <RepositoryGate />
          </RequireProject>
        ),
        children: pages.filter((page) => page.scope === 'project').map(pageRoute),
      },
    ],
  },
];
