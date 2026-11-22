import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useAppRegistry } from '../registry';
import { SettingsLink } from '../settingsLink';
import { FakeHubSession, FakeHubSessionProvider } from './FakeHubSession';
import { FakeSettingsRegistry } from './FakeSettingsRegistry';

describe('FakeSettingsRegistry', () => {
  it('registers the given sections so links resolve', () => {
    render(
      <MemoryRouter>
        <FakeHubSessionProvider session={new FakeHubSession([])}>
          <FakeSettingsRegistry sections={[{ id: 'a' }, { id: 'b', screen: 'project' }]}>
            <SettingsLink id="a">a</SettingsLink>
            <SettingsLink id="b">b</SettingsLink>
          </FakeSettingsRegistry>
        </FakeHubSessionProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('a')).toHaveAttribute('href', '/settings/a');
    expect(screen.getByText('b')).toHaveAttribute('href', '/project-settings/b');
  });

  it('registers inert stubs for the section body and routes', async () => {
    let registry!: ReturnType<typeof useAppRegistry>;
    function Capture() {
      registry = useAppRegistry();
      return null;
    }
    render(
      <FakeHubSessionProvider session={new FakeHubSession([])}>
        <FakeSettingsRegistry sections={[{ id: 'a' }]}>
          <Capture />
        </FakeSettingsRegistry>
      </FakeHubSessionProvider>,
    );
    const section = registry.visibleSettings[0]!;
    const { default: Body } = await section.component();
    expect(render(<Body />).container).toBeEmptyDOMElement();
    expect(await registry.allApps[0]!.loadRoutes()).toEqual([]);
  });
});
