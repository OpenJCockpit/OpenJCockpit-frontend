import type { RouteObject } from 'react-router';
import { RequireProject } from '@openjcockpit/hub-contract';
import { ControlTowerShell } from './ControlTowerShell';
import { GraphPage } from './pages/GraphPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { OverviewPage } from './pages/OverviewPage';
import { QueuePage } from './pages/QueuePage';
import { SpecsPage } from './pages/SpecsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { WithTranslations } from './registerTranslations';
import { RepositoryGate } from './RepositoryGate';

/** Relative to the app route, which the host mounts as `/controltower/*`. Templates are global; the rest need a project and its repository. */
export const controltowerRoutes: RouteObject[] = [
  {
    element: (
      <WithTranslations>
        <ControlTowerShell />
      </WithTranslations>
    ),
    children: [
      { path: 'templates', element: <TemplatesPage /> },
      {
        element: (
          <RequireProject>
            <RepositoryGate />
          </RequireProject>
        ),
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'interviews', element: <InterviewsPage /> },
          { path: 'specs', element: <SpecsPage /> },
          { path: 'graph', element: <GraphPage /> },
          { path: 'queue', element: <QueuePage /> },
        ],
      },
    ],
  },
];
