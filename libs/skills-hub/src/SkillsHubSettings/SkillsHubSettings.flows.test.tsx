import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type { SkillsMarketplaceConnection } from '@openjcockpit/api';
import { SkillsHubSettings } from './SkillsHubSettings';
import { clickAsync, renderAsync } from '../testUtils';
import { withQueryClient } from '../testQueryClient';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

function connection(
  overrides: Partial<SkillsMarketplaceConnection> = {},
): SkillsMarketplaceConnection {
  return {
    id: 'mp-1',
    name: 'Acme Skills',
    marketplaceUrl: 'https://marketplace.example.com/api',
    description: 'Internal catalog',
    enabled: true,
    hasApiKey: true,
    createdBy: 'ricky',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-05T10:00:00Z',
    ...overrides,
  };
}

async function renderAt(route: string) {
  await act(async () => {
    render(withQueryClient(<SkillsHubSettings />, { route }));
  });
}

async function open(connections: SkillsMarketplaceConnection[]) {
  vi.mocked(api.listSkillsMarketplaces).mockResolvedValue(connections);
  await renderAsync(<SkillsHubSettings />);
  await screen.findByRole('button', { name: 'New marketplace' });
}

async function openAdd(connections: SkillsMarketplaceConnection[]) {
  await open(connections);
  await clickAsync(screen.getByRole('button', { name: 'New marketplace' }));
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function row(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('SkillsHubSettings — flows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a loading message while the list is pending', async () => {
    vi.mocked(api.listSkillsMarketplaces).mockReturnValue(new Promise(() => {}));
    await renderAsync(<SkillsHubSettings />);
    expect(screen.getByText('Loading marketplaces…')).toBeInTheDocument();
  });

  it('uses a generic message for a non-Error load failure', async () => {
    vi.mocked(api.listSkillsMarketplaces).mockRejectedValue('nope');
    await renderAsync(<SkillsHubSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load marketplaces.');
  });

  it('describes each connection in the table', async () => {
    await open([
      connection(),
      connection({ id: 'mp-2', name: 'Bare', description: null, hasApiKey: false, enabled: false }),
    ]);
    const full = row('Acme Skills');
    expect(within(full).getByText('Internal catalog')).toBeInTheDocument();
    expect(within(full).getByText('API key set')).toBeInTheDocument();
    expect(within(full).getByText('Enabled')).toBeInTheDocument();
    expect(within(full).getByText('Jan 5, 2026')).toBeInTheDocument();
    const bare = row('Bare');
    expect(within(bare).getByText('No API key')).toBeInTheDocument();
    expect(within(bare).getByText('Disabled')).toBeInTheDocument();
  });

  it('requires a name before saving', async () => {
    await openAdd([]);
    await clickAsync(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.');
    expect(api.createSkillsMarketplace).not.toHaveBeenCalled();
  });

  it('requires a marketplace URL before saving', async () => {
    await openAdd([]);
    type('Name *', 'Acme');
    await clickAsync(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Marketplace URL is required.');
    expect(api.createSkillsMarketplace).not.toHaveBeenCalled();
  });

  it('adds new connections in name order and announces the result', async () => {
    await openAdd([connection({ name: 'Zulu' })]);
    vi.mocked(api.createSkillsMarketplace).mockImplementation(async (req) =>
      connection({ id: 'mp-9', name: req.name }),
    );
    type('Name *', 'Alpha');
    type('Marketplace URL *', 'https://a.example.com');
    type('API key *', 'k');
    type('Description', 'desc');
    fireEvent.click(screen.getByRole('checkbox'));
    await clickAsync(screen.getByRole('button', { name: 'Save' }));

    expect(api.createSkillsMarketplace).toHaveBeenCalledWith({
      name: 'Alpha',
      marketplaceUrl: 'https://a.example.com',
      apiKey: 'k',
      description: 'desc',
      enabled: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Marketplace "Alpha" has been added.');
    const names = screen.getAllByRole('row').map((r) => r.textContent ?? '');
    expect(names.findIndex((t) => t.includes('Alpha'))).toBeLessThan(
      names.findIndex((t) => t.includes('Zulu')),
    );
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
  });

  it('prefills the form on edit and updates the row', async () => {
    await open([connection()]);
    vi.mocked(api.updateSkillsMarketplace).mockImplementation(async (id, req) =>
      connection({ id, name: req.name }),
    );
    await clickAsync(within(row('Acme Skills')).getByLabelText('Edit'));

    expect(screen.getByText('Edit marketplace')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toHaveValue('Acme Skills');
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('Internal catalog');

    type('Name *', 'Acme 2');
    await clickAsync(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateSkillsMarketplace).toHaveBeenCalledWith(
      'mp-1',
      expect.objectContaining({ name: 'Acme 2', apiKey: '' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Marketplace "Acme 2" has been updated.');
    expect(screen.getByRole('button', { name: 'New marketplace' })).toBeInTheDocument();
  });

  it('leaves other connections untouched when updating one', async () => {
    await open([connection(), connection({ id: 'mp-2', name: 'Zulu' })]);
    vi.mocked(api.updateSkillsMarketplace).mockImplementation(async (id, req) =>
      connection({ id, name: req.name }),
    );
    await clickAsync(within(row('Acme Skills')).getByLabelText('Edit'));
    type('Name *', 'Acme 2');
    await clickAsync(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Acme 2')).toBeInTheDocument();
    expect(screen.getByText('Zulu')).toBeInTheDocument();
  });

  it('edits a connection that has no description as an empty field', async () => {
    await open([connection({ description: null })]);
    await clickAsync(within(row('Acme Skills')).getByLabelText('Edit'));
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('can still add a marketplace after the list failed to load', async () => {
    vi.mocked(api.listSkillsMarketplaces).mockRejectedValue(new Error('down'));
    vi.mocked(api.createSkillsMarketplace).mockImplementation(async (req) =>
      connection({ id: 'mp-9', name: req.name }),
    );
    await renderAsync(<SkillsHubSettings />);
    await screen.findByRole('alert');
    await clickAsync(screen.getByRole('button', { name: 'New marketplace' }));
    type('Name *', 'Alpha');
    type('Marketplace URL *', 'https://a.example.com');
    type('API key *', 'k');
    await clickAsync(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('status')).toHaveTextContent('Marketplace "Alpha" has been added.');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('asks for a key on edit when the connection has none', async () => {
    await open([connection({ hasApiKey: false })]);
    await clickAsync(within(row('Acme Skills')).getByLabelText('Edit'));
    expect(screen.getByPlaceholderText('Required — no API key set yet')).toBeInTheDocument();
  });

  it('keeps the add and edit forms on their own screens, apart from the list', async () => {
    await open([connection()]);
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();

    await clickAsync(screen.getByRole('button', { name: 'New marketplace' }));
    expect(screen.getByLabelText('Name *')).toHaveValue('');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await clickAsync(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('table')).toBeInTheDocument();

    await clickAsync(within(row('Acme Skills')).getByLabelText('Edit'));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await clickAsync(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server message when saving fails, and a fallback for non-Errors', async () => {
    await openAdd([]);
    type('Name *', 'A');
    type('Marketplace URL *', 'u');
    vi.mocked(api.createSkillsMarketplace).mockRejectedValueOnce(new Error('duplicate url'));
    await clickAsync(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('duplicate url');
    expect(screen.getByLabelText('Name *')).toHaveValue('A');

    vi.mocked(api.createSkillsMarketplace).mockRejectedValueOnce('boom');
    await clickAsync(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save the marketplace.');
  });

  it('falls back to a generic message when deleting fails with a non-Error', async () => {
    await open([connection()]);
    vi.mocked(api.deleteSkillsMarketplace).mockRejectedValue('boom');
    await clickAsync(screen.getByRole('button', { name: 'Delete' }));
    await clickAsync(screen.getByTestId('confirm-action-confirm'));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete the marketplace.');
    expect(screen.getByText('Acme Skills')).toBeInTheDocument();
  });

  it('waits for the list before showing the edit form of a deep link', async () => {
    vi.mocked(api.listSkillsMarketplaces).mockReturnValue(new Promise(() => {}));
    await renderAt('/mp-1/edit');
    expect(screen.getByText('Loading marketplaces…')).toBeInTheDocument();
  });

  it('sends a deep link to an unknown marketplace back to the list', async () => {
    vi.mocked(api.listSkillsMarketplaces).mockResolvedValue([connection()]);
    await renderAt('/nope/edit');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'New marketplace' })).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
  });
});
