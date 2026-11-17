import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes } from '../testUtils';

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
    fireEvent.click(await screen.findByRole('button', { name: 'Specifications' }));
    expect(await screen.findByText('Specification registry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Specifications' })).toHaveAttribute(
      'aria-current',
      'page',
    );
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
    ct[request]!.mockRejectedValueOnce(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(shown)).toBeInTheDocument();
  });
});

describe('translations', () => {
  it('renders in another language', async () => {
    renderRoutes(controltowerRoutes, { locale: 'nl' });
    expect(await screen.findByText('Zo werkt het')).toBeInTheDocument();
  });
});
