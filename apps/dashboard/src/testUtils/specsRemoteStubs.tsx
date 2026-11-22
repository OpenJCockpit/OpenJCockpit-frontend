import { Outlet } from 'react-router';
import {
  RequireProject,
  useHubHeader,
  useSelectedProject,
  type AppDefinition,
} from '@openjcockpit/hub-contract';
import type { RemoteApps } from '../federation/loadRemoteApps';

function Page({ testId, title }: { testId: string; title: string }) {
  const project = useSelectedProject();
  return (
    <section data-testid={testId}>
      {useHubHeader()}
      <h1>{title}</h1>
      <h2>{project.name}</h2>
    </section>
  );
}

function stub(id: string, route: `/${string}`, order: number, title: string): AppDefinition {
  return {
    id,
    labelKey: `siteHeader.nav.${id === 'spec-files' ? 'specFiles' : id === 'spec-queue' ? 'specQueue' : id}`,
    icon: id,
    route,
    order,
    requiredPermissions: [],
    // Mirrors the real remote: every page sits behind the contract's project guard.
    loadRoutes: () =>
      Promise.resolve([
        {
          element: (
            <RequireProject>
              <Outlet />
            </RequireProject>
          ),
          children: [{ path: '*', element: <Page testId={`view-${id}`} title={title} /> }],
        },
      ]),
  };
}

/** Stands in for the `specs` remote, which carries the views the host no longer bundles. */
export const specsRemotes: RemoteApps = {
  apps: [
    stub('workflow', '/workflow', 20, 'Workflow'),
    stub('spec-files', '/spec-files', 30, 'Specs'),
    stub('spec-queue', '/spec-queue', 40, 'Queue'),
  ],
  failed: [],
};

/** Stands in for the `projects` remote: the project list route and the General project settings section. */
export const projectsRemote: RemoteApps = {
  apps: [
    {
      id: 'projects',
      labelKey: 'siteHeader.nav.projects',
      icon: 'projects',
      route: '/projects',
      order: 10,
      requiredPermissions: [],
      showInNav: true,
      loadRoutes: () =>
        Promise.resolve([{ index: true, element: <section data-testid="view-projects-remote" /> }]),
      settings: [
        {
          id: 'general',
          sourceAppId: 'projects',
          titleKey: 'settings.sections.general.title',
          requiredPermissions: [],
          order: 5,
          screen: 'project',
          groupKey: 'settings.groups.project',
          requiresProject: true,
          component: () =>
            Promise.resolve({ default: () => <section data-testid="settings-section-general" /> }),
        },
      ],
    },
  ],
  failed: [],
};
