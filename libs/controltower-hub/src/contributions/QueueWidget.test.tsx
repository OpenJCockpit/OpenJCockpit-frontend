import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@openjcockpit/api';
import { controltowerApp } from '../index';
import { ct, renderRoutes, renderWith } from '../testUtils';

describe('queue widget', () => {
  async function Widget() {
    return (await controltowerApp.widgets![0]!.component()).default;
  }

  it('shows how many specs are ready and links to the queue', async () => {
    const W = await Widget();
    renderRoutes([{ index: true, element: <W /> }]);
    const link = await screen.findByRole('link', { name: /spec ready to dispatch/ });
    expect(link).toHaveAttribute('href', '/controltower/queue');
    expect(ct.getControlTowerQueueProposal).toHaveBeenCalledWith('r1', expect.anything());
  });

  it('asks for a project', async () => {
    const W = await Widget();
    renderWith(<W />, { project: null });
    expect(await screen.findByTestId('controltower-widget-no-project')).toBeInTheDocument();
    expect(ct.getControlTowerProjectByCockpitProject).not.toHaveBeenCalled();
  });

  it('says when the project has no repository', async () => {
    const W = await Widget();
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    renderWith(<W />);
    expect(await screen.findByText('No repository is linked to this project.')).toBeInTheDocument();
  });

  it('retries a failed load, for either request', async () => {
    const W = await Widget();
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('x'));
    const first = renderRoutes([{ index: true, element: <W /> }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link')).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerQueueProposal.mockRejectedValueOnce(new Error('x'));
    renderRoutes([{ index: true, element: <W /> }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link')).toBeInTheDocument();
  });

  it('shows a muted unavailable state, not an error card, when the backend is down', async () => {
    const W = await Widget();
    ct.getControlTowerProjectByCockpitProject.mockRejectedValue(
      new ApiError('down', 502, 'SERVICE_UNAVAILABLE'),
    );
    renderRoutes([{ index: true, element: <W /> }]);
    expect(await screen.findByTestId('controltower-widget-unavailable')).toHaveTextContent(
      'Control Tower is not reachable',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
