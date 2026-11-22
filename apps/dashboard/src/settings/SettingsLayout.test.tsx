import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  AppRegistryProvider,
  FORBIDDEN_PATH,
  type AppDefinition,
  type HubProject,
  type SettingsSectionDefinition,
} from '@openjcockpit/hub-contract';
import {
  FakeHubProjectProvider,
  FakeHubSession,
  FakeHubSessionProvider,
} from '@openjcockpit/hub-contract/testing';
import { SettingsForm } from '@openjcockpit/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '../testUtils/render';
import { SettingsLayout } from './SettingsLayout';

const PROJECT = { id: 'p1', name: 'Project one' } as HubProject;

function section(
  id: string,
  over: Partial<SettingsSectionDefinition> = {},
  body: () => React.ReactNode = () => <p data-testid={`body-${id}`}>{id} body</p>,
): SettingsSectionDefinition {
  return {
    id,
    sourceAppId: 'x',
    titleKey: `settings.sections.${id}.title`,
    requiredPermissions: [],
    order: 10,
    groupKey: 'settings.groups.general',
    component: () => Promise.resolve({ default: body }),
    ...over,
  };
}

function app(settings: SettingsSectionDefinition[], over: Partial<AppDefinition> = {}) {
  return {
    id: 'x',
    labelKey: 'siteHeader.nav.platform',
    icon: 'x',
    route: '/x',
    order: 1,
    requiredPermissions: [],
    showInNav: false,
    loadRoutes: () => Promise.resolve([]),
    settings,
    ...over,
  } satisfies AppDefinition;
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

async function renderSettings(
  apps: AppDefinition[],
  at: string,
  { permissions = [] as string[], project = true } = {},
) {
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[at]}>
          <FakeHubSessionProvider session={new FakeHubSession(permissions)}>
            <FakeHubProjectProvider selected={project ? PROJECT : null}>
              <AppRegistryProvider apps={apps}>
                <Routes>
                  <Route path="/settings/*" element={<SettingsLayout screen="settings" />} />
                  <Route path="/project-settings/*" element={<SettingsLayout screen="project" />} />
                  <Route path={FORBIDDEN_PATH} element={<p data-testid="forbidden" />} />
                </Routes>
                <Where />
              </AppRegistryProvider>
            </FakeHubProjectProvider>
          </FakeHubSessionProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

describe('SettingsLayout', () => {
  it('redirects /settings to the first visible section', async () => {
    await renderSettings([app([section('general'), section('other', { order: 20 })])], '/settings');
    expect(await screen.findByTestId('body-general')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/settings/general');
  });

  it('renders the requested section under a host heading and lists the others in the nav', async () => {
    await renderSettings(
      [app([section('general'), section('skillsHub', { order: 20 })])],
      '/settings/skillsHub',
    );
    expect(await screen.findByTestId('body-skillsHub')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Marketplaces' })).toBeInTheDocument();
    const nav = screen.getByTestId('settings-nav');
    expect(nav).toHaveTextContent('General');
    expect(screen.getByTestId('settings-nav-skillsHub')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps project sections off the Settings screen and on their own screen', async () => {
    const apps = [
      app([section('skills'), section('jira', { screen: 'project', requiresProject: true })]),
    ];
    await renderSettings(apps, '/settings');
    expect(await screen.findByTestId('body-skills')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-nav-jira')).not.toBeInTheDocument();
  });

  it('redirects /project-settings to its first section and lists only project sections', async () => {
    const apps = [
      app([section('skills'), section('jira', { screen: 'project', requiresProject: true })]),
    ];
    await renderSettings(apps, '/project-settings');
    expect(await screen.findByTestId('body-jira')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/project-settings/jira');
    expect(screen.getByTestId('project-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-nav-skills')).not.toBeInTheDocument();
  });

  it('answers 404 for a section that belongs to the other screen', async () => {
    const apps = [app([section('skills'), section('jira', { screen: 'project' })])];
    await renderSettings(apps, '/settings/jira');
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  });

  it('shows a card-sized loading line, not a whole page with its own shell, while a section loads', async () => {
    const pending = section('slow', { component: () => new Promise(() => undefined) });
    await renderSettings([app([pending])], '/settings/slow');
    const card = await screen.findByTestId('settings-card-slow');
    expect(card).toHaveTextContent('Loading…');
    expect(screen.queryByTestId('view-loading')).not.toBeInTheDocument();
    expect(document.querySelectorAll('main')).toHaveLength(1);
  });

  it('puts the section content on a card', async () => {
    await renderSettings([app([section('general')])], '/settings/general');
    expect(await screen.findByTestId('settings-card-general')).toContainElement(
      await screen.findByTestId('body-general'),
    );
  });

  it('sets the document title from the section', async () => {
    await renderSettings([app([section('general')])], '/settings/general');
    await screen.findByTestId('body-general');
    expect(document.title).toBe('Settings · General · OpenJCockpit');
  });

  it('answers 404 for an unknown id', async () => {
    await renderSettings([app([section('general')])], '/settings/nope');
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  });

  it('answers 403 for a section the session may not open and hides it from the nav', async () => {
    const apps = [app([section('general'), section('secret', { requiredPermissions: ['admin'] })])];
    await renderSettings(apps, '/settings/secret');
    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
  });

  it('keeps hidden sections out of the nav', async () => {
    const apps = [app([section('general'), section('secret', { requiredPermissions: ['admin'] })])];
    await renderSettings(apps, '/settings/general');
    await screen.findByTestId('body-general');
    expect(screen.queryByTestId('settings-nav-secret')).not.toBeInTheDocument();
  });

  it('shows an empty state when no section is visible', async () => {
    await renderSettings([app([])], '/settings');
    expect(screen.getByTestId('settings-empty')).toBeInTheDocument();
  });

  it('shows the select-project message for a project section without a project', async () => {
    await renderSettings(
      [app([section('general'), section('jira', { requiresProject: true, order: 20 })])],
      '/settings/jira',
      {
        project: false,
      },
    );
    expect(await screen.findByTestId('settings-select-project')).toBeInTheDocument();
    expect(screen.queryByTestId('body-jira')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-jira')).toBeInTheDocument();
  });

  it('sends the user to project selection from the select-project message', async () => {
    await renderSettings([app([section('jira', { requiresProject: true })])], '/settings/jira', {
      project: false,
    });
    const prompt = await screen.findByTestId('settings-select-project');
    fireEvent.click(prompt.querySelector('button') as HTMLButtonElement);
    expect(screen.getByTestId('where')).toHaveTextContent('/projects');
  });

  it('draws a known section icon in the nav and skips an unknown one', async () => {
    await renderSettings(
      [app([section('a', { icon: 'settings' }), section('b', { icon: 'nope', order: 20 })])],
      '/settings/a',
    );
    await screen.findByTestId('body-a');
    expect(screen.getByTestId('settings-nav-a').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('settings-nav-b').querySelector('svg')).toBeNull();
  });

  it('lists a section without a group under the default group', async () => {
    await renderSettings([app([section('plain', { groupKey: undefined })])], '/settings/plain');
    expect(await screen.findByTestId('body-plain')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav')).toHaveTextContent('Other');
  });

  it('ignores apps that contribute no settings', async () => {
    await renderSettings(
      [app([], { id: 'bare', settings: undefined }), app([section('general')])],
      '/settings/nope',
    );
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  });

  it('keeps the nav when a section throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const boom = section('boom', {}, () => {
      throw new Error('boom');
    });
    await renderSettings([app([section('general'), boom])], '/settings/boom');
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByTestId('settings-nav-general')).toBeInTheDocument();
    error.mockRestore();
  });

  it('shows the section description and renders a project-free section without a project', async () => {
    await renderSettings(
      [app([section('general', { descriptionKey: 'settings.selectProject' })])],
      '/settings/general',
      { project: false },
    );
    expect(await screen.findByTestId('body-general')).toBeInTheDocument();
    expect(screen.getByText('Select a project to configure this section.')).toBeInTheDocument();
  });

  describe('unsaved changes', () => {
    const form = () => (
      <SettingsForm
        dirty
        onSubmit={() => undefined}
        saveLabel="Save"
        savingLabel="Saving"
        savedLabel="Saved"
        resetLabel="Reset"
      >
        <p data-testid="body-dirty">editing</p>
      </SettingsForm>
    );
    const apps = () => [app([section('dirty', {}, form), section('other', { order: 20 })])];

    it('asks before leaving a dirty section through the nav and stays on cancel', async () => {
      await renderSettings(apps(), '/settings/dirty');
      await screen.findByTestId('body-dirty');
      await act(async () => {
        fireEvent.click(screen.getByTestId('settings-nav-other'));
      });
      expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByTestId('where')).toHaveTextContent('/settings/dirty');
      fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      expect(screen.getByTestId('where')).toHaveTextContent('/settings/dirty');
    });

    it('leaves once the user confirms', async () => {
      await renderSettings(apps(), '/settings/dirty');
      await screen.findByTestId('body-dirty');
      await act(async () => {
        fireEvent.click(screen.getByTestId('settings-nav-other'));
      });
      const leave = await screen.findByRole('button', { name: 'Leave without saving' });
      await act(async () => {
        fireEvent.click(leave);
      });
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/settings/other'));
    });

    it('navigates freely when nothing is dirty', async () => {
      await renderSettings(
        [app([section('general'), section('other', { order: 20 })])],
        '/settings/general',
      );
      await screen.findByTestId('body-general');
      await act(async () => {
        fireEvent.click(screen.getByTestId('settings-nav-other'));
      });
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/settings/other'));
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });

    it('warns before the tab closes only while dirty', async () => {
      await renderSettings(apps(), '/settings/dirty');
      await screen.findByTestId('body-dirty');
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('marks project sections with a lock while no project is selected', async () => {
    const jira = section('jira', { screen: 'project', requiresProject: true });
    await renderSettings([app([jira])], '/project-settings/jira', { project: false });
    expect(await screen.findByTestId('settings-select-project')).toBeInTheDocument();
    expect(within(screen.getByTestId('settings-nav-jira')).getByRole('img')).toHaveAccessibleName(
      'Project required',
    );
  });

  it('shows no lock once a project is selected', async () => {
    const jira = section('jira', { screen: 'project', requiresProject: true });
    await renderSettings([app([jira])], '/project-settings/jira');
    await screen.findByTestId('body-jira');
    expect(within(screen.getByTestId('settings-nav-jira')).queryByRole('img')).toBeNull();
  });

  it('scrolls to the group named by the URL hash', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const body = () => <section id="advanced">advanced</section>;
    await renderSettings([app([section('general', {}, body)])], '/settings/general#advanced');
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });
});
