import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withI18n } from '@openjcockpit/i18n/testing';
import type { ReactElement } from 'react';
import { skillsHubResources } from './i18n';

/** Wraps `ui` in English i18n and a fresh query cache with retries off, so a mocked rejection surfaces at once.
 * `route` is where the router starts, for tests that open a deep link. */
export function withQueryClient(ui: ReactElement, { route = '/' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return withI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    skillsHubResources,
  );
}
