import { ADMIN_PERMISSION, PROJECTS_PATH, type AppDefinition } from '@openjcockpit/hub-contract';

/**
 * Projects: the list of projects and the settings of the selected one. Everyone signed in may see
 * the list (`requiredPermissions` is empty); the pages hide what only admins may do, as the backend enforces.
 */
export const projectsApp: AppDefinition = {
  id: 'projects',
  labelKey: 'siteHeader.nav.projects',
  icon: 'projects',
  route: PROJECTS_PATH,
  // First in the nav: the other apps start at 20.
  order: 10,
  requiredPermissions: [],
  showInNav: true,
  loadRoutes: () => import('./projectsRoutes').then((m) => m.projectsRoutes),
  settings: [
    {
      id: 'general',
      sourceAppId: 'projects',
      titleKey: 'settings.sections.general.title',
      descriptionKey: 'settings.sections.general.description',
      requiredPermissions: [ADMIN_PERMISSION],
      order: 5,
      screen: 'project',
      groupKey: 'settings.groups.project',
      requiresProject: true,
      component: () => import('./GeneralSettings/GeneralSettings'),
    },
    {
      id: 'repository',
      sourceAppId: 'projects',
      titleKey: 'settings.sections.repository.title',
      descriptionKey: 'settings.sections.repository.description',
      requiredPermissions: [ADMIN_PERMISSION],
      order: 6,
      screen: 'project',
      groupKey: 'settings.groups.project',
      requiresProject: true,
      component: () => import('./RepositorySettings/RepositorySettings'),
    },
  ],
};
