import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type {
  EvidenceRunDetails,
  EvidenceRunSummary,
  EvidenceTimelineEvent,
  Project,
} from '@openjcockpit/api';
import { createI18n, I18nProvider } from '@openjcockpit/i18n';
import {
  FakeHubProjectProvider,
  FakeHubSession,
  FakeHubSessionProvider,
} from '@openjcockpit/hub-contract/testing';
import { GroupedTimeline } from './EvidenceTimeline/GroupedTimeline';
import { RunList } from './RunList/RunList';
import { RunSummary } from './RunSummary/RunSummary';
import { useEvidenceOutput } from './useEvidenceOutput';

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadEvidenceOutput: vi.fn(),
}));

const PROJECT = { id: 'p1', name: 'Demo', customerId: 'c1' } as Project;

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <I18nProvider i18n={createI18n({ locale: 'en', resources: {} })}>
      <QueryClientProvider client={client}>
        <FakeHubSessionProvider session={new FakeHubSession()}>
          <FakeHubProjectProvider selected={PROJECT}>
            <MemoryRouter>{children}</MemoryRouter>
          </FakeHubProjectProvider>
        </FakeHubSessionProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

const details = (extra: Partial<EvidenceRunDetails> = {}): EvidenceRunDetails => ({
  runId: 'r1',
  status: 'COMPLETED',
  artifacts: [],
  ...extra,
});

describe('RunSummary', () => {
  it('shows placeholders for a run with no optional data', () => {
    render(<RunSummary details={details()} />, { wrapper: Wrapper });
    expect(screen.getAllByText('–')).toHaveLength(6);
  });

  it('links branch and commit when the project has a git URL', () => {
    render(
      <RunSummary
        details={details({ branch: 'main', commitHash: 'abc' })}
        gitUrl="https://github.com/org/repo.git"
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('link', { name: 'main' })).toHaveAttribute(
      'href',
      'https://github.com/org/repo/tree/main',
    );
    expect(screen.getByRole('link', { name: 'abc' })).toBeInTheDocument();
  });

  it('shows branch and commit as plain text without a git URL', () => {
    render(<RunSummary details={details({ branch: 'main', commitHash: 'abc' })} />, {
      wrapper: Wrapper,
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('abc')).toBeInTheDocument();
  });
});

describe('RunList', () => {
  const run = (extra: Partial<EvidenceRunSummary> = {}): EvidenceRunSummary => ({
    runId: 'r1',
    status: 'COMPLETED',
    eventCount: 1,
    failedEventCount: 0,
    ...extra,
  });

  it('falls back to the run id and omits optional details', () => {
    render(
      <RunList
        runs={[run()]}
        emptyText="none"
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
      />,
      {
        wrapper: Wrapper,
      },
    );
    expect(screen.getByText('r1')).toBeInTheDocument();
    expect(screen.queryByText('none')).not.toBeInTheDocument();
  });

  it('shows the empty text, and a load-more button in both states', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <RunList runs={[]} emptyText="none" hasMore loadingMore={false} onLoadMore={onLoadMore} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('none')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onLoadMore).toHaveBeenCalled();
    rerender(<RunList runs={[]} emptyText="none" hasMore loadingMore onLoadMore={onLoadMore} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('GroupedTimeline', () => {
  const ev = (extra: Partial<EvidenceTimelineEvent>): EvidenceTimelineEvent => ({
    timestamp: '2026-11-24T10:00:00Z',
    source: 'agent',
    title: 'T',
    status: 'ok',
    ...extra,
  });

  it('titles an agent step without an agent id by its source, and expands an event', () => {
    render(
      <GroupedTimeline
        events={[
          ev({ title: 'Anon', detail: 'more detail' }),
          ev({ title: 'Named', agentId: 'a1' }),
        ]}
        run={details()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('heading', { name: 'a1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anon' }));
    expect(screen.getByText('more detail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anon' }));
    expect(screen.queryByText('more detail')).not.toBeInTheDocument();
  });

  it('shows a link inside an expanded event only when one can be built', () => {
    vi.mocked(api.loadEvidenceOutput).mockResolvedValue({ output: 'out' } as never);
    render(
      <GroupedTimeline
        events={[ev({ source: 'git', title: 'Pushed main', detail: 'd' })]}
        run={details({ branch: 'main' })}
        gitUrl="https://github.com/org/repo"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pushed main' }));
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/org/repo/tree/main',
    );
  });
});

describe('useEvidenceOutput', () => {
  it('stays idle without an agent key', () => {
    const { result } = renderHook(() => useEvidenceOutput('r1', null, true), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
