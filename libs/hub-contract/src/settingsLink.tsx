import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import type { SettingsScreen, SettingsSectionDefinition } from './appDefinition';
import { PROJECT_SETTINGS_PATH } from './project';
import { useAppRegistry } from './registry';

/** Where each settings screen is mounted. The host's routes use the same values. */
export const SETTINGS_SCREEN_BASE: Record<SettingsScreen, string> = {
  settings: '/settings',
  project: PROJECT_SETTINGS_PATH,
};

export const settingsPath = (section: Pick<SettingsSectionDefinition, 'id' | 'screen'>) =>
  `${SETTINGS_SCREEN_BASE[section.screen ?? 'settings']}/${section.id}`;

/**
 * Path of the settings section `id`, resolved from the registry so the link cannot drift from where
 * the section is registered. Undefined when no visible section has that id: the session may not open
 * it, or the app that contributes it is not loaded.
 */
export function useSettingsLink(id: string): string | undefined {
  const section = useAppRegistry().visibleSettings.find((candidate) => candidate.id === id);
  return section && settingsPath(section);
}

/** A link to a settings section by id. Renders nothing when the session cannot open that section. */
export function SettingsLink({
  id,
  ...rest
}: { id: string } & Omit<ComponentProps<typeof Link>, 'to'>) {
  const to = useSettingsLink(id);
  return to ? <Link to={to} {...rest} /> : null;
}
