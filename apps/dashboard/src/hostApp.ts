import type { AppDefinition } from '@openjcockpit/hub-contract';
import { ROUTES } from './routes';

/**
 * The host's own contribution to the registry: it has no pages or nav entry, only settings
 * sections, so it goes through the same path as a remote's. The project settings live in the
 * projects remote.
 */
export const hostApp: AppDefinition = {
  id: 'host',
  labelKey: 'siteHeader.nav.platform',
  icon: 'platform',
  route: '/host',
  order: 0,
  requiredPermissions: [],
  showInNav: false,
  loadRoutes: () => Promise.resolve([]),
  widgets: [
    {
      id: 'spec-workspace',
      titleKey: 'apps.specWorkspace.widgetTitle',
      sourceAppId: 'host',
      requiredPermissions: [],
      defaultFor: [],
      link: ROUTES.home,
      cols: 3,
      rows: 5,
      minRows: 5,
      component: () => import('./components/SpecWorkspace/SpecWorkspaceWidget'),
    },
  ],
  settings: [
    {
      id: 'preferences',
      sourceAppId: 'host',
      titleKey: 'settings.sections.preferences.title',
      descriptionKey: 'settings.sections.preferences.description',
      requiredPermissions: [],
      order: 0,
      groupKey: 'settings.groups.general',
      component: () => import('./settings/PreferencesSection'),
    },
  ],
};
