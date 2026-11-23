import type { ReactNode } from 'react';
import type { SettingsScreen, SettingsSectionDefinition } from '../appDefinition';
import { AppRegistryProvider } from '../registry';

interface FakeSection {
  id: string;
  screen?: SettingsScreen;
}

/** Registers `sections` the way an app would, so `useSettingsLink` and `SettingsLink` resolve in a harness. Needs a `HubSession` above it. */
export function FakeSettingsRegistry({
  sections,
  children,
}: {
  sections: readonly FakeSection[];
  children: ReactNode;
}) {
  const settings: SettingsSectionDefinition[] = sections.map(({ id, screen }, order) => ({
    id,
    screen,
    sourceAppId: 'fake',
    titleKey: id,
    requiredPermissions: [],
    order,
    component: () => Promise.resolve({ default: () => null }),
  }));
  return (
    <AppRegistryProvider
      apps={[
        {
          id: 'fake',
          labelKey: 'fake',
          icon: 'x',
          route: '/fake',
          order: 1,
          requiredPermissions: [],
          showInNav: false,
          loadRoutes: () => Promise.resolve([]),
          settings,
        },
      ]}
    >
      {children}
    </AppRegistryProvider>
  );
}
