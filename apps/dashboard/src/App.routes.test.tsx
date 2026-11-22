import { screen, waitFor } from '@testing-library/react';
import { chooseOption } from '@openjcockpit/ui/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from './routes';
import { FEATURE_FLAGS } from './featureFlags';
import { renderRoutedApp } from './testUtils/renderRoutedApp';
import { projectsRemote, specsRemotes } from './testUtils/specsRemoteStubs';
import { clickAsync } from './testUtils/dom';
import { mockDashboardApis, PROJECT, WORKFLOW } from './testUtils/dashboardFixtures';
import * as api from '@openjcockpit/api';
import { useHubProject, type AppDefinition } from '@openjcockpit/hub-contract';

vi.mock(
  '@openjcockpit/landing-hub',
  async () => (await import('./testUtils/landingHubStub')).landingHubStub,
);

const createKeycloak = vi.hoisted(() => () => ({
  init: vi.fn(),
  token: 'fake-token',
  tokenParsed: { preferred_username: 'tstark', given_name: 'Tony' },
  updateToken: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
let keycloak = createKeycloak();

vi.mock('@openjcockpit/auth', async () => ({
  ...(await vi.importActual<typeof import('@openjcockpit/auth')>('@openjcockpit/auth')),
  getKeycloak: () => keycloak,
}));

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadProjects: vi.fn(),
  loadWorkspace: vi.fn(),
  loadProjectSpecs: vi.fn(),
  getSpecInitStatus: vi.fn(),
  checkWorkflowPreflight: vi.fn(),
  listWorkflows: vi.fn(),
  listWorkflowGroups: vi.fn(),
}));

// Each lazy view is replaced by a stub exposing the callbacks App wires up, so these tests
// cover App's routing glue without rendering the feature libraries.
vi.mock('./lazyViews', async () => {
  const stub =
    (name: string, actions: Record<string, string>) => (props: Record<string, unknown>) => (
      <section data-testid={`view-${name}`}>
        {props.header as never}
        {props.initialExecution ? (
          <p data-testid="initial-execution">{JSON.stringify(props.initialExecution)}</p>
        ) : null}
        {Object.entries(actions).map(([label, prop]) => (
          <button key={label} type="button" onClick={() => (props[prop] as () => void)()}>
            {label}
          </button>
        ))}
      </section>
    );
  return {
    ProjectSelection: (props: {
      projects: { id: string; name: string }[];
      onSelect: (p: { id: string; name: string }) => void;
      loadFailed?: boolean;
      onRetry?: () => void;
    }) => (
      <section data-testid="view-projects">
        {props.loadFailed && (
          <button type="button" onClick={props.onRetry}>
            Load failed, retry
          </button>
        )}
        {props.projects.map((p) => (
          <button key={p.id} type="button" onClick={() => props.onSelect(p)}>
            Select {p.name}
          </button>
        ))}
      </section>
    ),
    SpecFilesDashboard: (props: {
      header: React.ReactNode;
      onBack: () => void;
      renderAddToQueue: (args: {
        project: unknown;
        fixedSpecFile: string;
        onAdded: () => void;
        onCancel: () => void;
      }) => React.ReactNode;
    }) => (
      <section data-testid="view-spec-files">
        {props.header}
        <button type="button" onClick={props.onBack}>
          Spec files back
        </button>
        {props.renderAddToQueue({
          project: { id: 'project-1' },
          fixedSpecFile: 'a.md',
          onAdded: () => {},
          onCancel: () => {},
        })}
      </section>
    ),
    SpecQueueDashboard: (props: {
      header: React.ReactNode;
      onBack: () => void;
      onOpenRun: (workflowId: string, runId: string) => void;
    }) => (
      <section data-testid="view-spec-queue">
        {props.header}
        <button type="button" onClick={props.onBack}>
          Queue back
        </button>
        <button type="button" onClick={() => props.onOpenRun('wf 1', 'run/2')}>
          Open run
        </button>
      </section>
    ),
    AddToQueueDialog: ({ fixedSpecFile }: { fixedSpecFile: string }) => (
      <p data-testid="add-to-queue">{fixedSpecFile}</p>
    ),
    WorkflowDashboard: stub('workflow', { 'Workflow back': 'onBack' }),
    WorkflowPromptDialog: () => null,
  };
});

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    keycloak = createKeycloak();
    keycloak.init.mockResolvedValue(true);
    keycloak.updateToken.mockResolvedValue(false);
    mockDashboardApis();
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });
  });

  it('shows a not-found page with a way back for unknown paths', async () => {
    renderRoutedApp('/nope');
    expect(await screen.findByTestId('not-found')).toHaveTextContent('This page does not exist.');
    await clickAsync(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(await screen.findByText('Start')).toBeInTheDocument();
  });

  it('says so when a run screen names a workflow the project does not have', async () => {
    renderRoutedApp(`${ROUTES.dashboardRun}/run-1?workflow=missing`);
    expect(await screen.findByRole('alert')).toHaveTextContent('This workflow could not be found.');
  });

  it('opens the dashboard at the root', async () => {
    renderRoutedApp(ROUTES.root);
    expect(await screen.findByText('Start')).toBeInTheDocument();
  });

  it('returns to the originally requested view after choosing a project', async () => {
    localStorage.clear();
    renderRoutedApp('/spec-queue', specsRemotes);
    await clickAsync(await screen.findByRole('button', { name: 'Select Test Project' }));
    expect(await screen.findByTestId('view-spec-queue')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('openjcockpit_project_id')).toBe('project-1'));
  });

  it('serves a select-only project page while the projects app is unavailable', async () => {
    localStorage.clear();
    renderRoutedApp('/projects');
    expect(await screen.findByTestId('view-projects')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open settings' })).not.toBeInTheDocument();
  });

  it('leaves /projects to the projects app when it is loaded', async () => {
    renderRoutedApp('/projects', projectsRemote);
    expect(await screen.findByTestId('view-projects-remote')).toBeInTheDocument();
    expect(screen.queryByTestId('view-projects')).not.toBeInTheDocument();
  });

  it('redirects the old project management section to /projects', async () => {
    renderRoutedApp('/project-settings/projects', projectsRemote);
    expect(await screen.findByTestId('view-projects-remote')).toBeInTheDocument();
  });

  it('forgets a stored project that no longer exists', async () => {
    localStorage.setItem('openjcockpit_project_id', 'gone');
    vi.mocked(api.loadProjects).mockResolvedValue([]);
    renderRoutedApp(ROUTES.landing);
    await screen.findByTestId('landing-hero');
    await waitFor(() => expect(localStorage.getItem('openjcockpit_project_id')).toBeNull());
  });

  it('logs out through keycloak from the hub', async () => {
    renderRoutedApp(ROUTES.landing);
    await clickAsync(await screen.findByRole('button', { name: 'Logout' }));
    expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
  });

  it('switches the active project from the header dropdown', async () => {
    const other = { ...PROJECT, id: 'project-2', name: 'Other Project' };
    vi.mocked(api.loadProjects).mockResolvedValue([PROJECT, other]);
    renderRoutedApp('/spec-queue', specsRemotes);
    const select = await screen.findByRole('combobox', { name: 'Active project' });
    await clickAsync(select);
    await clickAsync(screen.getByRole('option', { name: 'Other Project' }));
    await waitFor(() => expect(localStorage.getItem('openjcockpit_project_id')).toBe('project-2'));
    expect(select).toHaveTextContent('Other Project');
  });

  it('ignores a remote selecting a project the user does not have', async () => {
    function Picker() {
      const { select, selected } = useHubProject();
      return (
        <>
          <p data-testid="picked">{selected?.id ?? 'none'}</p>
          <button type="button" onClick={() => select('missing')}>
            Pick missing
          </button>
        </>
      );
    }
    const picker: AppDefinition = {
      id: 'picker',
      labelKey: 'siteHeader.nav.platform',
      icon: 'picker',
      route: '/picker',
      order: 1,
      requiredPermissions: [],
      loadRoutes: () => Promise.resolve([{ path: '*', element: <Picker /> }]),
    };
    renderRoutedApp('/picker', { apps: [picker], failed: [] });
    await clickAsync(await screen.findByRole('button', { name: 'Pick missing' }));
    expect(screen.getByTestId('picked')).toHaveTextContent('project-1');
    expect(localStorage.getItem('openjcockpit_project_id')).toBe('project-1');
  });

  it('opens project settings from the pre-flight alert on a Git problem', async () => {
    vi.mocked(api.checkWorkflowPreflight).mockResolvedValue({
      passed: false,
      errors: [{ code: 'GIT_AUTH_FAILED', message: 'denied' }],
    });
    renderRoutedApp('/home', projectsRemote);
    await clickAsync(await screen.findByText('Start'));
    await clickAsync(await screen.findByRole('button', { name: 'Check Git settings' }));
    expect(await screen.findByTestId('settings-section-general')).toBeInTheDocument();
  });

  it('selects a project from project selection and lands on the dashboard', async () => {
    localStorage.clear();
    renderRoutedApp('/projects');
    await clickAsync(await screen.findByRole('button', { name: 'Select Test Project' }));
    expect(await screen.findByText('Start')).toBeInTheDocument();
  });

  it('shows a load error with Retry instead of an empty list when the projects fail to load', async () => {
    vi.mocked(api.loadProjects).mockRejectedValueOnce(new Error('down'));
    renderRoutedApp('/projects');
    const retry = await screen.findByRole('button', { name: 'Load failed, retry' });
    await clickAsync(retry);
    expect(await screen.findByRole('button', { name: 'Select Test Project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load failed, retry' })).not.toBeInTheDocument();
  });

  it('keeps the workflow the user picked in the launcher', async () => {
    const second = { ...WORKFLOW, id: 'wf-2', name: 'Second workflow' };
    vi.mocked(api.listWorkflows).mockResolvedValue([WORKFLOW, second]);
    renderRoutedApp('/home');
    const picker = await screen.findByLabelText('Workflow');
    await waitFor(() => expect(picker).toHaveTextContent('Spec to pull request'));
    chooseOption(picker, 'Second workflow');
    expect(screen.getByLabelText('Workflow')).toHaveTextContent('Second workflow');
  });

  it('shows an error instead of the hero when the workspace fails to load', async () => {
    vi.mocked(api.loadWorkspace).mockRejectedValue(new Error('boom'));
    renderRoutedApp('/home');
    expect(await screen.findByText('Failed to load the workspace.')).toBeInTheDocument();
  });
});

describe('App remote apps', () => {
  const remoteApp = (requiredPermissions: string[]) => ({
    id: 'sample',
    labelKey: 'x',
    icon: 'x',
    route: '/sample' as const,
    order: 1,
    requiredPermissions,
    loadRoutes: () => Promise.resolve([{ index: true, element: <p>sample remote</p> }]),
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    keycloak = createKeycloak();
    keycloak.init.mockResolvedValue(true);
    keycloak.updateToken.mockResolvedValue(false);
    mockDashboardApis();
  });

  it('mounts a loaded remote app at its route', async () => {
    renderRoutedApp('/sample', { apps: [remoteApp([])], failed: [] });
    expect(await screen.findByText('sample remote')).toBeInTheDocument();
  });

  it('sends a user without the permission to the 403 page', async () => {
    renderRoutedApp('/sample', { apps: [remoteApp(['sample.read'])], failed: [] });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have access to this page.',
    );
  });

  describe('without the ControlTower remote', () => {
    beforeEach(() => localStorage.setItem(FEATURE_FLAGS.hub, '1'));

    it('shows no Control Tower app, no notice and no error when it is not in the manifest', async () => {
      renderRoutedApp('/home', specsRemotes);
      expect(await screen.findByTestId('home')).toBeInTheDocument();
      expect(screen.queryByText(/control tower/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('remote-failures')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('names the remote on Home when it is in the manifest but failed to load', async () => {
      renderRoutedApp('/home', { ...specsRemotes, failed: ['controltower'] });
      expect(await screen.findByTestId('remote-failures')).toHaveTextContent('controltower');
    });
  });
});
