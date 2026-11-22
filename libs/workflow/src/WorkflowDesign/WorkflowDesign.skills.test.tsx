import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { render } from '../testUtils/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDesign } from './WorkflowDesign';
import { withQueryClient } from '../testUtils/queryClient';
import * as linkable from '../linkableAgents';
import * as workflowApi from '@openjcockpit/api';
import { mockSkillSpecs } from '@openjcockpit/api/testing';
import type { ExternalSkill, SkillCatalog, SkillCatalogSourceStatus } from '@openjcockpit/api';

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

const LOCAL_SKILLS = [
  {
    name: 'code-review',
    description: 'd1',
    inputContract: 'diff',
    outputContract: 'review-notes',
    executionInstructions: 'x',
    mcpTools: [],
  },
  {
    name: 'test-writer',
    description: 'd2',
    inputContract: 'spec',
    outputContract: 'tests',
    executionInstructions: 'x',
    mcpTools: [],
  },
  {
    name: 'doc-writer',
    description: 'd3',
    inputContract: 'code',
    outputContract: 'docs',
    executionInstructions: 'x',
    mcpTools: [],
  },
];

const ACME_SKILLS: ExternalSkill[] = [
  { marketplaceId: 'mp-acme', marketplaceName: 'Acme Skills', name: 'gen-tests', description: 'd' },
  { marketplaceId: 'mp-acme', marketplaceName: 'Acme Skills', name: 'audit', description: 'd' },
];

const GLOBEX_SKILLS: ExternalSkill[] = [
  { marketplaceId: 'mp-globex', marketplaceName: 'Globex Hub', name: 'triage', description: 'd' },
  {
    marketplaceId: 'mp-globex',
    marketplaceName: 'Globex Hub',
    name: 'summarize-pr',
    description: 'd',
  },
];

const SUCCESS_SOURCES: SkillCatalogSourceStatus[] = [
  {
    kind: 'LOCAL',
    marketplaceId: null,
    name: 'Local',
    outcome: 'SUCCESS',
    itemCount: 3,
    httpStatus: null,
  },
  {
    kind: 'MARKETPLACE',
    marketplaceId: 'mp-acme',
    name: 'Acme Skills',
    outcome: 'SUCCESS',
    itemCount: 2,
    httpStatus: 200,
  },
  {
    kind: 'MARKETPLACE',
    marketplaceId: 'mp-globex',
    name: 'Globex Hub',
    outcome: 'SUCCESS',
    itemCount: 2,
    httpStatus: 200,
  },
];

const FULL_CATALOG: SkillCatalog = {
  localSkills: LOCAL_SKILLS,
  externalSkills: [...ACME_SKILLS, ...GLOBEX_SKILLS],
  sources: SUCCESS_SOURCES,
};

async function openSkillsTab() {
  await act(async () => {
    render(withQueryClient(<WorkflowDesign />));
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Skills'));
  });
}

describe('skills tab (local + marketplace catalog)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowApi.listWorkflows).mockResolvedValue([]);
    vi.mocked(workflowApi.listWorkflowGroups).mockResolvedValue([]);
    vi.mocked(linkable.loadLinkableAgents).mockResolvedValue([]);
    vi.mocked(linkable.fetchLinkableAgents).mockResolvedValue([]);
  });

  it('renders local and external skills with the correct Marketplace column values (AC-01/AC-02)', async () => {
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(FULL_CATALOG);
    await openSkillsTab();

    await screen.findByText('code-review');

    expect(screen.getByRole('columnheader', { name: 'Marketplace' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(
      1 + LOCAL_SKILLS.length + ACME_SKILLS.length + GLOBEX_SKILLS.length,
    );

    for (const skill of LOCAL_SKILLS) {
      const row = screen.getByText(skill.name).closest('tr')!;
      expect(within(row).getByText('Local')).toBeInTheDocument();
      expect(within(row).getByText(skill.inputContract)).toBeInTheDocument();
      expect(within(row).getByText(skill.outputContract)).toBeInTheDocument();
    }
    for (const skill of ACME_SKILLS) {
      const row = screen.getByText(skill.name).closest('tr')!;
      expect(within(row).getByText('Acme Skills')).toBeInTheDocument();
    }
    for (const skill of GLOBEX_SKILLS) {
      const row = screen.getByText(skill.name).closest('tr')!;
      expect(within(row).getByText('Globex Hub')).toBeInTheDocument();
    }
  });

  it('renders a duplicate name across local and external sources as separate rows with no duplicate-key warning (AC-09)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const catalog: SkillCatalog = {
      localSkills: [
        {
          name: 'code-review',
          description: 'd',
          inputContract: 'in',
          outputContract: 'out',
          executionInstructions: 'x',
          mcpTools: [],
        },
      ],
      externalSkills: [
        {
          marketplaceId: 'mp-acme',
          marketplaceName: 'Acme Skills',
          name: 'code-review',
          description: 'd',
        },
        {
          marketplaceId: 'mp-globex',
          marketplaceName: 'Globex Hub',
          name: 'code-review',
          description: 'd',
        },
      ],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-acme',
          name: 'Acme Skills',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: 200,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-globex',
          name: 'Globex Hub',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: 200,
        },
      ],
    };
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(catalog);
    await openSkillsTab();

    const cells = await screen.findAllByText('code-review');
    expect(cells).toHaveLength(3);

    const marketplaceValues = cells
      .map((cell) => cell.closest('tr')!.children[1]?.textContent)
      .sort();
    expect(marketplaceValues).toEqual(['Acme Skills', 'Globex Hub', 'Local']);

    const duplicateKeyWarningLogged = consoleErrorSpy.mock.calls.some((call) =>
      call.some((arg) => typeof arg === 'string' && arg.toLowerCase().includes('same key')),
    );
    expect(duplicateKeyWarningLogged).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('only changes the local row when editing a local skill that collides with external names (AC-10)', async () => {
    const catalog: SkillCatalog = {
      localSkills: [
        {
          name: 'code-review',
          description: 'd',
          inputContract: 'in',
          outputContract: 'out',
          executionInstructions: 'x',
          mcpTools: [],
        },
      ],
      externalSkills: [
        {
          marketplaceId: 'mp-acme',
          marketplaceName: 'Acme Skills',
          name: 'code-review',
          description: 'd',
        },
      ],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-acme',
          name: 'Acme Skills',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: 200,
        },
      ],
    };
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(catalog);
    vi.mocked(workflowApi.updateSkillSpec).mockResolvedValue({
      ...catalog.localSkills[0]!,
      inputContract: 'updated-input',
    });
    await openSkillsTab();

    const rows = (await screen.findAllByText('code-review')).map((el) => el.closest('tr')!);
    const localRow = rows.find((row) => within(row).queryByText('Local'))!;

    await act(async () => {
      fireEvent.click(within(localRow).getByLabelText('Edit'));
    });
    fireEvent.change(screen.getByLabelText('Input contract'), {
      target: { value: 'updated-input' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(workflowApi.updateSkillSpec).toHaveBeenCalledWith(
        'code-review',
        expect.objectContaining({ inputContract: 'updated-input' }),
      );
    });

    const rowsAfter = screen.getAllByText('code-review').map((el) => el.closest('tr')!);
    const updatedLocalRow = rowsAfter.find((row) => within(row).queryByText('Local'))!;
    expect(within(updatedLocalRow).getByText('updated-input')).toBeInTheDocument();

    const externalRow = rowsAfter.find((row) => !within(row).queryByText('Local'))!;
    expect(within(externalRow).getAllByText('Not provided')).toHaveLength(2);
  });

  it('refetches on Refresh and does not show stale data as fresh (AC-03)', async () => {
    const catalogA: SkillCatalog = {
      localSkills: [
        {
          name: 'skill-a',
          description: '',
          inputContract: '',
          outputContract: '',
          executionInstructions: '',
          mcpTools: [],
        },
      ],
      externalSkills: [],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
      ],
    };
    const catalogB: SkillCatalog = {
      localSkills: [
        {
          name: 'skill-b',
          description: '',
          inputContract: '',
          outputContract: '',
          executionInstructions: '',
          mcpTools: [],
        },
      ],
      externalSkills: [],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
      ],
    };
    let resolveSecond: (value: SkillCatalog) => void = () => {};
    const secondLoad = new Promise<SkillCatalog>((resolve) => {
      resolveSecond = resolve;
    });
    vi.mocked(workflowApi.getSkillCatalog)
      .mockResolvedValueOnce(catalogA)
      .mockImplementationOnce(() => secondLoad);

    await openSkillsTab();
    await screen.findByText('skill-a');

    await act(async () => {
      fireEvent.click(screen.getByText('⟳ Refresh'));
    });

    // The query client batches its notifications, so the loading state lands a tick later.
    await waitFor(() => {
      expect(screen.queryByText('skill-a')).not.toBeInTheDocument();
      expect(screen.getByText('Loading skills…')).toBeInTheDocument();
    });

    await act(async () => {
      resolveSecond(catalogB);
      await secondLoad;
    });

    await screen.findByText('skill-b');
    expect(screen.queryByText('skill-a')).not.toBeInTheDocument();
  });

  it('shows no error and no attributed row when an enabled marketplace returns an empty catalogue (AC-07)', async () => {
    const catalog: SkillCatalog = {
      localSkills: [
        {
          name: 'code-review',
          description: '',
          inputContract: '',
          outputContract: '',
          executionInstructions: '',
          mcpTools: [],
        },
      ],
      externalSkills: [],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-acme',
          name: 'Acme Skills',
          outcome: 'SUCCESS',
          itemCount: 0,
          httpStatus: 200,
        },
      ],
    };
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(catalog);
    await openSkillsTab();

    await screen.findByText('code-review');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Acme Skills/)).not.toBeInTheDocument();
  });

  it('shows a named notice for a failing marketplace while local skills and other marketplaces still render (AC-11/AC-12/AC-13/AC-16)', async () => {
    const catalog: SkillCatalog = {
      localSkills: [
        {
          name: 'code-review',
          description: '',
          inputContract: '',
          outputContract: '',
          executionInstructions: '',
          mcpTools: [],
        },
      ],
      externalSkills: [
        {
          marketplaceId: 'mp-globex',
          marketplaceName: 'Globex Hub',
          name: 'triage',
          description: '',
        },
      ],
      sources: [
        {
          kind: 'LOCAL',
          marketplaceId: null,
          name: 'Local',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: null,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-acme',
          name: 'Acme Skills',
          outcome: 'TIMEOUT',
          itemCount: 0,
          httpStatus: null,
        },
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-globex',
          name: 'Globex Hub',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: 200,
        },
      ],
    };
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(catalog);
    await openSkillsTab();

    await screen.findByText('code-review');
    expect(screen.getByText('triage')).toBeInTheDocument();
    expect(screen.getByText('Acme Skills: timed out.')).toBeInTheDocument();
  });

  it('shows an error state with zero rows and no mock data on a total endpoint failure (AC-15)', async () => {
    vi.mocked(workflowApi.getSkillCatalog).mockRejectedValue(
      new Error('Failed to load skill catalog: 401'),
    );
    await openSkillsTab();

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load skill catalog: 401');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(mockSkillSpecs[0]!.name)).not.toBeInTheDocument();
  });

  it('renders no reachable button for external rows and marks them read-only as text (AC-22/AC-23/AC-39)', async () => {
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(FULL_CATALOG);
    await openSkillsTab();

    const externalRow = (await screen.findByText('gen-tests')).closest('tr')!;
    expect(within(externalRow).queryByRole('button')).not.toBeInTheDocument();
    expect(within(externalRow).getByText('Read-only')).toBeInTheDocument();
  });

  it('renders a skill name containing <script> as literal text, not executed (AC-30)', async () => {
    const catalog: SkillCatalog = {
      localSkills: [],
      externalSkills: [
        {
          marketplaceId: 'mp-acme',
          marketplaceName: 'Acme Skills',
          name: '<script>window.__xssFired = true;</script>',
          description: '',
        },
      ],
      sources: [
        {
          kind: 'MARKETPLACE',
          marketplaceId: 'mp-acme',
          name: 'Acme Skills',
          outcome: 'SUCCESS',
          itemCount: 1,
          httpStatus: 200,
        },
      ],
    };
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(catalog);
    await openSkillsTab();

    await screen.findByText('<script>window.__xssFired = true;</script>');
    expect((window as unknown as { __xssFired?: boolean }).__xssFired).toBeUndefined();
  });

  it('keeps keyboard focus on the Refresh button across a reload (AC-37)', async () => {
    vi.mocked(workflowApi.getSkillCatalog).mockResolvedValue(FULL_CATALOG);
    await openSkillsTab();
    await screen.findByText('code-review');

    const refreshButton = screen.getByText('⟳ Refresh');
    refreshButton.focus();
    expect(document.activeElement).toBe(refreshButton);

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(document.activeElement).toBe(screen.getByText('⟳ Refresh'));
  });
});
