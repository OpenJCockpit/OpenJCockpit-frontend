import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState, QueryState } from './States';

describe('LoadingState', () => {
  it('announces its text politely', () => {
    render(<LoadingState>Loading the queue…</LoadingState>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the queue…');
  });
});

describe('EmptyState', () => {
  it('renders title, hint and action', () => {
    render(<EmptyState title="No specs" hint="Add one" action={<button>Add</button>} />);
    expect(screen.getByText('No specs')).toBeInTheDocument();
    expect(screen.getByText('Add one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('omits the hint when not given', () => {
    render(<EmptyState title="Nothing" />);
    expect(screen.getAllByText(/./)).toHaveLength(1);
  });
});

describe('ErrorState', () => {
  it('is an alert and offers retry only when it can', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState>Boom</ErrorState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <ErrorState onRetry={onRetry} retryLabel="Retry">
        Boom
      </ErrorState>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('QueryState', () => {
  const base = { loadFailed: 'Failed', retryLabel: 'Retry', loadingLabel: 'Loading…' };
  const render1 = (query: Parameters<typeof QueryState<string[]>>[0]['query'], extra = {}) =>
    render(
      <QueryState<string[]> query={query} {...base} {...extra}>
        {(rows) => <p>{rows.join(',')}</p>}
      </QueryState>,
    );

  it('renders children with the loaded data', () => {
    render1({ data: ['a', 'b'], isError: false, refetch: vi.fn() });
    expect(screen.getByText('a,b')).toBeInTheDocument();
  });

  it('shows the empty node when isEmpty matches', () => {
    render1(
      { data: [], isError: false, refetch: vi.fn() },
      { isEmpty: (d: string[]) => d.length === 0, empty: <p>Nothing</p> },
    );
    expect(screen.getByText('Nothing')).toBeInTheDocument();
  });

  it('shows loading until data arrives', () => {
    render1({ data: undefined, isError: false, refetch: vi.fn() });
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('shows the error with a retry that refetches', () => {
    const refetch = vi.fn();
    render1({ data: undefined, isError: true, refetch });
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows `none` for a null result, and keeps loading without it', () => {
    const { unmount } = render1(
      { data: null, isError: false, refetch: vi.fn() },
      { none: <p>Unlinked</p> },
    );
    expect(screen.getByText('Unlinked')).toBeInTheDocument();
    unmount();
    render1({ data: null, isError: false, refetch: vi.fn() });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
