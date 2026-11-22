import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { clickAsync } from '../testUtils';
import { project, renderHub } from '../testHub';
import { projectsRoutes } from '../projectsRoutes';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

const page = projectsRoutes[0]!.element as React.ReactElement;

function row(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

async function renderAdmin(projects = [project()], options = {}) {
  vi.mocked(api.loadAllProjects).mockResolvedValue(projects);
  const result = await renderHub(page, { projects, ...options });
  await screen.findByText('+ New project');
  return result;
}

describe('ProjectsPage: loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('keeps showing the loading message while the load is pending', async () => {
    vi.mocked(api.loadAllProjects).mockReturnValue(new Promise(() => {}));
    await renderHub(page);
    expect(screen.getByText('Loading projects…')).toBeInTheDocument();
  });

  it('keeps the loading message and logs when the load fails', async () => {
    vi.mocked(api.loadAllProjects).mockRejectedValue(new Error('down'));
    await renderHub(page);
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByText('Loading projects…')).toBeInTheDocument();
  });

  it('does not log an aborted load', async () => {
    vi.mocked(api.isAbortError).mockReturnValue(true);
    vi.mocked(api.loadAllProjects).mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await renderHub(page);
    await waitFor(() => expect(api.loadAllProjects).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
    vi.mocked(api.isAbortError).mockReset();
  });

  it('says so when there are no projects', async () => {
    await renderAdmin([]);
    expect(screen.getByTestId('projects-empty')).toHaveTextContent('No projects available.');
  });
});

describe('ProjectsPage: new project', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the create wizard', async () => {
    await renderAdmin();
    await clickAsync(screen.getByText('+ New project'));
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/new');
  });

  it('hides the button from users who are not admins', async () => {
    await renderHub(page, { permissions: [], projects: [project()] });
    await screen.findByText('Beta');
    expect(screen.queryByText('+ New project')).not.toBeInTheDocument();
  });
});

describe('ProjectsPage: status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates an active project after confirmation', async () => {
    await renderAdmin();
    vi.mocked(api.deactivateProject).mockResolvedValue(undefined);
    await clickAsync(within(row('Beta')).getByLabelText('Deactivate'));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    expect(api.deactivateProject).toHaveBeenCalledWith('p1');
    expect(await within(row('Beta')).findByText('Inactive')).toBeInTheDocument();
  });

  it('activates an inactive project without asking', async () => {
    await renderAdmin([project({ active: 0 })]);
    vi.mocked(api.activateProject).mockResolvedValue(undefined);
    await clickAsync(within(row('Beta')).getByLabelText('Activate'));
    expect(api.activateProject).toHaveBeenCalledWith('p1');
    expect(await within(row('Beta')).findByText('Active')).toBeInTheDocument();
  });

  it('shows an error when the status change fails and leaves the project unchanged', async () => {
    await renderAdmin();
    vi.mocked(api.deactivateProject).mockRejectedValue(new Error('x'));
    await clickAsync(within(row('Beta')).getByLabelText('Deactivate'));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to change the project status.',
    );
    expect(within(row('Beta')).getByText('Active')).toBeInTheDocument();
  });

  it('only toggles the targeted project', async () => {
    await renderAdmin([project(), project({ id: 'p2', name: 'Gamma', active: 0 })]);
    vi.mocked(api.deactivateProject).mockResolvedValue(undefined);
    vi.mocked(api.activateProject).mockResolvedValue(undefined);

    await clickAsync(within(row('Beta')).getByLabelText('Deactivate'));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    expect(await within(row('Beta')).findByText('Inactive')).toBeInTheDocument();
    expect(within(row('Gamma')).getByText('Inactive')).toBeInTheDocument();

    await clickAsync(within(row('Gamma')).getByLabelText('Activate'));
    expect(await within(row('Gamma')).findByText('Active')).toBeInTheDocument();
    expect(within(row('Beta')).getByText('Inactive')).toBeInTheDocument();
  });
});

describe('ProjectsPage: select and settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects a project and returns to where the user came from', async () => {
    const { onSelect } = await renderAdmin([project()], { state: { from: '/spec-files?x=1' } });
    await clickAsync(within(row('Beta')).getByText('Select'));
    expect(onSelect).toHaveBeenCalledWith('p1');
    // The probe shows the path only; the query string is part of the navigation target.
    expect(screen.getByTestId('location')).toHaveTextContent('/spec-files');
  });

  it('goes to the dashboard when nothing sent the user here', async () => {
    await renderAdmin();
    await clickAsync(within(row('Beta')).getByText('Select'));
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it.each([{ state: 'x' }, { state: null }, { state: { from: 3 } }])(
    'ignores a router state without a path ($state)',
    async ({ state }) => {
      await renderAdmin([project()], { state });
      await clickAsync(within(row('Beta')).getByText('Select'));
      expect(screen.getByTestId('location')).toHaveTextContent('/home');
    },
  );

  it('cannot select a project whose repository is not reachable', async () => {
    await renderAdmin([project({ gitStatus: 'NOT_ACCESSIBLE' })]);
    expect(within(row('Beta')).getByText('Select')).toBeDisabled();
  });

  it('selects the project and opens its settings', async () => {
    const { onSelect } = await renderAdmin();
    await clickAsync(within(row('Beta')).getByLabelText('Settings'));
    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(screen.getByTestId('location')).toHaveTextContent('/project-settings/general');
  });

  it('offers no Settings button when the general section is not available', async () => {
    await renderAdmin([project()], { settingsSections: [] });
    expect(within(row('Beta')).queryByLabelText('Settings')).not.toBeInTheDocument();
  });

  it('marks the selected project and shows its git message', async () => {
    await renderAdmin([project({ gitStatusMessage: 'all good', gitStatus: 'ACCESSIBLE' })], {
      selected: project(),
    });
    expect(within(row('Beta')).getByText('Current')).toBeInTheDocument();
    expect(within(row('Beta')).getByText('all good')).toBeInTheDocument();
  });
});

describe('ProjectsPage: navigation', () => {
  it('goes back to the dashboard', async () => {
    await renderHub(page, { permissions: [] });
    await clickAsync(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });
});

describe('ProjectsPage: without admin rights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the active projects of the host and offers no management', async () => {
    await renderHub(page, {
      permissions: [],
      projects: [project(), project({ id: 'p2', name: 'Gamma', description: undefined })],
    });
    expect(api.loadAllProjects).not.toHaveBeenCalled();
    expect(row('Beta')).toBeInTheDocument();
    expect(row('Gamma')).toBeInTheDocument();
    expect(screen.queryByText('+ New project')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Deactivate')).not.toBeInTheDocument();
    expect(within(row('Beta')).getByText('Select')).toBeEnabled();
  });
});
