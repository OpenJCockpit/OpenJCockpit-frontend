import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@openjcockpit/api';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, REPOSITORY, renderRoutes } from '../testUtils';

describe('repository gate when the backend is down', () => {
  it('shows one unavailable state with Retry instead of a load-failed text', async () => {
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(
      new ApiError('down', 502, 'SERVICE_UNAVAILABLE'),
    );
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText('Control Tower is not reachable')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load the repository.')).not.toBeInTheDocument();

    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(REPOSITORY);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
  });

  it('keeps the load-failed text for any other error', async () => {
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('x'));
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText('Failed to load the repository.')).toBeInTheDocument();
  });
});
