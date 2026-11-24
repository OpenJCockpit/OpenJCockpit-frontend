import { fireEvent, screen } from '@testing-library/react';
import * as api from '@openjcockpit/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillsHubDashboard } from './SkillsHubDashboard';
import { renderAsync } from '../testUtils';
import { CATALOG, catalogSettled, mockCatalog } from './catalogFixture';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

beforeEach(() => {
  mockCatalog();
});

async function setup() {
  await renderAsync(<SkillsHubDashboard onBack={vi.fn()} onSettings={vi.fn()} />);
  await catalogSettled();
}

function search(term: string) {
  fireEvent.change(screen.getByLabelText('Search for a skill'), { target: { value: term } });
}

describe('SkillsHubDashboard — catalogue', () => {
  it('lists local and marketplace skills with their source', async () => {
    await setup();
    expect(screen.getByText('grill-me')).toBeInTheDocument();
    expect(screen.getByText('quality-gate')).toBeInTheDocument();
    expect(screen.getByText('acme-deploy')).toBeInTheDocument();
    expect(screen.getAllByText('Local')).toHaveLength(2);
    expect(screen.getByText('Acme Skills')).toBeInTheDocument();
  });

  it('shows an empty state when the catalogue has no skills', async () => {
    mockCatalog({ ...CATALOG, localSkills: [], externalSkills: [] });
    await setup();
    expect(screen.getByText('No skills available yet.')).toBeInTheDocument();
  });

  it('shows an error when the catalogue cannot be loaded', async () => {
    vi.mocked(api.getSkillCatalog).mockRejectedValue(new Error('boom'));
    await setup();
    expect(screen.getByText('Could not load the skill catalogue.')).toBeInTheDocument();
  });

  it('reports a marketplace that failed to load while still listing the rest', async () => {
    mockCatalog({
      ...CATALOG,
      sources: [
        ...CATALOG.sources,
        {
          kind: 'MARKETPLACE',
          marketplaceId: '22222222-2222-2222-2222-222222222222',
          name: 'Broken Market',
          outcome: 'AUTH_FAILED',
          itemCount: 0,
          httpStatus: 401,
        },
      ],
    });
    await setup();
    expect(
      screen.getByText('Broken Market could not be loaded: authentication failed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('grill-me')).toBeInTheDocument();
  });
});

describe('SkillsHubDashboard — search', () => {
  it('filters while typing, without a submit button', async () => {
    await setup();
    search('grill');
    expect(screen.queryByText('quality-gate')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('filters by name, case-insensitively and trimmed', async () => {
    await setup();
    search('  GRILL ');
    expect(screen.getByText('grill-me')).toBeInTheDocument();
    expect(screen.queryByText('quality-gate')).not.toBeInTheDocument();
  });

  it('filters by description', async () => {
    await setup();
    search('lint');
    expect(screen.getByText('quality-gate')).toBeInTheDocument();
    expect(screen.queryByText('grill-me')).not.toBeInTheDocument();
  });

  it('keeps searching skills that have no description', async () => {
    mockCatalog({
      ...CATALOG,
      externalSkills: [{ ...CATALOG.externalSkills[0]!, description: null }],
    });
    await setup();
    search('acme-deploy');
    expect(screen.getByText('acme-deploy')).toBeInTheDocument();
    search('lint');
    expect(screen.queryByText('acme-deploy')).not.toBeInTheDocument();
  });

  it('filters by source name', async () => {
    await setup();
    search('acme');
    expect(screen.getByText('acme-deploy')).toBeInTheDocument();
    expect(screen.queryByText('grill-me')).not.toBeInTheDocument();
  });

  it('shows an empty state quoting the search term', async () => {
    await setup();
    search('zzz');
    expect(screen.getByText('No skills found for "zzz".')).toBeInTheDocument();
  });

  it('restores the full list when the search is cleared', async () => {
    await setup();
    search('zzz');
    search('');
    expect(screen.getByText('grill-me')).toBeInTheDocument();
    expect(screen.getByText('quality-gate')).toBeInTheDocument();
  });
});

describe('SkillsHubDashboard — header', () => {
  it('replaces the default header with a custom one', async () => {
    await renderAsync(
      <SkillsHubDashboard onBack={vi.fn()} onSettings={vi.fn()} header={<p>Shared menu</p>} />,
    );
    expect(screen.getByText('Shared menu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});
