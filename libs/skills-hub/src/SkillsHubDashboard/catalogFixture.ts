import { screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import type { SkillCatalog } from '@openjcockpit/api';

export const CATALOG: SkillCatalog = {
  localSkills: [
    {
      name: 'grill-me',
      description: 'Adversarial review of design decisions.',
      inputContract: 'A diff',
      outputContract: 'A list of objections',
      executionInstructions: 'Challenge every assumption.',
      policyNotes: 'Read-only',
      mcpTools: [{ name: 'git.diff', description: 'Reads a diff' }],
    },
    {
      name: 'quality-gate',
      description: 'Runs lint and tests.',
      inputContract: 'A repo',
      outputContract: 'A report',
      executionInstructions: 'Run the checks.',
      mcpTools: [],
    },
  ],
  externalSkills: [
    {
      marketplaceId: '11111111-1111-1111-1111-111111111111',
      marketplaceName: 'Acme Skills',
      name: 'acme-deploy',
      description: 'Deploys to Acme.',
    },
  ],
  sources: [
    {
      kind: 'LOCAL',
      marketplaceId: null,
      name: 'Local',
      outcome: 'SUCCESS',
      itemCount: 2,
      httpStatus: null,
    },
  ],
};

/** Needs the `@openjcockpit/api` module to be auto-mocked by the calling test file. */
export function mockCatalog(catalog: SkillCatalog = CATALOG) {
  vi.mocked(api.getSkillCatalog).mockResolvedValue(catalog);
}

/** Resolves once the catalogue request has settled and the loading line is gone. */
export async function catalogSettled() {
  await waitFor(() => expect(screen.queryByText('Loading skills…')).not.toBeInTheDocument());
}
