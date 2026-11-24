import { screen, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import * as api from '@openjcockpit/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillDetailPage } from './SkillDetailPage';
import { SkillsHubDashboard } from './SkillsHubDashboard';
import { clickAsync, renderAsync } from '../testUtils';
import { CATALOG, catalogSettled, mockCatalog } from './catalogFixture';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

beforeEach(() => {
  mockCatalog();
});

const MARKETPLACE_ID = CATALOG.externalSkills[0]!.marketplaceId;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

async function openPage(path: string, onBack = vi.fn()) {
  await renderAsync(
    <>
      <Routes>
        <Route
          path="/skills-hub/skills/:source/:name"
          element={<SkillDetailPage onBack={onBack} />}
        />
      </Routes>
      <Where />
    </>,
    { route: path },
  );
  await catalogSettled();
}

describe('SkillsHubDashboard — links to the detail route', () => {
  it('links a local skill and a marketplace skill to their own URLs', async () => {
    await renderAsync(<SkillsHubDashboard onBack={vi.fn()} onSettings={vi.fn()} />);
    await catalogSettled();
    expect(screen.getByRole('link', { name: /grill-me/ })).toHaveAttribute(
      'href',
      '/skills-hub/skills/local/grill-me',
    );
    expect(screen.getByRole('link', { name: /acme-deploy/ })).toHaveAttribute(
      'href',
      `/skills-hub/skills/${MARKETPLACE_ID}/acme-deploy`,
    );
  });

  it('navigates to the detail URL when a row is clicked', async () => {
    await renderAsync(
      <>
        <SkillsHubDashboard onBack={vi.fn()} onSettings={vi.fn()} />
        <Where />
      </>,
    );
    await catalogSettled();
    await clickAsync(screen.getByRole('link', { name: /grill-me/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/skills-hub/skills/local/grill-me');
  });
});

describe('SkillDetailPage', () => {
  it('shows the full spec of a local skill', async () => {
    await openPage('/skills-hub/skills/local/grill-me');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: 'grill-me' })).toBeInTheDocument();
    expect(main.getByText('Local')).toBeInTheDocument();
    expect(main.getByText('A diff')).toBeInTheDocument();
    expect(main.getByText('A list of objections')).toBeInTheDocument();
    expect(main.getByText('Challenge every assumption.')).toBeInTheDocument();
    expect(main.getByText('Read-only')).toBeInTheDocument();
    expect(main.getByText('git.diff')).toBeInTheDocument();
    expect(main.getByText('Reads a diff')).toBeInTheDocument();
  });

  it('omits empty policy notes and says when there are no MCP tools', async () => {
    await openPage('/skills-hub/skills/local/quality-gate');
    const main = within(screen.getByRole('main'));
    expect(main.queryByText('Policy / validation notes')).not.toBeInTheDocument();
    expect(main.getByText('No MCP tools.')).toBeInTheDocument();
  });

  it('shows only name, description and source for a marketplace skill', async () => {
    await openPage(`/skills-hub/skills/${MARKETPLACE_ID}/acme-deploy`);
    const main = within(screen.getByRole('main'));
    expect(main.getByText('Acme Skills')).toBeInTheDocument();
    expect(main.getByText('Deploys to Acme.')).toBeInTheDocument();
    expect(main.queryByText('Input contract')).not.toBeInTheDocument();
    expect(main.getByText(/only expose a name and description/)).toBeInTheDocument();
  });

  it('decodes an encoded skill name from the URL', async () => {
    mockCatalog({
      ...CATALOG,
      localSkills: [{ ...CATALOG.localSkills[0]!, name: 'a b/c' }],
    });
    await openPage('/skills-hub/skills/local/a%20b%2Fc');
    expect(screen.getByRole('heading', { name: 'a b/c' })).toBeInTheDocument();
    expect(screen.getByText('A diff')).toBeInTheDocument();
  });

  it('says so when the skill does not exist', async () => {
    await openPage('/skills-hub/skills/local/nope');
    expect(screen.getByText('This skill is no longer available.')).toBeInTheDocument();
  });

  it('shows an error when the catalogue cannot be loaded', async () => {
    vi.mocked(api.getSkillCatalog).mockRejectedValue(new Error('boom'));
    await openPage('/skills-hub/skills/local/grill-me');
    expect(screen.getByText('Could not load the skill.')).toBeInTheDocument();
  });

  it('has a visible in-page button back to the list', async () => {
    const onBack = vi.fn();
    await openPage('/skills-hub/skills/local/grill-me', onBack);
    await clickAsync(screen.getByRole('button', { name: 'All skills' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('goes back to the list with the back control', async () => {
    const onBack = vi.fn();
    await openPage('/skills-hub/skills/local/grill-me', onBack);
    await clickAsync(screen.getByRole('button', { name: 'Back to skills' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('says so when a marketplace skill has no description', async () => {
    mockCatalog({
      ...CATALOG,
      externalSkills: [{ ...CATALOG.externalSkills[0]!, description: null }],
    });
    await openPage(`/skills-hub/skills/${MARKETPLACE_ID}/acme-deploy`);
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });
});
