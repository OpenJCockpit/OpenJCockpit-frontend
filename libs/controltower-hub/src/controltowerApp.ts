import type { AppDefinition } from '@openjcockpit/hub-contract';
import { CONTROLTOWER_ADMIN_ROLES } from './roles';
import { CONTROLTOWER_QUEUE_PATH, CONTROLTOWER_ROUTE } from './routePaths';

/**
 * Specification operations: discovery interviews, dependency-aware specs and governed dispatch to OpenJCockpit.
 * Everyone signed in may read (`requiredPermissions` is empty, as in the backend); the pages hide write actions.
 */
export const controltowerApp: AppDefinition = {
  id: 'controltower',
  labelKey: 'siteHeader.nav.controltower',
  icon: 'controltower',
  route: CONTROLTOWER_ROUTE,
  order: 45,
  requiredPermissions: [],
  showInNav: true,
  loadRoutes: () => import('./controltowerRoutes').then((m) => m.controltowerRoutes),
  widgets: [
    {
      id: 'controltower-queue',
      titleKey: 'apps.controltower.widgetTitle',
      sourceAppId: 'controltower',
      requiredPermissions: [],
      defaultFor: [],
      link: CONTROLTOWER_QUEUE_PATH,
      cols: 1,
      minCols: 1,
      rows: 2,
      component: () => import('./contributions/QueueWidget'),
    },
  ],
  settings: [
    {
      id: 'controltower-repository',
      sourceAppId: 'controltower',
      titleKey: 'settings.sections.controltowerRepository.title',
      descriptionKey: 'settings.sections.controltowerRepository.description',
      requiredPermissions: [],
      order: 240,
      screen: 'project',
      groupKey: 'settings.groups.projectIntegrations',
      requiresProject: true,
      component: () => import('./settings/RepositorySection'),
    },
    {
      id: 'controltower-policy',
      sourceAppId: 'controltower',
      titleKey: 'settings.sections.controltowerPolicy.title',
      descriptionKey: 'settings.sections.controltowerPolicy.description',
      requiredPermissions: CONTROLTOWER_ADMIN_ROLES,
      order: 130,
      groupKey: 'settings.groups.integrations',
      component: () => import('./settings/PolicySection'),
    },
  ],
};
