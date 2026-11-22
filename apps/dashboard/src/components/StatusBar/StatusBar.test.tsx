import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { render } from '../../testUtils/render';
import { StatusBar } from './StatusBar';

const renderBar = (props: Parameters<typeof StatusBar>[0]) =>
  render(
    <MemoryRouter>
      <StatusBar {...props} />
    </MemoryRouter>,
  );

describe('StatusBar', () => {
  it('shows queue state, live counts and a failed chip, each linking to where to act', () => {
    renderBar({
      gitStatus: 'ACCESSIBLE',
      queueFailed: false,
      queue: {
        state: 'ACTIVE',
        counts: [
          { key: 'running', count: 1 },
          { key: 'queued', count: 3 },
          { key: 'failed', count: 2 },
        ],
      },
    });
    expect(screen.getByText('Queue: active')).toBeInTheDocument();
    expect(screen.getByText('1 running · 3 queued')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();
    expect(screen.getByText('Git connected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the spec queue' })).toHaveAttribute(
      'href',
      '/spec-queue',
    );
    expect(screen.getByRole('link', { name: "Open the project's Git settings" })).toHaveAttribute(
      'href',
      '/project-settings',
    );
  });

  it('says so when the queue is empty and does not render a failed chip', () => {
    renderBar({ gitStatus: 'UNKNOWN', queueFailed: false, queue: { state: 'PAUSED', counts: [] } });
    expect(screen.getByText('Queue: paused')).toBeInTheDocument();
    expect(screen.getByText('Nothing queued')).toBeInTheDocument();
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
    expect(screen.getByText('Git not checked')).toBeInTheDocument();
  });

  it('keeps showing git state and flags the queue when it could not be loaded', () => {
    renderBar({ gitStatus: 'NOT_ACCESSIBLE', queueFailed: true, queue: null });
    expect(screen.getByText('Queue unavailable')).toBeInTheDocument();
    expect(screen.getByText('Git not reachable')).toBeInTheDocument();
    expect(screen.queryByText(/Queue:/)).not.toBeInTheDocument();
  });

  it('shows neither queue chip nor error while the queue is still loading', () => {
    renderBar({ gitStatus: 'ACCESSIBLE', queueFailed: false, queue: null });
    expect(screen.queryByText(/Queue/)).not.toBeInTheDocument();
  });
});
