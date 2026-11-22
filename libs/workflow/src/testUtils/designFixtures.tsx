import { act, screen } from '@testing-library/react';
import { render } from '../testUtils/render';
import { vi } from 'vitest';
import { WorkflowDesign } from '../WorkflowDesign/WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition, WorkflowGroup } from '@openjcockpit/api';

export const AVAILABLE_AGENTS = [
  {
    id: 'requirement',
    name: 'Requirement Agent',
    description: 'Retrieve and validate requirements',
    role: 'specification',
    sequenceOrder: 0,
    inputType: 'SpecContent',
    outputType: 'RequirementAnalysis',
  },
  {
    id: 'implementation',
    name: 'Implementation Agent',
    description: 'Generate & modify code',
    role: 'engineering',
    sequenceOrder: 0,
    inputType: 'TestPlan',
    outputType: 'ImplementationPlan',
  },
  {
    id: 'realisation',
    name: 'Realisation Agent',
    description: 'Apply implementation in the repository',
    role: 'engineering',
    sequenceOrder: 0,
    inputType: 'ImplementationPlan',
    outputType: 'CodeChangeSet',
  },
];

export const GROUPS: WorkflowGroup[] = [
  {
    id: 'wg-onboarding',
    name: 'Onboarding flows',
    description: 'Workflows around customer onboarding',
    projectName: 'Test Project',
  },
  {
    id: 'wg-compliance',
    name: 'Compliance',
    description: 'Audits and reports',
    projectName: '',
  },
];

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-1',
    name: 'Customer Onboarding',
    projectName: 'Test Project',
    groupId: 'wg-onboarding',
    description: '',
    agentIds: [],
    subagentNames: [],
    skillNames: [],
    mcpTools: [],
    status: 'ACTIVE',
  },
  {
    id: 'wf-2',
    name: 'Spec to pull request',
    projectName: 'Test Project',
    description: '',
    agentIds: [],
    subagentNames: [],
    skillNames: [],
    mcpTools: [],
    status: 'ACTIVE',
  },
];

export async function renderWorkflowsTab() {
  vi.mocked(workflowApi.listWorkflows).mockResolvedValue(WORKFLOWS);
  vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue(GROUPS);
  vi.mocked(linkable.loadLinkableAgents).mockResolvedValue(AVAILABLE_AGENTS);
  vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue(AVAILABLE_AGENTS);
  await act(async () => {
    render(withQueryClient(<WorkflowDesign />));
  });
  await screen.findByText('Customer Onboarding');
}

export const PIPELINE_ORDERED_AGENTS = [
  {
    id: 'requirement',
    name: 'Requirement Agent',
    description: 'd',
    role: 'r',
    sequenceOrder: 1,
    inputType: '',
    outputType: '',
  },
  {
    id: 'impact',
    name: 'Impact Agent',
    description: 'd',
    role: 'r',
    sequenceOrder: 2,
    inputType: '',
    outputType: '',
  },
  {
    id: 'test-design',
    name: 'Test Design Agent',
    description: 'd',
    role: 'r',
    sequenceOrder: 3,
    inputType: '',
    outputType: '',
  },
  {
    id: 'implementation',
    name: 'Implementation Agent',
    description: 'd',
    role: 'r',
    sequenceOrder: 4,
    inputType: '',
    outputType: '',
  },
  {
    id: 'realisation',
    name: 'Realisation Agent',
    description: 'd',
    role: 'r',
    sequenceOrder: 5,
    inputType: '',
    outputType: '',
  },
];
