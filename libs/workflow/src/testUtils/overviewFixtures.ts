import { vi } from 'vitest';
import * as workflowApi from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';

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
  lastExecutionStatus: undefined,
  lastExecutionAt: undefined,
};

export const FULL_AGENT_CATALOGUE = [
  {
    id: 'requirement',
    name: 'Requirement Agent',
    description: '',
    role: 'requirement',
    sequenceOrder: 1,
    inputType: '',
    outputType: '',
  },
  {
    id: 'impact',
    name: 'Impact Agent',
    description: '',
    role: 'impact',
    sequenceOrder: 2,
    inputType: '',
    outputType: '',
  },
  {
    id: 'evidence',
    name: 'Evidence Agent',
    description: '',
    role: 'evidence',
    sequenceOrder: 7,
    inputType: '',
    outputType: '',
  },
];

export function mockStartResponse(
  workflowId: string,
  executionId: string,
  status: string,
  message: string,
) {
  vi.mocked(workflowApi.startWorkflow).mockResolvedValue({
    workflowId,
    executionId,
    status,
    startedAt: new Date().toISOString(),
    message,
  });
}
