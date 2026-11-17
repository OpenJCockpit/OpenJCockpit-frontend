import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '@openjcockpit/i18n/testing';
import { HubPage } from './HubPage';

describe('HubPage', () => {
  it('renders a back header, the title row, tabs and content', () => {
    const onBack = vi.fn();
    renderWithI18n(
      <HubPage
        icon="I"
        title="Hub"
        subtitle={<p>About</p>}
        tabs={<nav>Tabs</nav>}
        onBack={onBack}
        backTitle="Back to dashboard"
      >
        <p>Content</p>
      </HubPage>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hub');
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Tabs')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses the host header instead of its own', () => {
    render(
      <HubPage icon="I" title="Hub" header={<header>Host header</header>} onBack={vi.fn()}>
        <p>Content</p>
      </HubPage>,
    );
    expect(screen.getByText('Host header')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
