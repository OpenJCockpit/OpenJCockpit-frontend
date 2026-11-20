import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

describe('dispatch queue', () => {
  const path = '/controltower/queue';

  /** Ticks the merged checkbox and confirms the dialog. */
  async function dispatchThroughDialog() {
    fireEvent.click(await screen.findByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Dispatch ready specs' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dispatch ready specs' }));
    return dialog;
  }

  it('names the branches to merge before dispatch', async () => {
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/Branches to merge first:/)).toHaveTextContent('spec/s2');
    expect(screen.getByText(/Approving only pushes a branch/)).toBeInTheDocument();
  });

  it('dispatches only after the branches are confirmed as merged', async () => {
    ct.dispatchControlTowerSpecs.mockResolvedValue([{ specId: 's2', result: 'DISPATCHED' }]);
    renderRoutes(controltowerRoutes, { path });
    const button = await screen.findByRole('button', { name: 'Dispatch ready specs' });
    expect(button).toBeDisabled();
    await dispatchThroughDialog();
    expect(await screen.findByText('Dispatched')).toBeInTheDocument();
    expect(ct.dispatchControlTowerSpecs).toHaveBeenCalledWith('r1', true);
    expect(screen.getByRole('link', { name: 'Open the spec queue' })).toHaveAttribute(
      'href',
      '/spec-queue',
    );
  });

  it('shows why a dispatch failed', async () => {
    ct.dispatchControlTowerSpecs.mockRejectedValue(new Error('Dispatch freeze is on'));
    renderRoutes(controltowerRoutes, { path });
    await dispatchThroughDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('Dispatch freeze is on');
  });

  it('hides the dispatch from a viewer', async () => {
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    await screen.findByText('Logout');
    expect(screen.queryByRole('button', { name: 'Dispatch ready specs' })).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.getControlTowerQueueProposal.mockResolvedValueOnce([]);
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/Approve specs or finish/)).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerQueueProposal.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the dispatch queue.')).toBeInTheDocument();
  });

  it('explains why the dispatch is disabled', async () => {
    renderRoutes(controltowerRoutes, { path });
    expect(
      await screen.findByText(/Confirm that the spec branches are merged/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() =>
      expect(screen.queryByText(/Confirm that the spec branches are merged/)).toBeNull(),
    );
    ct.getControlTowerQueueProposal.mockResolvedValue([]);
    renderRoutes(controltowerRoutes, { path });
    expect((await screen.findAllByText(/no spec is ready yet/))[0]).toBeInTheDocument();
  });

  it('lists the specs that will be sent in the confirmation', async () => {
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Dispatch ready specs' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Logout')).toBeInTheDocument();
    expect(within(dialog).getByText(/sends 1 spec/)).toBeInTheDocument();
    expect(ct.dispatchControlTowerSpecs).not.toHaveBeenCalled();
  });

  it('shows one row per spec and warns only about UNKNOWN outcomes', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DISPATCHED]);
    ct.dispatchControlTowerSpecs.mockResolvedValue([
      { specId: 's2', result: 'DISPATCHED' },
      { specId: 's1', result: 'UNKNOWN' },
    ]);
    renderRoutes(controltowerRoutes, { path });
    expect(screen.queryByText(/never automatically retried/)).toBeNull();
    await dispatchThroughDialog();
    const status = await waitFor(() => {
      const found = screen.getAllByRole('status').find((el) => el.querySelector('li'));
      if (!found) throw new Error('no dispatch outcome yet');
      return found;
    });
    const rows = within(status).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Logout');
    expect(rows[0]).toHaveTextContent('Dispatched');
    expect(rows[1]).toHaveTextContent('Login page');
    expect(rows[1]).toHaveTextContent('Unknown');
    expect(screen.getByText(/never automatically retried/)).toBeInTheDocument();
  });

  it('keeps the last outcomes after leaving the page and links each to its spec', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DISPATCHED]);
    ct.dispatchControlTowerSpecs.mockResolvedValue([{ specId: 's2', result: 'DISPATCHED' }]);
    const first = renderRoutes(controltowerRoutes, { path });
    await dispatchThroughDialog();
    const link = await screen.findByRole('link', { name: 'Logout' });
    expect(link).toHaveAttribute('href', '/controltower/specs/s2');
    first.unmount();

    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByRole('link', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.getByText('Dispatched')).toBeInTheDocument();
  });

  it('lists approved specs that wait on a predecessor', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([
      SPEC_DRAFT,
      { ...SPEC_DISPATCHED, id: 's3', title: 'Profile', status: 'APPROVED', dependsOn: ['s1'] },
      { ...SPEC_DISPATCHED, id: 's2', title: 'Logout', status: 'APPROVED', dependsOn: [] },
    ]);
    renderRoutes(controltowerRoutes, { path });
    const section = await screen.findByRole('region', { name: 'Waiting on predecessors' });
    expect(within(section).getByText('Profile')).toBeInTheDocument();
    expect(within(section).queryByText('Logout')).toBeNull();
    expect(within(section).getByRole('link', { name: 'Login page' })).toHaveAttribute(
      'href',
      '/controltower/specs/s1',
    );
  });
});
