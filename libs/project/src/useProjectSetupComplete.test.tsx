import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { FakeHubProjectProvider } from '@openjcockpit/hub-contract/testing';
import { project } from './testHub';
import { specInitQueryKey, useProjectSetupComplete } from './useProjectSetupComplete';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('./testUtils')).automockApiClients(await importOriginal()),
);

const ready = project({ gitStatus: 'ACCESSIBLE', hasCredentials: true });

function wrapperFor(selected: ReturnType<typeof project> | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <FakeHubProjectProvider selected={selected}>{children}</FakeHubProjectProvider>
    </QueryClientProvider>
  );
}

describe('useProjectSetupComplete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keys the spec-init query by project', () => {
    expect(specInitQueryKey('p1')).toEqual(['projects', 'p1', 'spec-init-status']);
  });

  it('is false without a selected project and does not fetch', () => {
    const { result } = renderHook(() => useProjectSetupComplete(), { wrapper: wrapperFor(null) });
    expect(result.current).toBe(false);
    expect(api.getSpecInitStatus).not.toHaveBeenCalled();
  });

  it('is true once everything is set up and the spec folder exists', async () => {
    vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });
    const { result } = renderHook(() => useProjectSetupComplete(), { wrapper: wrapperFor(ready) });
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
    expect(api.getSpecInitStatus).toHaveBeenCalledWith('p1', expect.any(AbortSignal));
  });

  it('stays false when the spec-init status cannot be loaded', async () => {
    vi.mocked(api.getSpecInitStatus).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useProjectSetupComplete(), { wrapper: wrapperFor(ready) });
    await waitFor(() => expect(api.getSpecInitStatus).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
