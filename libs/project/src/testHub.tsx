import { act, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { vi } from 'vitest';
import type { ReactElement } from 'react';
import type { Project } from '@openjcockpit/api';
import { ADMIN_PERMISSION } from '@openjcockpit/hub-contract';
import {
  FakeHubProjectProvider,
  FakeHubSession,
  FakeHubSessionProvider,
} from '@openjcockpit/hub-contract/testing';
import type { QueryClient } from '@tanstack/react-query';
import { createTestQueryClient, withQueryClient } from './testQueryClient';

export function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Beta',
    customerId: 'cust',
    gitUrl: 'https://github.com/org/beta',
    description: 'Beta project',
    defaultBranch: 'develop',
    environment: 'prod',
    owner: 'team-b',
    active: 1,
    newProject: 0,
    gitStatus: 'UNKNOWN',
    hasCredentials: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function LocationProbe() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

interface HubOptions {
  /** Permissions of the signed-in user; admin by default. */
  permissions?: string[];
  projects?: Project[];
  selected?: Project | null;
  onSelect?: (id: string) => void;
  /** Router location state, e.g. where `RequireProject` came from. */
  state?: unknown;
  /** A query cache the test has seeded; a fresh one by default. */
  client?: QueryClient;
}

/** Renders a view as a remote sees it: host session, project and router, plus a probe showing the path. */
export async function renderHub(ui: ReactElement, options: HubOptions = {}) {
  const {
    permissions = [ADMIN_PERMISSION],
    projects = [],
    selected = null,
    onSelect = vi.fn(),
    state,
    client = createTestQueryClient(),
  } = options;
  let unmount!: () => void;
  await act(async () => {
    ({ unmount } = render(
      withQueryClient(
        <MemoryRouter initialEntries={[{ pathname: '/projects', state }]}>
          <FakeHubSessionProvider session={new FakeHubSession(permissions)}>
            <FakeHubProjectProvider projects={projects} selected={selected} onSelect={onSelect}>
              {ui}
              <LocationProbe />
            </FakeHubProjectProvider>
          </FakeHubSessionProvider>
        </MemoryRouter>,
        client,
      ),
    ));
  });
  return { client, onSelect, unmount };
}
