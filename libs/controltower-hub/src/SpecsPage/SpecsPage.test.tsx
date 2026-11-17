import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

const SPEC_DRAFT_2 = { ...SPEC_DRAFT, id: 's3', title: 'Signup', dependsOn: [] };

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

  it('filters by status and search, and keeps the filter in the URL', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Login page');
    expect(screen.getByRole('button', { name: 'Draft (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dispatched (1)' }));
    expect(screen.queryByText('Login page')).toBeNull();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=DISPATCHED');
    fireEvent.change(screen.getByLabelText('Search by title or ID'), { target: { value: 'zzz' } });
    expect(screen.getByText('No specifications match this filter.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=DISPATCHED&q=zzz');
  });

  it('restores the filter from the URL', async () => {
    renderRoutes(controltowerRoutes, { path: `${path}?status=DRAFT&q=log` });
    await screen.findByText('Login page');
    expect(screen.queryByText('Logout')).toBeNull();
    expect(screen.getByRole('button', { name: 'Draft (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('links dependencies and dependents, and opens the linked spec', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Logout');
    fireEvent.click(screen.getByText('Logout'));
    fireEvent.click(screen.getByRole('link', { name: 's1' }));
    expect(router.state.location.search).toBe('?focus=s1');
    expect(document.getElementById('spec-s1')).toHaveProperty('open', true);
    expect(screen.getByText('Blocks:')).toBeInTheDocument();
  });

  it('copies the branch name', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Logout'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy branch name' }));
    expect(writeText).toHaveBeenCalledWith('spec/s2');
    expect(await screen.findAllByText('Copied')).not.toHaveLength(0);
  });

  describe('approve all drafts', () => {
    const bulk = () => {
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DRAFT_2]);
      renderRoutes(controltowerRoutes, { path });
    };

    it('approves every draft in sequence after one confirmation', async () => {
      ct.approveControlTowerSpec.mockResolvedValue({ ...SPEC_DRAFT, status: 'APPROVED' });
      bulk();
      fireEvent.click(await screen.findByRole('button', { name: 'Approve all drafts (2)' }));
      expect(await screen.findByRole('dialog')).toHaveTextContent('Signup');
      fireEvent.click(screen.getByTestId('confirm-action-confirm'));
      expect(await screen.findByText('2 specs pushed to their branches.')).toBeInTheDocument();
      expect(ct.approveControlTowerSpec.mock.calls).toEqual([['s1'], ['s3']]);
    });

    it('reports how many succeeded when one fails', async () => {
      ct.approveControlTowerSpec
        .mockResolvedValueOnce({ ...SPEC_DRAFT, status: 'APPROVED' })
        .mockRejectedValueOnce(new Error('push rejected'));
      bulk();
      fireEvent.click(await screen.findByRole('button', { name: 'Approve all drafts (2)' }));
      fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Approved 1 of 2. "Signup" failed: push rejected',
      );
    });

    it('is hidden from a viewer', async () => {
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DRAFT_2]);
      renderRoutes(controltowerRoutes, { path, permissions: [] });
      await screen.findByText('Login page');
      expect(screen.queryByRole('button', { name: /Approve all drafts/ })).toBeNull();
    });
  });
});
