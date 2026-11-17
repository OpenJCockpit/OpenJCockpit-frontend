import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes } from '../testUtils';

describe('overview', () => {
  it('shows the counts of the linked repository', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
    const stat = (label: string) =>
      screen.getAllByText(label).find((el) => el.tagName === 'SPAN')!.parentElement!;
    await waitFor(() => expect(within(stat('Interviews')).getByText('1')).toBeInTheDocument());
    expect(within(stat('Specifications')).getByText('2')).toBeInTheDocument();
    expect(within(stat('Ready to dispatch')).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start discovery' })).toHaveAttribute(
      'href',
      '/controltower/interviews',
    );
  });

  it('shows dashes while the counts are unavailable', async () => {
    ct.listControlTowerSpecs.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    expect(
      within(
        screen.getAllByText('Specifications').find((el) => el.tagName === 'SPAN')!.parentElement!,
      ).getByText('–'),
    ).toBeInTheDocument();
  });
});
