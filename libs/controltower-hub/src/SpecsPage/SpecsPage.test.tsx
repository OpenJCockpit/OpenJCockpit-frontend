import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { RECONCILE_INTERVAL_MS } from '../hooks';
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
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and push branch' }));
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
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-cancel'));
    expect(ct.approveControlTowerSpec).not.toHaveBeenCalled();
  });

  it('shows why an approval failed', async () => {
    ct.approveControlTowerSpec.mockRejectedValue(new Error('Policy denied: four eyes'));
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Policy denied: four eyes');
  });

  it('marks a dispatched spec as done', async () => {
    ct.completeControlTowerSpec.mockResolvedValue({ ...SPEC_DISPATCHED, status: 'DONE' });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Logout'));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark done manually' }));
    expect(await screen.findByText(/Marked as done/)).toBeInTheDocument();
    expect(ct.completeControlTowerSpec).toHaveBeenCalledWith('s2');
  });

  it('reports a non-Error failure as text', async () => {
    ct.completeControlTowerSpec.mockRejectedValue('plain failure');
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Logout'));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark done manually' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('plain failure');
  });

  it('hides the write actions from a viewer', async () => {
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    fireEvent.click(await screen.findByText('Login page'));
    expect(await screen.findByText('# Login')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and push branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark done manually' })).toBeNull();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByText(/Spec pushed to branch \./)).toBeInTheDocument();
  });

  it('lists the newest specification first', async () => {
    const approved = { ...SPEC_DRAFT, status: 'APPROVED' as const };
    ct.listControlTowerSpecs.mockResolvedValue([
      { ...approved, id: 'a', title: 'First', specPath: '001-first/spec.md' },
      { ...approved, id: 'b', title: 'Tenth', specPath: '010-tenth/spec.md' },
      { ...approved, id: 'c', title: 'Second', specPath: '002-second/spec.md' },
    ]);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Tenth');
    const html = document.body.textContent ?? '';
    expect(html.indexOf('Tenth')).toBeLessThan(html.indexOf('Second'));
    expect(html.indexOf('Second')).toBeLessThan(html.indexOf('First'));
  });

  it('groups specifications by status: draft, approved, dispatched, done', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([
      { ...SPEC_DRAFT, id: 'a', title: 'Alpha', status: 'DONE', specPath: '004-a/spec.md' },
      { ...SPEC_DRAFT, id: 'b', title: 'Bravo', status: 'DISPATCHED', specPath: '003-b/spec.md' },
      { ...SPEC_DRAFT, id: 'c', title: 'Charlie', status: 'APPROVED', specPath: '002-c/spec.md' },
      { ...SPEC_DRAFT, id: 'd', title: 'Delta', status: 'DRAFT', specPath: '001-d/spec.md' },
    ]);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Delta');
    const text = document.body.textContent ?? '';
    const order = ['Delta', 'Charlie', 'Bravo', 'Alpha'].map((t) => text.indexOf(t));
    expect(order).toEqual([...order].sort((x, y) => x - y));
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

  it('opens a detail screen with a link back to the list', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    expect(router.state.location.pathname).toBe('/controltower/specs/s1');
    expect(await screen.findByText('# Login')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to specifications' }));
    expect(router.state.location.pathname).toBe('/controltower/specs');
  });

  it('links dependencies and dependents between detail screens', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Logout'));
    fireEvent.click(await screen.findByRole('link', { name: 'Login page' }));
    expect(router.state.location.pathname).toBe('/controltower/specs/s1');
    expect(await screen.findByText('Blocks:')).toBeInTheDocument();
  });

  it('links a specification to the interview it came from', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(await screen.findByRole('link', { name: 'Kick-off' }));
    expect(router.state.location.pathname).toBe('/controltower/interviews/i1');
  });

  it('says so when the specification does not exist', async () => {
    renderRoutes(controltowerRoutes, { path: `${path}/nope` });
    expect(await screen.findByText('This specification no longer exists.')).toBeInTheDocument();
  });

  it('copies the branch name', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Logout'));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy branch name' }));
    expect(writeText).toHaveBeenCalledWith('spec/s2');
    expect(await screen.findAllByText('Copied')).not.toHaveLength(0);
  });

  it('lists drafts after the drafts they depend on', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([
      { ...SPEC_DRAFT, id: 'a', title: 'Alpha', specPath: '001-a/spec.md', dependsOn: ['b'] },
      { ...SPEC_DRAFT, id: 'b', title: 'Bravo', specPath: '002-b/spec.md', dependsOn: [] },
    ]);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Alpha');
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Bravo')).toBeLessThan(text.indexOf('Alpha'));
  });

  describe('bulk approval', () => {
    const drafts = [
      { ...SPEC_DRAFT, id: 'a', title: 'Alpha', specPath: '001-a/spec.md', dependsOn: ['b'] },
      { ...SPEC_DRAFT, id: 'b', title: 'Bravo', specPath: '002-b/spec.md', dependsOn: [] },
    ];

    it('approves the selected drafts in dependency order after one confirmation', async () => {
      ct.listControlTowerSpecs.mockResolvedValue(drafts);
      ct.approveControlTowerSpec.mockResolvedValue({ ...SPEC_DRAFT, status: 'APPROVED' });
      renderRoutes(controltowerRoutes, { path });
      fireEvent.click(await screen.findByLabelText('Select all drafts'));
      fireEvent.click(screen.getByRole('button', { name: 'Approve selected (2)' }));
      fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
      expect(await screen.findByText(/2 specs pushed to Git/)).toBeInTheDocument();
      expect(ct.approveControlTowerSpec.mock.calls.map(([id]) => id)).toEqual(['b', 'a']);
    });

    it('approves only the ticked draft', async () => {
      ct.listControlTowerSpecs.mockResolvedValue(drafts);
      ct.approveControlTowerSpec.mockResolvedValue({ ...SPEC_DRAFT, status: 'APPROVED' });
      renderRoutes(controltowerRoutes, { path });
      expect(await screen.findByRole('button', { name: 'Approve selected (0)' })).toBeDisabled();
      fireEvent.click(await screen.findByLabelText('Select Alpha'));
      fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }));
      fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
      expect(await screen.findByText(/1 spec pushed to Git/)).toBeInTheDocument();
      expect(ct.approveControlTowerSpec).toHaveBeenCalledTimes(1);
      expect(ct.approveControlTowerSpec).toHaveBeenCalledWith('a');
    });

    it('stops at the first failure and says how far it got', async () => {
      ct.listControlTowerSpecs.mockResolvedValue(drafts);
      ct.approveControlTowerSpec
        .mockResolvedValueOnce({ ...SPEC_DRAFT, status: 'APPROVED' })
        .mockRejectedValueOnce(new Error('Policy denied'));
      renderRoutes(controltowerRoutes, { path });
      fireEvent.click(await screen.findByLabelText('Select all drafts'));
      fireEvent.click(screen.getByRole('button', { name: 'Approve selected (2)' }));
      fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '"Alpha" could not be approved: Policy denied (1 approved before it.)',
      );
      expect(ct.approveControlTowerSpec).toHaveBeenCalledTimes(2);
    });

    it('is hidden from a viewer', async () => {
      ct.listControlTowerSpecs.mockResolvedValue(drafts);
      renderRoutes(controltowerRoutes, { path, permissions: [] });
      await screen.findByText('Alpha');
      expect(screen.queryByLabelText('Select all drafts')).toBeNull();
    });
  });
});

describe('reconciling dispatched specs', () => {
  it('asks the backend and refreshes the specs when one finished', async () => {
    ct.reconcileControlTowerSpecs.mockResolvedValue([{ ...SPEC_DISPATCHED, status: 'DONE' }]);
    renderRoutes(controltowerRoutes, { path: '/controltower/specs' });
    await vi.waitFor(() => expect(ct.reconcileControlTowerSpecs).toHaveBeenCalledWith('r1'));
    await vi.waitFor(() => expect(ct.listControlTowerSpecs.mock.calls.length).toBeGreaterThan(1));
    expect(ct.reconcileControlTowerSpecs).toHaveBeenCalledTimes(1);
  });

  it('checks again periodically while specs are dispatched', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      renderRoutes(controltowerRoutes, { path: '/controltower/specs' });
      await vi.waitFor(() => expect(ct.reconcileControlTowerSpecs).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(RECONCILE_INTERVAL_MS);
      expect(ct.reconcileControlTowerSpecs).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays quiet when the check fails', async () => {
    ct.reconcileControlTowerSpecs.mockRejectedValue(new Error('cockpit down'));
    renderRoutes(controltowerRoutes, { path: '/controltower/specs' });
    await vi.waitFor(() => expect(ct.reconcileControlTowerSpecs).toHaveBeenCalled());
    expect(screen.queryByText('cockpit down')).toBeNull();
  });
});
