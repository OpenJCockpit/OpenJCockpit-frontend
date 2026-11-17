import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

describe('specifications', () => {
  const path = '/controltower/specs';

  it('approves a draft after confirming', async () => {
    ct.approveControlTowerSpec.mockResolvedValue({
      ...SPEC_DRAFT,
      status: 'APPROVED',
      branch: 'spec/s1',
    });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByText(/pushed to branch spec\/s1/)).toBeInTheDocument();
    expect(ct.approveControlTowerSpec).toHaveBeenCalledWith('s1');
    expect(screen.getByRole('link', { name: 'Go to the dispatch queue' })).toHaveAttribute(
      'href',
      '/controltower/queue',
    );
  });

  it('does not approve when the confirmation is cancelled', async () => {
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Login page');
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-cancel'));
    expect(ct.approveControlTowerSpec).not.toHaveBeenCalled();
  });

  it('shows why an approval failed', async () => {
    ct.approveControlTowerSpec.mockRejectedValue(new Error('Policy denied: four eyes'));
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Login page');
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Policy denied: four eyes');
  });

  it('marks a dispatched spec as done', async () => {
    ct.completeControlTowerSpec.mockResolvedValue({ ...SPEC_DISPATCHED, status: 'DONE' });
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Logout');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm externally completed' }));
    expect(await screen.findByText(/Marked as done/)).toBeInTheDocument();
    expect(ct.completeControlTowerSpec).toHaveBeenCalledWith('s2');
  });

  it('reports a non-Error failure as text', async () => {
    ct.completeControlTowerSpec.mockRejectedValue('plain failure');
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Logout');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm externally completed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('plain failure');
  });

  it('hides the write actions from a viewer', async () => {
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    await screen.findByText('Login page');
    expect(screen.queryByRole('button', { name: 'Approve and push branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm externally completed' })).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.listControlTowerSpecs.mockResolvedValueOnce([]);
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/generate your first spec drafts/)).toBeInTheDocument();
    first.unmount();
    ct.listControlTowerSpecs.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the specifications.')).toBeInTheDocument();
  });

  it('names no branch when an approval returns none', async () => {
    ct.approveControlTowerSpec.mockResolvedValue({
      ...SPEC_DRAFT,
      status: 'APPROVED',
      branch: null,
    });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByText(/Spec pushed to branch \./)).toBeInTheDocument();
  });
});
