import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as workflowApi from '@openjcockpit/api';
import { GROUPS, WORKFLOWS, renderWorkflowsTab } from '../testUtils/designFixtures';

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

describe('workflow export and import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the workflows and groups as a JSON file', async () => {
    await renderWorkflowsTab();
    vi.mocked(workflowApi.exportWorkflows).mockResolvedValue({
      groups: GROUPS,
      workflows: WORKFLOWS,
    });

    const clickSpy = vi.fn();
    if (!URL.createObjectURL) URL.createObjectURL = vi.fn();
    if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') el.click = clickSpy;
        return el;
      });

    await act(async () => {
      screen.getByText('Export JSON').click();
    });

    await waitFor(() => {
      expect(workflowApi.exportWorkflows).toHaveBeenCalled();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('imports a JSON bundle and reloads the lists', async () => {
    await renderWorkflowsTab();
    vi.mocked(workflowApi.importWorkflows).mockResolvedValue({
      groupsImported: 2,
      workflowsImported: 2,
    });

    const bundle = { groups: GROUPS, workflows: WORKFLOWS };
    const file = new File([JSON.stringify(bundle)], 'workflow-export.json', {
      type: 'application/json',
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import workflows JSON'), {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      expect(workflowApi.importWorkflows).toHaveBeenCalledWith(bundle);
      expect(screen.getByText('Imported 2 workflow(s) and 2 group(s).')).toBeInTheDocument();
    });
  });

  it('shows an error when the import file is not valid JSON', async () => {
    await renderWorkflowsTab();

    const file = new File(['not json'], 'broken.json', { type: 'application/json' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import workflows JSON'), {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to import the workflows from JSON.')).toBeInTheDocument();
    });
    expect(workflowApi.importWorkflows).not.toHaveBeenCalled();
  });

  it('renders each import violation as an informational list without blocking the success message (F-12/AC-51)', async () => {
    await renderWorkflowsTab();
    vi.mocked(workflowApi.importWorkflows).mockResolvedValue({
      groupsImported: 1,
      workflowsImported: 2,
      violations: [
        'Orb reference to unknown workflow id "wf-missing-1"',
        'Orb reference to unknown workflow id "wf-missing-2"',
      ],
    });

    const bundle = { groups: GROUPS, workflows: WORKFLOWS };
    const file = new File([JSON.stringify(bundle)], 'workflow-export.json', {
      type: 'application/json',
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import workflows JSON'), {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      expect(workflowApi.importWorkflows).toHaveBeenCalledWith(bundle);
      expect(screen.getByText('Imported 2 workflow(s) and 1 group(s).')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Orb reference to unknown workflow id "wf-missing-1"'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Orb reference to unknown workflow id "wf-missing-2"'),
    ).toBeInTheDocument();
  });

  it('renders no violations UI when the import result has no violations (F-12/AC-51 negative case)', async () => {
    await renderWorkflowsTab();
    vi.mocked(workflowApi.importWorkflows).mockResolvedValue({
      groupsImported: 1,
      workflowsImported: 1,
    });

    const bundle = { groups: GROUPS, workflows: WORKFLOWS };
    const file = new File([JSON.stringify(bundle)], 'workflow-export.json', {
      type: 'application/json',
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import workflows JSON'), {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      expect(workflowApi.importWorkflows).toHaveBeenCalledWith(bundle);
      expect(screen.getByText('Imported 1 workflow(s) and 1 group(s).')).toBeInTheDocument();
    });

    expect(screen.queryByText(/reference\(s\) could not be resolved/)).toBeNull();
  });
});
