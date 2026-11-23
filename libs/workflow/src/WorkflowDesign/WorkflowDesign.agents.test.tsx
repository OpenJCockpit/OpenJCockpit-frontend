import { act, screen, within } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as workflowApi from '@openjcockpit/api';

// The designer and overview load linkable agents from the agent catalog; these tests stub that
// catalog with agent-definition fixtures (ids act as agent references).
vi.mock('../linkableAgents', async () => {
  const actual = await vi.importActual<typeof import('../linkableAgents')>('../linkableAgents');
  return { ...actual, fetchLinkableAgents: vi.fn(), loadLinkableAgents: vi.fn() };
});

vi.mock('@openjcockpit/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openjcockpit/api')>();
  return {
    ...actual,
    listWorkflows: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    listWorkflowGroups: vi.fn(),
    createWorkflowGroup: vi.fn(),
    updateWorkflowGroup: vi.fn(),
    deleteWorkflowGroup: vi.fn(),
    exportWorkflows: vi.fn(),
    importWorkflows: vi.fn(),
    listAgentSpecs: vi.fn(),
    deleteAgentSpec: vi.fn(),
    getAgentCatalog: vi.fn(),
    getProviderAgentCard: vi.fn(),
    getSkillCatalog: vi.fn(),
    createSkillSpec: vi.fn(),
    updateSkillSpec: vi.fn(),
    deleteSkillSpec: vi.fn(),
    generateSkillSpec: vi.fn(),
  };
});

describe('agents tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function openAgentsTab() {
    await act(async () => {
      render(withQueryClient(<WorkflowDesign />));
    });
    await act(async () => {
      screen.getByText('Agents').click();
    });
  }

  it('lists local /agents folder agents by folder and the A2A provider agents under the provider name', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(workflowApi.getAgentCatalog).mockResolvedValue({
      local: {
        name: 'Local',
        status: 'OK',
        agents: [
          {
            id: 'triage',
            name: 'Triage',
            description: 'Routes requests',
            version: '1.0.0',
            model: 'agent-chat',
            path: 'support/triage.md',
            folders: ['support'],
            skills: [],
            tools: [],
            valid: true,
          },
          {
            id: 'broken',
            name: 'broken',
            path: 'support/escalation/broken.md',
            folders: ['support', 'escalation'],
            skills: [],
            tools: [],
            valid: false,
            problem: 'missing YAML frontmatter',
          },
        ],
      },
      providers: [
        {
          name: 'LiteLLM',
          type: 'litellm',
          status: 'OK',
          agents: [
            'business-analyst',
            'solution-architect',
            'software-developer',
            'qa-engineer',
          ].map((id) => ({
            id: `id-${id}`,
            name: id,
            description: `${id} description`,
            url: `http://embabel-agent-runtime:8082/a2a/${id}`,
            protocolVersion: '0.3.0',
            version: '1.0.0',
            streaming: false,
            skills: [],
          })),
        },
      ],
    });

    await openAgentsTab();

    const local = await screen.findByRole('region', { name: 'Local' });
    const support = within(local).getByRole('heading', { name: 'support' });
    const escalation = within(local).getByRole('heading', { name: 'escalation' });
    // escalation is nested inside support: the hierarchy follows the subfolders.
    expect(support.parentElement!.contains(escalation)).toBe(true);
    expect(within(local).getByText('Triage')).toBeInTheDocument();
    expect(within(local).getByText('agents/support/triage.md')).toBeInTheDocument();
    expect(within(local).getByText('missing YAML frontmatter')).toBeInTheDocument();

    const litellm = screen.getByRole('region', { name: 'LiteLLM' });
    for (const id of [
      'business-analyst',
      'solution-architect',
      'software-developer',
      'qa-engineer',
    ]) {
      expect(within(litellm).getByText(id)).toBeInTheDocument();
    }
    expect(within(litellm).getAllByText('0.3.0')).toHaveLength(4);
    expect(screen.queryByText('+ New agent')).not.toBeInTheDocument();
  });

  it('shows the resolvable gateway URL and the live agent card on Details', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(workflowApi.getAgentCatalog).mockResolvedValue({
      local: { name: 'Local', status: 'OK', agents: [] },
      providers: [
        {
          name: 'LiteLLM',
          type: 'litellm',
          status: 'OK',
          agents: [
            {
              id: 'id-qa',
              name: 'qa-engineer',
              description: 'Tests',
              url: 'http://localhost:4100/a2a/qa-engineer',
              cardUrl: 'http://localhost:4100/a2a/qa-engineer/.well-known/agent-card.json',
              backendUrl: 'http://embabel-agent-runtime:8082/a2a/qa-engineer',
              protocolVersion: '0.3.0',
              version: '1.0.0',
              streaming: false,
              skills: [],
            },
          ],
        },
      ],
    });
    vi.mocked(workflowApi.getProviderAgentCard).mockResolvedValue({
      name: 'qa-engineer',
      url: 'http://localhost:4100/a2a/qa-engineer',
      protocolVersion: '0.3.0',
      preferredTransport: 'JSONRPC',
      capabilities: { streaming: false, pushNotifications: false },
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: [
        { id: 'qa-engineer', name: 'QA Engineer', description: 'Test strategy and verification' },
      ],
    });

    await openAgentsTab();

    const litellm = await screen.findByRole('region', { name: 'LiteLLM' });
    expect(within(litellm).getByText('http://localhost:4100/a2a/qa-engineer')).toBeInTheDocument();
    expect(
      within(litellm).getByText('routes to http://embabel-agent-runtime:8082/a2a/qa-engineer'),
    ).toBeInTheDocument();

    await act(async () => {
      within(litellm).getByLabelText('Details').click();
    });

    expect(workflowApi.getProviderAgentCard).toHaveBeenCalledWith('litellm', 'qa-engineer');
    const card = await screen.findByLabelText('Agent card qa-engineer');
    expect(within(card).getByText('QA Engineer')).toBeInTheDocument();
    expect(within(card).getByText(/A2A 0.3.0/)).toBeInTheDocument();
    expect(within(card).getByText(/qa-engineer\/.well-known\/agent-card.json/)).toBeInTheDocument();
  });

  it('keeps the provider header and explains when the provider is not reachable', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(workflowApi.getAgentCatalog).mockResolvedValue({
      local: { name: 'Local', status: 'OK', agents: [] },
      providers: [
        {
          name: 'LiteLLM',
          type: 'litellm',
          status: 'UNAVAILABLE',
          message: 'LiteLLM agent registry: unreachable',
          agents: [],
        },
      ],
    });

    await openAgentsTab();

    const litellm = await screen.findByRole('region', { name: 'LiteLLM' });
    expect(within(litellm).getByText('Unavailable')).toBeInTheDocument();
    expect(within(litellm).getByText('LiteLLM agent registry: unreachable')).toBeInTheDocument();
    expect(screen.getByText('No agents in the /agents folder yet.')).toBeInTheDocument();
  });

  it('shows an error with retry when the catalog cannot be loaded', async () => {
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(workflowApi.getAgentCatalog).mockRejectedValueOnce(new Error('502'));

    await openAgentsTab();

    expect(await screen.findByText('Failed to load the agent catalog.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
