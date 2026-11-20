import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes } from '../testUtils';

describe('shell chrome', () => {
  it('names the repository and links to its settings outside the overview', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/queue' });
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Repository settings' })).toHaveAttribute(
      'href',
      '/project-settings/controltower-repository',
    );
  });

  it('says on every page that a viewer cannot change anything', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/specs', permissions: [] });
    expect(
      await screen.findByText(/Only operators and administrators can make changes/),
    ).toBeInTheDocument();
  });

  it('does not show the read-only note to someone who can write', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/specs' });
    await screen.findByText('Specification registry');
    expect(screen.queryByText(/Only operators and administrators/)).toBeNull();
  });
});

describe('routing', () => {
  it('sends the user to project selection without a project', async () => {
    renderRoutes(controltowerRoutes, { project: null });
    expect(await screen.findByText('project selection')).toBeInTheDocument();
  });

  it('shows the templates without a project', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/templates', project: null });
    expect(await screen.findByText('Standard project')).toBeInTheDocument();
  });

  it('offers to connect a repository when none is linked', async () => {
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    renderRoutes(controltowerRoutes);
    const link = await screen.findByRole('link', { name: 'Connect a repository' });
    expect(link).toHaveAttribute('href', '/project-settings/controltower-repository');
  });

  it('retries a failed repository lookup', async () => {
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('down'));
    renderRoutes(controltowerRoutes);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
  });

  it('navigates between the tabs', async () => {
    renderRoutes(controltowerRoutes, {
      path: '/controltower',
    });
    fireEvent.click(await screen.findByRole('link', { name: /^Specifications/ }));
    expect(await screen.findByText('Specification registry')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Specifications/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('orders the tabs along the workflow', async () => {
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    const names = screen
      .getAllByRole('link')
      .map((link) => link.textContent ?? '')
      .map((text) => text.replace(/\d+$/, ''));
    const order = [
      'Overview',
      'Discovery interviews',
      'Specifications',
      'Dispatch queue',
      'Dependency graph',
      'Templates',
    ];
    const at = order.map((name) => names.findIndex((text) => text === name));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('goes back to the dashboard without the host header', async () => {
    const { router } = renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });
});

describe('retrying a failed load', () => {
  it.each([
    ['/controltower/specs', 'listControlTowerSpecs', 'Login page'],
    ['/controltower/graph', 'getControlTowerGraph', 'Login page'],
    ['/controltower/queue', 'getControlTowerQueueProposal', 'Logout'],
    ['/controltower/interviews', 'listControlTowerInterviews', 'Kick-off'],
    ['/controltower/templates', 'listControlTowerTemplates', 'Standard project'],
    ['/controltower/templates', 'listControlTowerSpecTemplates', 'Default'],
  ])('%s after %s fails', async (path, request, shown) => {
    // The tab badge and the page share the query and the page loads lazily, so fail every call until
    // the Retry button is on screen instead of counting on which of them asks first.
    const answer = await (ct[request]! as unknown as () => Promise<unknown>)();
    ct[request]!.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    const retry = await screen.findByRole('button', { name: 'Retry' });
    ct[request]!.mockResolvedValue(answer);
    fireEvent.click(retry);
    expect(await screen.findByText(shown)).toBeInTheDocument();
  });
});

describe('translations', () => {
  it('renders in another language', async () => {
    renderRoutes(controltowerRoutes, { locale: 'nl' });
    expect(await screen.findByText('Zo werkt het')).toBeInTheDocument();
  });
});
