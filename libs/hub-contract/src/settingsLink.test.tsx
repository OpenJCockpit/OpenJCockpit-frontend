import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { AppDefinition, SettingsSectionDefinition } from './appDefinition';
import { AppRegistryProvider } from './registry';
import { SettingsLink, settingsPath, useSettingsLink } from './settingsLink';
import { FakeHubSession, FakeHubSessionProvider } from './testing';

const section = (
  id: string,
  over: Partial<SettingsSectionDefinition> = {},
): SettingsSectionDefinition => ({
  id,
  sourceAppId: 'x',
  titleKey: id,
  requiredPermissions: [],
  order: 1,
  component: () => Promise.resolve({ default: () => null }),
  ...over,
});

const app = (settings: SettingsSectionDefinition[]): AppDefinition => ({
  id: 'x',
  labelKey: 'x',
  icon: 'x',
  route: '/x',
  order: 1,
  requiredPermissions: [],
  loadRoutes: () => Promise.resolve([]),
  settings,
});

function renderWith(settings: SettingsSectionDefinition[], ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <FakeHubSessionProvider session={new FakeHubSession([])}>
        <AppRegistryProvider apps={[app(settings)]}>{ui}</AppRegistryProvider>
      </FakeHubSessionProvider>
    </MemoryRouter>,
  );
}

function Path({ id }: { id: string }) {
  return <p data-testid="path">{useSettingsLink(id) ?? 'none'}</p>;
}

describe('settings links', () => {
  it('resolves the screen from the registered section', () => {
    expect(settingsPath({ id: 'a' })).toBe('/settings/a');
    expect(settingsPath({ id: 'b', screen: 'project' })).toBe('/project-settings/b');
  });

  it('links a global section and a project section by id', () => {
    renderWith(
      [section('a'), section('b', { screen: 'project' })],
      <>
        <SettingsLink id="a">to a</SettingsLink>
        <SettingsLink id="b" className="x">
          to b
        </SettingsLink>
      </>,
    );
    expect(screen.getByRole('link', { name: 'to a' })).toHaveAttribute('href', '/settings/a');
    expect(screen.getByRole('link', { name: 'to b' })).toHaveAttribute(
      'href',
      '/project-settings/b',
    );
  });

  it('gives no link for an unknown section or one the session may not open', () => {
    renderWith(
      [section('secret', { requiredPermissions: ['admin'] })],
      <>
        <Path id="missing" />
        <SettingsLink id="secret">hidden</SettingsLink>
      </>,
    );
    expect(screen.getByTestId('path')).toHaveTextContent('none');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
