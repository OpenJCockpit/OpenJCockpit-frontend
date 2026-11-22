import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ROUTES } from '../routes';
import { renderRoutedApp } from './renderRoutedApp';
import { specsRemotes } from './specsRemoteStubs';
import * as api from '@openjcockpit/api';
import type { SpecFile, WorkflowDefinition } from '@openjcockpit/api';
import { mockDashboardApis, PROJECT, WORKFLOW } from './dashboardFixtures';
import { enterDashboard } from './dom';

export const SPECS: SpecFile[] = [
  {
    id: 'checkout-flow',
    fileName: 'checkout-flow.md',
    owner: '',
    lastChanged: '4 jul 09:12',
    status: 'Active',
    selected: true,
    content: '# Checkout flow',
    repositoryUrl: 'https://github.com/org/repo',
  },
  {
    id: 'pricing-rules',
    fileName: 'pricing-rules.md',
    owner: '',
    lastChanged: '3 jul 16:40',
    status: 'Open',
    selected: false,
    content: '# Pricing rules',
    repositoryUrl: 'https://github.com/org/repo',
  },
];

export const PROJECT_WITH_GIT = { ...PROJECT, gitUrl: 'https://github.com/org/test-project.git' };

export async function renderDashboard(
  specs: SpecFile[],
  workflows: WorkflowDefinition[] = [WORKFLOW],
) {
  mockDashboardApis({
    project: PROJECT_WITH_GIT,
    specs,
    workflows,
    groups: [
      { id: 'wg-spec-workflow', name: 'Spec-driven development', description: '', projectName: '' },
    ],
  });
  vi.mocked(api.getSpecInitStatus).mockResolvedValue({ pending: false });

  renderRoutedApp(ROUTES.landing, specsRemotes);
  await enterDashboard();
  await screen.findByText('Start');
}
