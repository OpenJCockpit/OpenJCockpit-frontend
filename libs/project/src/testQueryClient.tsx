import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withI18n } from '@openjcockpit/i18n/testing';
import type { ReactElement } from 'react';
import { projectResources } from './i18n';

/** A fresh query cache with retries off, so a mocked rejection surfaces at once. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

/** Wraps `ui` in English i18n and a query cache (a fresh one unless the test passes its own to inspect it). */
export function withQueryClient(ui: ReactElement, client = createTestQueryClient()) {
  return withI18n(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    projectResources,
  );
}
