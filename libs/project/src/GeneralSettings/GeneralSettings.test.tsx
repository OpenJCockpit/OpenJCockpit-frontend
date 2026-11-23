import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { ALL_PROJECTS_KEY } from '../projectCache';
import { clickAsync } from '../testUtils';
import { project, renderHub } from '../testHub';
import GeneralSettings from './GeneralSettings';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

describe('GeneralSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills the form from the selected project and saves the whole project', async () => {
    const beta = project();
    const { client } = await renderHub(<GeneralSettings />, { selected: beta });
    client.setQueryData(ALL_PROJECTS_KEY, [beta, project({ id: 'p2', name: 'Gamma' })]);
    vi.mocked(api.updateProject).mockImplementation(async (id, req) =>
      project({ id, name: req.name }),
    );

    const name = await screen.findByPlaceholderText('Project name');
    expect(name).toHaveValue('Beta');
    expect(screen.getByPlaceholderText('Name or team')).toHaveValue('team-b');
    fireEvent.change(name, { target: { value: 'Beta 2' } });
    await clickAsync(screen.getByText('Save'));

    expect(api.updateProject).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Beta 2', customerId: 'cust', gitUrl: beta.gitUrl }),
    );
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(client.getQueryData<api.Project[]>(ALL_PROJECTS_KEY)?.map((p) => p.name)).toEqual([
      'Beta 2',
      'Gamma',
    ]);

    fireEvent.change(name, { target: { value: 'Beta 3' } });
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('falls back to empty values for missing optional fields', async () => {
    await renderHub(<GeneralSettings />, {
      selected: project({
        customerId: undefined,
        gitUrl: undefined,
        description: undefined,
        defaultBranch: undefined,
        environment: undefined,
        owner: undefined,
      }),
    });
    expect(await screen.findByPlaceholderText('e.g. noordzee-logistics')).toHaveValue('');
  });

  it('shows a save error', async () => {
    await renderHub(<GeneralSettings />, { selected: project() });
    vi.mocked(api.updateProject).mockRejectedValue(new Error('500'));
    fireEvent.change(await screen.findByPlaceholderText('Project name'), {
      target: { value: 'Beta 2' },
    });
    await clickAsync(screen.getByText('Save'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save the project.');
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('requires a name and focuses it', async () => {
    await renderHub(<GeneralSettings />, { selected: project() });
    const name = await screen.findByPlaceholderText('Project name');
    fireEvent.change(name, { target: { value: '  ' } });
    await clickAsync(screen.getByText('Save'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Name is required.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(api.updateProject).not.toHaveBeenCalled();
  });

  it('keeps Save and Reset disabled until something changes, and Reset restores the project', async () => {
    await renderHub(<GeneralSettings />, { selected: project() });
    const name = await screen.findByPlaceholderText('Project name');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();

    fireEvent.change(name, { target: { value: 'Other' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(name).toHaveValue('Beta');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('clears the name error on Reset', async () => {
    await renderHub(<GeneralSettings />, { selected: project() });
    const name = await screen.findByPlaceholderText('Project name');
    fireEvent.change(name, { target: { value: ' ' } });
    await clickAsync(screen.getByText('Save'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
  });
});
