import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsResource } from './useSettingsResource';

interface Config {
  url: string;
  token: string | null;
}

function setup(over: { load?: () => Promise<Config>; save?: (d: Config) => Promise<Config> } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const load = over.load ?? vi.fn().mockResolvedValue({ url: 'a', token: 'secret' });
  const save = over.save ?? vi.fn(async (d: Config) => ({ ...d, token: 'secret' }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useSettingsResource<Config>({
        queryKey: ['cfg'],
        load,
        save,
        toDraft: (value) => ({ ...value, token: null }),
      }),
    { wrapper },
  );
  return { ...hook, load, save, client };
}

describe('useSettingsResource', () => {
  it('is loading, then exposes a clean draft derived from the server value', async () => {
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.draft).toBeUndefined();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.draft).toEqual({ url: 'a', token: null });
    expect(result.current.server).toEqual({ url: 'a', token: 'secret' });
    expect(result.current.dirty).toBe(false);
  });

  it('marks edits dirty and ignores an edit that restores the loaded value', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.draft).toBeDefined());
    act(() => result.current.setDraft({ url: 'b', token: null }));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.setDraft((current) => ({ ...current, url: 'a' })));
    expect(result.current.dirty).toBe(false);
  });

  it('saves the draft, caches the result, clears edits and reports saved', async () => {
    const { result, save, client } = setup();
    await waitFor(() => expect(result.current.draft).toBeDefined());
    act(() => result.current.setDraft({ url: 'b', token: 'new' }));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(save).toHaveBeenCalledWith({ url: 'b', token: 'new' });
    expect(client.getQueryData(['cfg'])).toEqual({ url: 'b', token: 'secret' });
    expect(result.current.dirty).toBe(false);
    expect(result.current.draft).toEqual({ url: 'b', token: null });
    act(() => result.current.setDraft({ url: 'c', token: null }));
    expect(result.current.saved).toBe(false);
  });

  it('keeps the edits and exposes the error when saving fails, and clears it on the next edit', async () => {
    const failure = new Error('nope');
    const { result } = setup({ save: () => Promise.reject(failure) });
    await waitFor(() => expect(result.current.draft).toBeDefined());
    act(() => result.current.setDraft({ url: 'b', token: null }));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.dirty).toBe(true);
    expect(result.current.saved).toBe(false);
    act(() => result.current.setDraft({ url: 'c', token: null }));
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('reset drops edits, saved state and save errors', async () => {
    const { result } = setup({ save: () => Promise.reject(new Error('nope')) });
    await waitFor(() => expect(result.current.draft).toBeDefined());
    act(() => result.current.setDraft({ url: 'b', token: null }));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.dirty).toBe(false);
    expect(result.current.draft).toEqual({ url: 'a', token: null });
  });

  it('submit does nothing before the value has loaded', () => {
    const { result, save } = setup({ load: () => new Promise(() => undefined) });
    act(() => result.current.submit());
    expect(save).not.toHaveBeenCalled();
  });

  it('exposes a load failure separately from a save failure', async () => {
    const failure = new Error('down');
    const { result } = setup({ load: () => Promise.reject(failure) });
    await waitFor(() => expect(result.current.loadError).toBe(failure));
    expect(result.current.error).toBeNull();
    expect(result.current.server).toBeUndefined();
  });

  it('uses the server value as the draft when no toDraft is given', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useSettingsResource<string>({
          queryKey: ['plain'],
          load: () => Promise.resolve('x'),
          save: (d) => Promise.resolve(d),
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      },
    );
    await waitFor(() => expect(result.current.draft).toBe('x'));
  });
});
