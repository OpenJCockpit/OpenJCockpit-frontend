import { vi } from 'vitest';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import type { AgentRun, WorkflowDefinition, WorkflowExecutionPage } from '@openjcockpit/api';

export const WORKFLOW: WorkflowDefinition = {
  id: 'wf-1',
  name: 'Customer Onboarding',
  projectName: 'Noordzee Logistics B.V.',
  description: 'desc',
  agentIds: ['requirement', 'evidence'],
  subagentNames: [],
  skillNames: [],
  mcpTools: [],
  trigger: { dashboardButtonEnabled: true, hermesSignalEnabled: false, fileDeliveryEnabled: false },
  execution: { customerId: 'noordzee-logistics', repositoryUrl: '', timeoutSeconds: 600 },
  status: 'ACTIVE',
};

export function emptyHistoryPage(): WorkflowExecutionPage {
  return { items: [], limit: 20, offset: 0, total: 0, hasMore: false };
}

export function runWithStatus(status: string, overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    runId: 'run-1',
    customerId: 'noordzee-logistics',
    specFile: '',
    repositoryUrl: '',
    status,
    startedAt: new Date().toISOString(),
    events: [],
    generatedArtifacts: [],
    workflowId: 'wf-1',
    startedBy: null,
    completedAt: null,
    ...overrides,
  };
}

export function stubExecutionDefaults() {
  vi.clearAllMocks();
  vi.mocked(linkable.loadLinkableAgents).mockResolvedValue([
    {
      id: 'requirement',
      name: 'Requirement Agent',
      description: 'Extracts requirements',
      role: 'requirement',
      sequenceOrder: 1,
      inputType: '',
      outputType: '',
    },
    {
      id: 'evidence',
      name: 'Evidence Agent',
      description: 'Collects evidence',
      role: 'evidence',
      sequenceOrder: 2,
      inputType: '',
      outputType: '',
    },
  ]);
  vi.mocked(workflowApi.listWorkflowExecutions).mockResolvedValue(emptyHistoryPage());
  vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
}
