import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { PROJECT_SETTINGS_PATH } from '@openjcockpit/hub-contract';
import { project, renderHub } from '../testHub';
import ProjectOverview from './ProjectOverview';
import { SetupBadge } from './SetupBadge';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

const ready = project({ gitStatus: 'ACCESSIBLE', hasCredentials: true });

describe('ProjectOverview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists what is done and what is left, each row linking to its section', async () => {
    vi.mocked(api.getSpecInitStatus).mockResolvedValue(null);
    await renderHub(<ProjectOverview />, { selected: ready });

    expect(await screen.findByText('3 of 4 steps done.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spec folder initialised' })).toHaveAttribute(
      'href',
      `${PROJECT_SETTINGS_PATH}/spec-queue`,
    );
    expect(screen.getByRole('link', { name: 'Git credentials stored' })).toHaveAttribute(
      'href',
      `${PROJECT_SETTINGS_PATH}/repository`,
    );
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(api.getSpecInitStatus).toHaveBeenCalledWith('p1', expect.anything());
  });

  it('says so when everything is set up', async () => {
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });
    await renderHub(<ProjectOverview />, { selected: ready });
    expect(await screen.findByText('This project is fully set up.')).toBeInTheDocument();
  });

  it('keeps the spec folder unknown when its status cannot be loaded', async () => {
    vi.mocked(api.getSpecInitStatus).mockRejectedValue(new Error('409'));
    await renderHub(<ProjectOverview />, { selected: ready });
    expect(await screen.findByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 steps done.')).toBeInTheDocument();
  });

  it('shows admin-only rows as plain text for non-admins', async () => {
    vi.mocked(api.getSpecInitStatus).mockResolvedValue(null);
    await renderHub(<ProjectOverview />, { selected: ready, permissions: [] });
    await screen.findByText('3 of 4 steps done.');
    expect(screen.queryByRole('link', { name: 'Git credentials stored' })).not.toBeInTheDocument();
    expect(screen.getByText('Git credentials stored')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spec folder initialised' })).toBeInTheDocument();
  });
});

describe('SetupBadge', () => {
  it('shows progress, or "Set up" once the project data is complete', async () => {
    await renderHub(
      <>
        <SetupBadge project={project()} />
        <SetupBadge project={ready} />
      </>,
    );
    const [open, complete] = screen.getAllByTestId('setup-badge');
    expect(open).toHaveTextContent('Setup 1/3');
    expect(complete).toHaveTextContent('Set up');
  });
});
