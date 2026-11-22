import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { chooseOption } from '@openjcockpit/ui/testing';
import { clickAsync } from '../testUtils';
import { project, renderHub } from '../testHub';
import { ProjectWizard } from './ProjectWizard';

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
});
