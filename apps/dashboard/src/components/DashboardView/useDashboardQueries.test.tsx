import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type { Project } from '@openjcockpit/api';
import { useWorkspaceQuery } from './useDashboardQueries';

vi.mock('@openjcockpit/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openjcockpit/api')>()),
  loadWorkspace: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useWorkspaceQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch without a project', () => {
    renderHook(() => useWorkspaceQuery(null), { wrapper });
    expect(api.loadWorkspace).not.toHaveBeenCalled();
  });

  it('loads the workspace of the project customer', async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue({} as never);
    renderHook(() => useWorkspaceQuery({ id: 'p1', customerId: 'c1' } as Project), { wrapper });
    await waitFor(() =>
      expect(api.loadWorkspace).toHaveBeenCalledWith('c1', expect.any(AbortSignal)),
    );
  });

  it('falls back to the project id when it has no customer', async () => {
    vi.mocked(api.loadWorkspace).mockResolvedValue({} as never);
    renderHook(() => useWorkspaceQuery({ id: 'p1' } as Project), { wrapper });
    await waitFor(() =>
      expect(api.loadWorkspace).toHaveBeenCalledWith('p1', expect.any(AbortSignal)),
    );
  });
});
