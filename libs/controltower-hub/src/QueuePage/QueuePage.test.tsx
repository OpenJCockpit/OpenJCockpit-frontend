import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes } from '../testUtils';

describe('dispatch queue', () => {
  const path = '/controltower/queue';

  it('dispatches only after the branches are confirmed as merged', async () => {
    ct.dispatchControlTowerSpecs.mockResolvedValue([{ specId: 's2', result: 'DISPATCHED' }]);
    renderRoutes(controltowerRoutes, { path });
    const button = await screen.findByRole('button', { name: 'Dispatch ready specs' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
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
    fireEvent.click(await screen.findByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Dispatch ready specs' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
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
});
