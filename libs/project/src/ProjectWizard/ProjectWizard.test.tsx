import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { chooseOption } from '@openjcockpit/ui/testing';
import { clickAsync } from '../testUtils';
import { project, renderHub } from '../testHub';
import { createTestQueryClient } from '../testQueryClient';
import ProjectWizardRoute, { ProjectWizard } from './ProjectWizard';
import { ALL_PROJECTS_KEY } from '../projectCache';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

const accessible = {
  gitStatus: 'ACCESSIBLE',
  gitStatusCheckedAt: 'now',
  gitStatusMessage: 'ok',
} as api.ProjectGitStatusDto;

async function next() {
  await clickAsync(screen.getByText('Next'));
}

async function fillBasics(name = 'Alpha') {
  await renderHub(<ProjectWizard />);
  fireEvent.change(screen.getByPlaceholderText('Project name'), { target: { value: name } });
  await next();
}

async function chooseNewRepo() {
  chooseOption(
    screen.getByRole('combobox', { name: /Repository/ }),
    'New project (repository does not exist yet)',
  );
}

describe('ProjectWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.createProject).mockImplementation(async (req) =>
      project({ id: 'p9', name: req.name }),
    );
    vi.mocked(api.saveGitCredentials).mockResolvedValue(undefined);
    vi.mocked(api.triggerGitCheck).mockResolvedValue(accessible);
    vi.mocked(api.initSpecFolder).mockResolvedValue({} as api.SpecInitResult);
  });

  it('requires a name before leaving the first step', async () => {
    await renderHub(<ProjectWizard />);
    await next();
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.');
    expect(screen.getByText('1. Basics')).toHaveAttribute('aria-current', 'step');
  });

  it('requires a Git URL for an existing repository and keeps entered data on Back', async () => {
    await fillBasics();
    await next();
    expect(await screen.findByRole('alert')).toHaveTextContent('Git URL is required');
    await clickAsync(screen.getByText('Back'));
    expect(screen.getByPlaceholderText('Project name')).toHaveValue('Alpha');
  });

  it('creates a project with a new repository without a Git check', async () => {
    await fillBasics();
    await chooseNewRepo();
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));

    expect(api.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alpha', newProject: 1, gitUrl: '' }),
    );
    expect(api.triggerGitCheck).not.toHaveBeenCalled();
    expect(api.saveGitCredentials).not.toHaveBeenCalled();
    expect(await screen.findByText('Project created')).toBeInTheDocument();
  });

  it('tests the connection, shows host warnings and creates the project in order', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({
      gitStatus: 'ACCESSIBLE',
      warnings: ['host_private'],
    });
    const { onSelect } = await renderHub(<ProjectWizard />);
    fireEvent.change(screen.getByPlaceholderText('Project name'), { target: { value: 'Alpha' } });
    await next();
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://git.internal/org/repo' },
    });
    chooseOption(screen.getByRole('combobox', { name: /Type/ }), 'GitHub PAT');
    fireEvent.change(screen.getByLabelText('Secret / token / password'), {
      target: { value: 's3cret' },
    });
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByText('The repository is reachable.')).toBeInTheDocument();
    expect(screen.getByText('The host is on a private network.')).toBeInTheDocument();
    expect(api.checkGitConnection).toHaveBeenCalledWith(
      expect.objectContaining({ gitUrl: 'https://git.internal/org/repo', secret: 's3cret' }),
    );

    await next();
    fireEvent.click(screen.getByRole('checkbox'));
    await next();
    await clickAsync(screen.getByText('Create project'));

    await screen.findByText('Project created');
    expect(api.saveGitCredentials).toHaveBeenCalledWith(
      'p9',
      expect.objectContaining({ credentialType: 'GITHUB_PAT', secret: 's3cret' }),
    );
    expect(api.triggerGitCheck).toHaveBeenCalledWith('p9');
    expect(api.initSpecFolder).toHaveBeenCalledWith('p9');

    await clickAsync(screen.getByText('Select this project and open it'));
    expect(onSelect).toHaveBeenCalledWith('p9');
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('shows a failed test connection', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({
      gitStatus: 'NOT_ACCESSIBLE',
      message: 'Authentication failed.',
      warnings: [],
    });
    await fillBasics();
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://github.com/o/r' },
    });
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication failed.');
  });

  it('stays on review with the error when create fails, and creates nothing', async () => {
    vi.mocked(api.createProject).mockRejectedValue(new Error('boom'));
    await fillBasics();
    await chooseNewRepo();
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(api.saveGitCredentials).not.toHaveBeenCalled();
  });

  it('retries a failed repository check without creating a second project', async () => {
    vi.mocked(api.triggerGitCheck).mockResolvedValueOnce({
      ...accessible,
      gitStatus: 'NOT_ACCESSIBLE',
    });
    await fillBasics();
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://github.com/o/r' },
    });
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Project "Alpha" was created');
    await clickAsync(screen.getByText('Retry'));

    await screen.findByText('Project created');
    expect(api.createProject).toHaveBeenCalledTimes(1);
    expect(api.triggerGitCheck).toHaveBeenCalledTimes(2);
  });

  it('lets the user continue anyway after a partial failure', async () => {
    vi.mocked(api.triggerGitCheck).mockRejectedValue(new Error('down'));
    await fillBasics();
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://github.com/o/r' },
    });
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));
    await clickAsync(await screen.findByText('Continue anyway'));
    expect(await screen.findByText('Project created')).toBeInTheDocument();
    await clickAsync(screen.getByText('Go to project settings'));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/project-settings/general'),
    );
  });

  it('asks before leaving with unsaved input', async () => {
    await fillBasics();
    await clickAsync(screen.getByText('Cancel'));
    expect(screen.getByText('Leave without creating?')).toBeInTheDocument();
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/projects'));
  });

  it('keeps every entered field and the review rows, falling back to main for an empty branch', async () => {
    await renderHub(<ProjectWizard />);
    const basics: [RegExp, string][] = [
      [/^Name/, 'Alpha'],
      [/Customer/, 'cust-1'],
      [/Environment/, 'prod'],
      [/Owner/, 'team-a'],
      [/Description/, 'About it'],
    ];
    for (const [label, value] of basics) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    await next();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: ' https://g/o/r ' } });
    fireEvent.change(screen.getByLabelText(/^Branch/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'me' } });
    fireEvent.change(screen.getByLabelText(/API URL/), { target: { value: 'https://api.x' } });
    await next();
    await next();

    expect(screen.getByText('https://g/o/r (main)')).toBeInTheDocument();
    for (const value of ['cust-1', 'prod', 'team-a', 'About it', 'No']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it('sends the optional credentials with the test and a null secret when empty', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({ gitStatus: 'ACCESSIBLE', warnings: [] });
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'me' } });
    fireEvent.change(screen.getByLabelText(/API URL/), { target: { value: 'https://api.x' } });
    await clickAsync(screen.getByText('Test connection'));
    expect(api.checkGitConnection).toHaveBeenCalledWith({
      gitUrl: 'https://g/o/r',
      credentialType: 'NONE',
      username: 'me',
      secret: null,
      githubApiUrl: 'https://api.x',
    });
  });

  it('omits empty optional credentials from the test', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({ gitStatus: 'ACCESSIBLE', warnings: [] });
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await clickAsync(screen.getByText('Test connection'));
    expect(api.checkGitConnection).toHaveBeenCalledWith({
      gitUrl: 'https://g/o/r',
      credentialType: 'NONE',
      username: undefined,
      secret: null,
      githubApiUrl: undefined,
    });
  });

  it('asks for a Git URL before testing, without calling the API', async () => {
    await fillBasics();
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Git URL is required');
    expect(api.checkGitConnection).not.toHaveBeenCalled();
  });

  it('shows a generic message when the test is not reachable and gives no reason', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({
      gitStatus: 'NOT_ACCESSIBLE',
      warnings: [],
    });
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The repository could not be reached.',
    );
  });

  it('shows a fallback for an unknown host warning', async () => {
    vi.mocked(api.checkGitConnection).mockResolvedValue({
      gitStatus: 'ACCESSIBLE',
      warnings: ['host_new_kind'],
    });
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByText('The host needs attention.')).toBeInTheDocument();
  });

  it('reports a test that throws, and clears the result once the input changes', async () => {
    vi.mocked(api.checkGitConnection).mockRejectedValue(new Error('net'));
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await clickAsync(screen.getByText('Test connection'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The connection test failed.');
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/x' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('switches back to an existing repository and drops spec init for a new one', async () => {
    await fillBasics();
    await chooseNewRepo();
    expect(screen.queryByLabelText(/Git URL/)).not.toBeInTheDocument();
    chooseOption(screen.getByRole('combobox', { name: /Repository/ }), 'Existing repository');
    expect(screen.getByLabelText(/Git URL/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await next();
    fireEvent.click(screen.getByRole('checkbox'));
    await clickAsync(screen.getByText('Back'));
    await chooseNewRepo();
    await next();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('names the failing call when saving credentials throws without a message', async () => {
    vi.mocked(api.saveGitCredentials).mockRejectedValue(new Error(''));
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    chooseOption(screen.getByRole('combobox', { name: /Type/ }), 'GitHub PAT');
    fireEvent.change(screen.getByLabelText('Secret / token / password'), {
      target: { value: 's3cret' },
    });
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Project "Alpha" was created');
    expect(api.triggerGitCheck).not.toHaveBeenCalled();
  });

  it('falls back to the generic create error for a non-Error rejection', async () => {
    vi.mocked(api.createProject).mockRejectedValue('nope');
    await fillBasics();
    await chooseNewRepo();
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create the project.');
  });

  it('reports a failing spec initialisation and keeps the other results', async () => {
    vi.mocked(api.initSpecFolder).mockRejectedValue(new Error('no spec'));
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await next();
    fireEvent.click(screen.getByRole('checkbox'));
    await next();
    await clickAsync(screen.getByText('Create project'));
    expect(await screen.findByRole('alert')).toHaveTextContent('no spec');
  });

  it('hides Continue anyway while a call is still running', async () => {
    vi.mocked(api.initSpecFolder).mockReturnValue(new Promise(() => {}));
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    await next();
    fireEvent.click(screen.getByRole('checkbox'));
    await next();
    await clickAsync(screen.getByText('Create project'));
    expect(await screen.findByText('Retry')).toBeDisabled();
    expect(screen.queryByText('Continue anyway')).not.toBeInTheDocument();
  });

  it('leaves straight away when nothing was entered', async () => {
    await renderHub(<ProjectWizard />);
    await clickAsync(screen.getByText('Cancel'));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/projects$/);
  });

  it('leaves without asking once creation has started', async () => {
    vi.mocked(api.createProject).mockRejectedValue(new Error('boom'));
    await fillBasics();
    await chooseNewRepo();
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));
    await screen.findByRole('alert');
    await clickAsync(screen.getByTitle('Back to projects'));
    expect(screen.queryByText('Leave without creating?')).not.toBeInTheDocument();
  });

  it('submits from the keyboard on the review step', async () => {
    await fillBasics();
    await chooseNewRepo();
    await next();
    await next();
    fireEvent.submit(screen.getByText('Create project').closest('form')!);
    expect(await screen.findByText('Project created')).toBeInTheDocument();
  });

  it('adds the project to the cached list in name order and records credentials and Git status', async () => {
    const client = createTestQueryClient();
    client.setQueryData(ALL_PROJECTS_KEY, [
      project({ id: 'z', name: 'Zed' }),
      project({ id: 'a', name: 'Aaa' }),
    ]);
    await renderHub(<ProjectWizard />, { client });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Mid' } });
    await next();
    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'https://g/o/r' } });
    chooseOption(screen.getByRole('combobox', { name: /Type/ }), 'GitHub PAT');
    await next();
    await next();
    await clickAsync(screen.getByText('Create project'));
    await screen.findByText('Project created');

    const cached = client.getQueryData<ReturnType<typeof project>[]>(ALL_PROJECTS_KEY)!;
    expect(cached.map((p) => p.name)).toEqual(['Aaa', 'Mid', 'Zed']);
    expect(cached.find((p) => p.id === 'p9')).toMatchObject({
      hasCredentials: true,
      gitStatus: 'ACCESSIBLE',
    });
    expect(cached.find((p) => p.id === 'a')?.hasCredentials).toBe(false);
    // An empty secret is sent as null, not as an empty string.
    expect(api.saveGitCredentials).toHaveBeenCalledWith(
      'p9',
      expect.objectContaining({ credentialType: 'GITHUB_PAT', secret: null }),
    );
  });

  it('renders under its own translations as the route element', async () => {
    await renderHub(<ProjectWizardRoute />);
    expect(
      await screen.findByText('Set up a project step by step', { exact: false }),
    ).toBeInTheDocument();
  });
});
