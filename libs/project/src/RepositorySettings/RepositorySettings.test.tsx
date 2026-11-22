import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { chooseOption } from '@openjcockpit/ui/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type { Project } from '@openjcockpit/api';
import { ALL_PROJECTS_KEY } from '../projectCache';
import { clickAsync } from '../testUtils';
import { project, renderHub } from '../testHub';
import RepositorySettings from './RepositorySettings';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

const NO_CREDENTIALS = { credentialType: 'NONE', hasSecret: false } as const;

async function renderRepository(selected = project()) {
  const other = project({ id: 'p2', name: 'Gamma', hasCredentials: true });
  const result = await renderHub(<RepositorySettings />, { selected });
  result.client.setQueryData(ALL_PROJECTS_KEY, [selected, other]);
  await screen.findByText('Type');
  const cached = () => result.client.getQueryData<Project[]>(ALL_PROJECTS_KEY)!;
  return { ...result, cached };
}

describe('RepositorySettings: repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getGitCredentials).mockResolvedValue(NO_CREDENTIALS);
  });

  it('prefills Git URL and branch and saves the whole project', async () => {
    await renderRepository();
    vi.mocked(api.updateProject).mockImplementation(async (id, req) =>
      project({ id, gitUrl: req.gitUrl }),
    );
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://github.com/org/new' },
    });
    expect(screen.getByPlaceholderText('main')).toHaveValue('develop');
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[0]!);

    expect(api.updateProject).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ gitUrl: 'https://github.com/org/new', name: 'Beta' }),
    );
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows a save error', async () => {
    await renderRepository();
    vi.mocked(api.updateProject).mockRejectedValue(new Error('500'));
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save the project.');
  });

  it('applies the git check result to the selected project only', async () => {
    const { cached } = await renderRepository(project({ gitStatusMessage: 'old' }));
    vi.mocked(api.triggerGitCheck).mockResolvedValue({
      projectId: 'p1',
      gitStatus: 'ACCESSIBLE',
      gitStatusCheckedAt: '2026-02-02T00:00:00Z',
      gitStatusMessage: 'all good',
    });
    expect(screen.getByText('old')).toBeInTheDocument();
    await clickAsync(screen.getByRole('button', { name: 'Git check' }));

    expect(api.triggerGitCheck).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(cached()[0]).toMatchObject({ gitStatusMessage: 'all good' }));
    expect(cached()[1]).not.toHaveProperty('gitStatusMessage', 'all good');
  });

  it('disables the git check button while it runs', async () => {
    await renderRepository();
    let resolve!: (v: api.ProjectGitStatusDto) => void;
    vi.mocked(api.triggerGitCheck).mockReturnValue(new Promise((r) => (resolve = r)));
    await clickAsync(screen.getByRole('button', { name: 'Git check' }));
    expect(screen.getByRole('button', { name: 'Git check' })).toBeDisabled();
    resolve({ gitStatus: 'ACCESSIBLE' } as api.ProjectGitStatusDto);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Git check' })).toBeEnabled(),
    );
  });

  it('shows an error when the git check fails', async () => {
    await renderRepository();
    vi.mocked(api.triggerGitCheck).mockRejectedValue(new Error('x'));
    await clickAsync(screen.getByRole('button', { name: 'Git check' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to check the Git repository.',
    );
    expect(screen.getByRole('button', { name: 'Git check' })).toBeEnabled();
  });
});

describe('RepositorySettings: credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getGitCredentials).mockResolvedValue(NO_CREDENTIALS);
  });

  it('populates the form with the existing credential', async () => {
    vi.mocked(api.getGitCredentials).mockResolvedValue({
      credentialType: 'GITHUB_PAT',
      username: 'ci-bot',
      githubApiUrl: 'https://github.example.com/api/v3',
      hasSecret: true,
    });
    await renderRepository();

    expect(api.getGitCredentials).toHaveBeenCalledWith('p1');
    expect(screen.getByDisplayValue('ci-bot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://github.example.com/api/v3')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Type/ })).toHaveTextContent('GitHub PAT');
    // The secret is never sent back: the field starts blank with a hint that one is set.
    expect(screen.getByPlaceholderText('Leave empty to keep the current secret')).toHaveValue('');
  });

  it('shows a "required" placeholder for the secret when no credential exists yet', async () => {
    await renderRepository();
    expect(screen.getByPlaceholderText('Required — no secret set yet')).toBeInTheDocument();
  });

  it('shows the load error and does not crash', async () => {
    vi.mocked(api.getGitCredentials).mockRejectedValue(new Error('network error'));
    await renderHub(<RepositorySettings />, { selected: project() });
    expect(await screen.findByText('Failed to load existing credentials.')).toBeInTheDocument();
  });

  it('shows the backend message when saving is refused', async () => {
    await renderRepository();
    vi.mocked(api.saveGitCredentials).mockRejectedValue(
      new Error('Git credentials could not be verified: Authentication failed'),
    );
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[1]!);
    expect(
      await screen.findByText('Git credentials could not be verified: Authentication failed'),
    ).toBeInTheDocument();
  });

  it('uses a generic message when saving fails with a non-Error', async () => {
    await renderRepository();
    vi.mocked(api.saveGitCredentials).mockRejectedValue('nope');
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[1]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save credentials.');
  });

  it('sends null when the secret is left empty and marks only this project as having credentials', async () => {
    vi.mocked(api.getGitCredentials).mockResolvedValue({
      credentialType: 'GITHUB_PAT',
      hasSecret: true,
    });
    vi.mocked(api.saveGitCredentials).mockResolvedValue(undefined);
    const { cached } = await renderRepository();

    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[1]!);

    expect(api.saveGitCredentials).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ credentialType: 'GITHUB_PAT', secret: null }),
    );
    await waitFor(() => expect(cached()[0]).toMatchObject({ hasCredentials: true }));
    expect(cached()[1]).toMatchObject({ hasCredentials: true, name: 'Gamma' });
    // Nothing was typed and a secret was already stored, so the hint stays.
    expect(
      screen.getByPlaceholderText('Leave empty to keep the current secret'),
    ).toBeInTheDocument();
  });

  it('sends a typed secret, then clears it from the form and keeps the hint', async () => {
    vi.mocked(api.saveGitCredentials).mockResolvedValue(undefined);
    await renderRepository();

    chooseOption(screen.getByRole('combobox', { name: /Type/ }), 'HTTPS Token');
    fireEvent.change(screen.getByPlaceholderText('Required — no secret set yet'), {
      target: { value: 's3cret' },
    });
    fireEvent.change(screen.getByPlaceholderText('optional'), { target: { value: 'bot' } });
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[1]!);

    expect(api.saveGitCredentials).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ credentialType: 'HTTPS_TOKEN', secret: 's3cret', username: 'bot' }),
    );
    const secret = await screen.findByPlaceholderText('Leave empty to keep the current secret');
    expect(secret).toHaveValue('');
  });

  it('keeps asking for a secret when none was typed and none is stored', async () => {
    vi.mocked(api.saveGitCredentials).mockResolvedValue(undefined);
    await renderRepository();
    await clickAsync(screen.getAllByRole('button', { name: 'Save' })[1]!);
    expect(screen.getByPlaceholderText('Required — no secret set yet')).toBeInTheDocument();
  });

  it('has nothing to delete without stored credentials', async () => {
    await renderRepository();
    expect(screen.queryByText('Delete credentials')).not.toBeInTheDocument();
  });

  it('deletes credentials after confirmation and clears only this project', async () => {
    vi.mocked(api.getGitCredentials).mockResolvedValue({
      credentialType: 'GITHUB_PAT',
      username: 'bot',
      hasSecret: true,
    });
    vi.mocked(api.deleteGitCredentials).mockResolvedValue(undefined);
    const { cached } = await renderRepository(project({ hasCredentials: true }));

    await clickAsync(screen.getByText('Delete credentials'));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));

    expect(api.deleteGitCredentials).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(cached()[0]).toMatchObject({ hasCredentials: false }));
    expect(cached()[1]).toMatchObject({ hasCredentials: true });
    expect(screen.queryByDisplayValue('bot')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Required — no secret set yet')).toBeInTheDocument();
  });

  it('shows an error when deleting credentials fails', async () => {
    vi.mocked(api.deleteGitCredentials).mockRejectedValue(new Error('x'));
    await renderRepository(project({ hasCredentials: true }));
    await clickAsync(screen.getByText('Delete credentials'));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to delete credentials.');
  });
});

describe('RepositorySettings: leaving early', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ignores a credential load that finishes after the section is gone', async () => {
    let resolve!: (v: api.ProjectGitCredentialDto) => void;
    vi.mocked(api.getGitCredentials).mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = await renderHub(<RepositorySettings />, { selected: project() });
    unmount();
    await act(async () => resolve(NO_CREDENTIALS));
    expect(api.getGitCredentials).toHaveBeenCalledTimes(1);
  });

  it('ignores a credential load that fails after the section is gone', async () => {
    let reject!: (e: Error) => void;
    vi.mocked(api.getGitCredentials).mockReturnValue(new Promise((_, r) => (reject = r)));
    const { unmount } = await renderHub(<RepositorySettings />, { selected: project() });
    unmount();
    await act(async () => reject(new Error('late')));
    expect(api.getGitCredentials).toHaveBeenCalledTimes(1);
  });
});
