import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAppDefinition } from '@openjcockpit/hub-contract';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerApp } from './index';
import { controltowerRoutes } from './controltowerRoutes';
import { errorMessage } from './errorMessage';
import { layoutGraph } from './GraphPage/graphLayout';
import { sampleQuestions } from './sampleQuestions';
import {
  ADMIN,
  ct,
  GRAPH,
  INTERVIEW,
  renderRoutes,
  renderWith,
  REPOSITORY,
  SPEC_DISPATCHED,
  SPEC_DRAFT,
  stubApi,
} from './testUtils';

vi.mock('@openjcockpit/api', async (importOriginal) => {
  // Every ControlTower request becomes a mock; the rest of the library stays real.
  const original = await importOriginal<Record<string, unknown>>();
  const mocked = Object.fromEntries(
    Object.entries(original)
      .filter(([name, value]) => /ControlTower/.test(name) && typeof value === 'function')
      .map(([name]) => [name, vi.fn()]),
  );
  return { ...original, ...mocked };
});

beforeEach(() => stubApi());

describe('controltowerApp', () => {
  it('is a valid app definition with a widget and two settings sections', () => {
    expect(isAppDefinition(controltowerApp)).toBe(true);
    expect(controltowerApp).toMatchObject({ id: 'controltower', route: '/controltower' });
    expect(controltowerApp.requiredPermissions).toEqual([]);
    expect(controltowerApp.widgets?.[0]?.link).toBe('/controltower/queue');
    const [repository, policy] = controltowerApp.settings ?? [];
    expect(repository).toMatchObject({ screen: 'project', requiresProject: true });
    expect(policy).toMatchObject({ requiredPermissions: ['openjcockpit-admin'] });
  });

  it('loads its routes and every lazy component', async () => {
    expect(await controltowerApp.loadRoutes()).toBe(controltowerRoutes);
    for (const section of controltowerApp.settings ?? []) {
      expect((await section.component()).default).toBeTypeOf('function');
    }
    expect((await controltowerApp.widgets![0]!.component()).default).toBeTypeOf('function');
  });
});

describe('routing', () => {
  it('sends the user to project selection without a project', async () => {
    renderRoutes(controltowerRoutes, { project: null });
    expect(await screen.findByText('project selection')).toBeInTheDocument();
  });

  it('shows the templates without a project', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/templates', project: null });
    expect(await screen.findByText('Standard project')).toBeInTheDocument();
  });

  it('offers to connect a repository when none is linked', async () => {
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    renderRoutes(controltowerRoutes);
    const link = await screen.findByRole('link', { name: 'Connect a repository' });
    expect(link).toHaveAttribute('href', '/project-settings/controltower-repository');
  });

  it('retries a failed repository lookup', async () => {
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('down'));
    renderRoutes(controltowerRoutes);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
  });

  it('navigates between the tabs', async () => {
    renderRoutes(controltowerRoutes, {
      path: '/controltower',
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Specifications' }));
    expect(await screen.findByText('Specification registry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Specifications' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('goes back to the dashboard without the host header', async () => {
    const { router } = renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });
});

describe('overview', () => {
  it('shows the counts of the linked repository', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
    const stat = (label: string) =>
      screen.getAllByText(label).find((el) => el.tagName === 'SPAN')!.parentElement!;
    await waitFor(() => expect(within(stat('Interviews')).getByText('1')).toBeInTheDocument());
    expect(within(stat('Specifications')).getByText('2')).toBeInTheDocument();
    expect(within(stat('Ready to dispatch')).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start discovery' })).toHaveAttribute(
      'href',
      '/controltower/interviews',
    );
  });

  it('shows dashes while the counts are unavailable', async () => {
    ct.listControlTowerSpecs.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    expect(
      within(
        screen.getAllByText('Specifications').find((el) => el.tagName === 'SPAN')!.parentElement!,
      ).getByText('–'),
    ).toBeInTheDocument();
  });
});

describe('specifications', () => {
  const path = '/controltower/specs';

  it('approves a draft after confirming', async () => {
    ct.approveControlTowerSpec.mockResolvedValue({
      ...SPEC_DRAFT,
      status: 'APPROVED',
      branch: 'spec/s1',
    });
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByText(/pushed to branch spec\/s1/)).toBeInTheDocument();
    expect(ct.approveControlTowerSpec).toHaveBeenCalledWith('s1');
  });

  it('does not approve when the confirmation is cancelled', async () => {
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Login page');
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-cancel'));
    expect(ct.approveControlTowerSpec).not.toHaveBeenCalled();
  });

  it('shows why an approval failed', async () => {
    ct.approveControlTowerSpec.mockRejectedValue(new Error('Policy denied: four eyes'));
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Login page');
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Policy denied: four eyes');
  });

  it('marks a dispatched spec as done', async () => {
    ct.completeControlTowerSpec.mockResolvedValue({ ...SPEC_DISPATCHED, status: 'DONE' });
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Logout');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm externally completed' }));
    expect(await screen.findByText(/Marked as done/)).toBeInTheDocument();
    expect(ct.completeControlTowerSpec).toHaveBeenCalledWith('s2');
  });

  it('reports a non-Error failure as text', async () => {
    ct.completeControlTowerSpec.mockRejectedValue('plain failure');
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Logout');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm externally completed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('plain failure');
  });

  it('hides the write actions from a viewer', async () => {
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    await screen.findByText('Login page');
    expect(screen.queryByRole('button', { name: 'Approve and push branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm externally completed' })).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.listControlTowerSpecs.mockResolvedValueOnce([]);
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/generate your first spec drafts/)).toBeInTheDocument();
    first.unmount();
    ct.listControlTowerSpecs.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the specifications.')).toBeInTheDocument();
  });
});

describe('graph', () => {
  const path = '/controltower/graph';

  it('draws the specs and their dependency', async () => {
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(within(svg).getByText('Login page')).toBeInTheDocument();
    expect(within(svg).getByText('APPROVED · READY')).toBeInTheDocument();
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(1);
  });

  it('skips an edge to an unknown spec and a node outside the order', async () => {
    ct.getControlTowerGraph.mockResolvedValue({
      nodes: [
        { id: 'a', title: 'A', status: 'DRAFT', dependsOn: ['missing'], ready: false },
        { id: 'b', title: 'B', status: 'DRAFT', dependsOn: ['a'], ready: false },
      ],
      topologicalOrder: ['a'],
    });
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(0);
    expect(within(svg).queryByText('B')).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.getControlTowerGraph.mockResolvedValueOnce({ nodes: [], topologicalOrder: [] });
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/No specifications yet/)).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerGraph.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the dependency graph.')).toBeInTheDocument();
  });

  it('lays out a column per dependency depth', () => {
    const layout = layoutGraph(GRAPH);
    expect(layout.positions.get('s1')).toEqual({ x: 20, y: 25 });
    expect(layout.positions.get('s2')).toEqual({ x: 295, y: 25 });
    expect(layoutGraph({ nodes: [], topologicalOrder: [] })).toMatchObject({
      width: 320,
      height: 160,
    });
  });
});

describe('dispatch queue', () => {
  const path = '/controltower/queue';

  it('dispatches only after the branches are confirmed as merged', async () => {
    ct.dispatchControlTowerSpecs.mockResolvedValue([{ specId: 's2', result: 'DISPATCHED' }]);
    renderRoutes(controltowerRoutes, { path });
    const button = await screen.findByRole('button', { name: 'Dispatch ready specs' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Dispatched')).toBeInTheDocument();
    expect(ct.dispatchControlTowerSpecs).toHaveBeenCalledWith('r1', true);
    expect(screen.getByRole('link', { name: 'Open the spec queue' })).toHaveAttribute(
      'href',
      '/spec-queue',
    );
  });

  it('shows why a dispatch failed', async () => {
    ct.dispatchControlTowerSpecs.mockRejectedValue(new Error('Dispatch freeze is on'));
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Dispatch ready specs' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Dispatch freeze is on');
  });

  it('hides the dispatch from a viewer', async () => {
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    await screen.findByText('Logout');
    expect(screen.queryByRole('button', { name: 'Dispatch ready specs' })).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.getControlTowerQueueProposal.mockResolvedValueOnce([]);
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/Approve specs or finish/)).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerQueueProposal.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the dispatch queue.')).toBeInTheDocument();
  });
});

describe('interviews', () => {
  const path = '/controltower/interviews';

  it('starts an interview, answers it and generates the specs', async () => {
    ct.startControlTowerInterview.mockResolvedValue(INTERVIEW);
    ct.answerControlTowerInterview.mockResolvedValue({ ...INTERVIEW, status: 'COMPLETE' });
    ct.generateControlTowerSpecs.mockResolvedValue([]);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Kick-off');
    chooseOption(screen.getByRole('combobox', { name: /Interview template/ }), /Standard project/);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    expect(await screen.findByText('What is the goal?')).toBeInTheDocument();
    expect(ct.startControlTowerInterview).toHaveBeenCalledWith({
      projectId: 'r1',
      templateId: 't1',
      featureRequest: undefined,
    });

    fireEvent.change(screen.getByRole('textbox', { name: /Your answer/ }), {
      target: { value: 'Ship it' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(await screen.findByText('Interview completed')).toBeInTheDocument();
    expect(ct.answerControlTowerInterview).toHaveBeenCalledWith('i1', 'Ship it');

    chooseOption(screen.getByRole('combobox', { name: /Spec output template/ }), 'Mine');
    fireEvent.click(screen.getByRole('button', { name: 'Generate spec drafts' }));
    expect(await screen.findByText('Specification registry')).toBeInTheDocument();
    expect(ct.generateControlTowerSpecs).toHaveBeenCalledWith('i1', { specTemplateId: 'st2' });
  });

  it('generates with the default template and can close the session', async () => {
    ct.generateControlTowerSpecs.mockResolvedValue([]);
    ct.listControlTowerInterviews.mockResolvedValue([{ ...INTERVIEW, status: 'COMPLETE' }]);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    fireEvent.click(screen.getByRole('button', { name: 'Close session' }));
    expect(await screen.findByRole('button', { name: 'Start interview' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Kick-off'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate spec drafts' }));
    await waitFor(() => expect(ct.generateControlTowerSpecs).toHaveBeenCalledWith('i1', undefined));
  });

  it('asks for the feature request of a feature template', async () => {
    ct.startControlTowerInterview.mockResolvedValue({ ...INTERVIEW, kind: 'FEATURE' });
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Kick-off');
    chooseOption(screen.getByRole('combobox', { name: /Interview template/ }), /Feature/);
    fireEvent.change(screen.getByRole('textbox', { name: /New feature request/ }), {
      target: { value: 'Dark mode' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    await waitFor(() =>
      expect(ct.startControlTowerInterview).toHaveBeenCalledWith(
        expect.objectContaining({ featureRequest: 'Dark mode' }),
      ),
    );
  });

  it('shows why an interview could not start', async () => {
    ct.startControlTowerInterview.mockRejectedValue(new Error('No template'));
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Kick-off');
    chooseOption(screen.getByRole('combobox', { name: /Interview template/ }), /Standard project/);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No template');
  });

  it('disables starting for a viewer and shows the empty and error states', async () => {
    ct.listControlTowerInterviews.mockResolvedValueOnce([]);
    const first = renderRoutes(controltowerRoutes, { path, permissions: [] });
    expect(await screen.findByText('No interviews recorded yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeDisabled();
    first.unmount();
    ct.listControlTowerInterviews.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the interviews.')).toBeInTheDocument();
  });

  describe('speech', () => {
    async function openSession() {
      renderRoutes(controltowerRoutes, { path });
      fireEvent.click(await screen.findByText('Kick-off'));
      return screen.findByRole('button', { name: 'Speak' });
    }

    it('says so when the browser cannot recognise speech', async () => {
      fireEvent.click(await openSession());
      expect(await screen.findByText(/Speech recognition is not available/)).toBeInTheDocument();
    });

    it('appends what was dictated to the answer', async () => {
      class Recognition {
        lang = '';
        onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          this.onresult?.({ results: [[{ transcript: 'hello' }], [{ transcript: 'world' }]] });
          this.onend?.();
        }
      }
      vi.stubGlobal('webkitSpeechRecognition', Recognition);
      const speak = await openSession();
      fireEvent.change(screen.getByRole('textbox', { name: /Your answer/ }), {
        target: { value: 'Start:' },
      });
      fireEvent.click(speak);
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /Your answer/ })).toHaveValue(
          'Start: hello world',
        ),
      );
      vi.unstubAllGlobals();
    });

    it('reads the question aloud when the browser can', async () => {
      const speakSpy = vi.fn();
      const cancel = vi.fn();
      vi.stubGlobal('speechSynthesis', { speak: speakSpy, cancel });
      vi.stubGlobal(
        'SpeechSynthesisUtterance',
        class {
          constructor(public text: string) {}
          lang = '';
        },
      );
      await openSession();
      fireEvent.click(screen.getByRole('button', { name: 'Read question' }));
      expect(cancel).toHaveBeenCalled();
      expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ text: 'What is the goal?' }));
      vi.unstubAllGlobals();
    });

    it('does nothing when the browser cannot read aloud', async () => {
      await openSession();
      fireEvent.click(screen.getByRole('button', { name: 'Read question' }));
      expect(screen.getByRole('button', { name: 'Speak' })).toBeInTheDocument();
    });
  });
});

describe('templates', () => {
  const path = '/controltower/templates';

  it('lists both kinds of templates', async () => {
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Standard project')).toBeInTheDocument();
    expect(await screen.findByText('Built-in default')).toBeInTheDocument();
    expect(screen.getByText('Custom spec template')).toBeInTheDocument();
  });

  it('saves an interview template with the sample questions of its kind', async () => {
    ct.createControlTowerTemplate.mockResolvedValue(TEMPLATE_RESULT);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    chooseOption(screen.getByRole('combobox', { name: /Interview type/ }), 'New feature');
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByText('Template saved.')).toBeInTheDocument();
    expect(ct.createControlTowerTemplate).toHaveBeenCalledWith({
      name: 'Mine',
      kind: 'FEATURE',
      questions: sampleQuestions('FEATURE'),
    });
  });

  it('rejects questions that are not JSON', async () => {
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Questions/ }), {
      target: { value: '{' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(ct.createControlTowerTemplate).not.toHaveBeenCalled();
  });

  it('saves a spec template and shows a backend failure', async () => {
    ct.createControlTowerSpecTemplate.mockRejectedValueOnce(new Error('Name taken'));
    ct.createControlTowerSpecTemplate.mockResolvedValueOnce({});
    renderRoutes(controltowerRoutes, { path });
    const name = (await screen.findAllByRole('textbox', { name: /Template name/ }))[1]!;
    fireEvent.change(name, { target: { value: 'Spec' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save spec template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name taken');
    fireEvent.click(screen.getByRole('button', { name: 'Save spec template' }));
    expect(await screen.findByText('Spec template saved.')).toBeInTheDocument();
  });

  it('hides the forms from a viewer and shows load errors and empty lists', async () => {
    ct.listControlTowerTemplates.mockResolvedValue([]);
    ct.listControlTowerSpecTemplates.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument();
    expect(await screen.findByText('Failed to load the templates.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save template' })).toBeNull();
  });
});

const TEMPLATE_RESULT = { id: 't9', name: 'Mine', kind: 'FEATURE', questions: [] };

describe('repository settings section', () => {
  async function section() {
    const Section = (await controltowerApp.settings![0]!.component()).default;
    return Section;
  }

  it('edits the linked repository and keeps the stored secret when left empty', async () => {
    const Section = await section();
    ct.updateControlTowerProject.mockResolvedValue(REPOSITORY);
    renderWith(<Section />);
    const name = await screen.findByRole('textbox', { name: /Repository name/ });
    expect(name).toHaveValue('demo-repo');
    fireEvent.change(name, { target: { value: 'renamed' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Base branch/ }), {
      target: { value: 'develop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save repository' }));
    expect(await screen.findByText('Repository saved.')).toBeInTheDocument();
    expect(ct.updateControlTowerProject).toHaveBeenCalledWith('r1', {
      name: 'renamed',
      gitUrl: 'https://github.com/org/demo.git',
      defaultBranch: 'develop',
      credentialType: 'HTTPS_TOKEN',
      gitUsername: undefined,
      secret: undefined,
      workflowId: 'wf1',
      cockpitProjectId: 'cp1',
    });
  });

  it('connects a first repository to the selected project', async () => {
    const Section = await section();
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    ct.createControlTowerProject.mockResolvedValue(REPOSITORY);
    renderWith(<Section />);
    fireEvent.change(await screen.findByRole('textbox', { name: /Repository name/ }), {
      target: { value: 'new' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Git repository URL/ }), {
      target: { value: 'https://git.example/a.git' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /workflow ID/ }), {
      target: { value: 'wf' },
    });
    chooseOption(screen.getByRole('combobox', { name: /Authentication/ }), 'Username and password');
    fireEvent.change(screen.getByRole('textbox', { name: /Git username/ }), {
      target: { value: 'me' },
    });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));
    expect(await screen.findByText('Repository connected.')).toBeInTheDocument();
    expect(ct.createControlTowerProject).toHaveBeenCalledWith(
      expect.objectContaining({
        cockpitProjectId: 'cp1',
        credentialType: 'USERNAME_PASSWORD',
        gitUsername: 'me',
        secret: 'pw',
      }),
    );
  });

  it('shows a failed save', async () => {
    const Section = await section();
    ct.updateControlTowerProject.mockRejectedValue(new Error('Host not allowed'));
    renderWith(<Section />);
    await screen.findByRole('textbox', { name: /Repository name/ });
    fireEvent.click(screen.getByRole('button', { name: 'Save repository' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Host not allowed');
  });

  it('checks the connection and reports both outcomes', async () => {
    const Section = await section();
    ct.checkControlTowerConnection.mockResolvedValueOnce({
      reachable: true,
      outcome: 'OK',
      message: 'Reachable',
    });
    ct.checkControlTowerConnection.mockRejectedValueOnce(new Error('Timeout'));
    renderWith(<Section />);
    await screen.findByRole('textbox', { name: /Repository name/ });
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(await screen.findByText('Reachable')).toBeInTheDocument();
    expect(ct.checkControlTowerConnection).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'r1', gitUsername: undefined, secret: undefined }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(await screen.findByText('Timeout')).toBeInTheDocument();
  });

  it('is read-only for a viewer', async () => {
    const Section = await section();
    renderWith(<Section />, { permissions: [] });
    expect(await screen.findByRole('textbox', { name: /Repository name/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save repository' })).toBeNull();
  });

  it('retries a failed load', async () => {
    const Section = await section();
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('x'));
    renderWith(<Section />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: /Repository name/ })).toBeInTheDocument();
  });
});

describe('policy settings section', () => {
  const POLICY = {
    enabled: true,
    url: 'http://opa:8181',
    decisionPath: 'x/decision',
    failOpen: false,
  };

  async function section() {
    return (await controltowerApp.settings![1]!.component()).default;
  }

  it('saves the policy settings and tests the connection', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.saveControlTowerPolicy.mockResolvedValueOnce(POLICY);
    ct.saveControlTowerPolicy.mockResolvedValueOnce({ ...POLICY, enabled: false });
    ct.testControlTowerPolicy.mockResolvedValue({
      reachable: true,
      message: 'OK',
      policies: ['a.rego', 'b.rego'],
    });
    renderWith(<Section />, { permissions: ADMIN });
    const url = await screen.findByRole('textbox', { name: /Agent URL/ });
    expect(url).toHaveValue('http://opa:8181');
    fireEvent.click(screen.getByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByText(/now checked by the policies/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Enforce policies/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByText(/Policy checks are off/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText(/Loaded: a.rego, b.rego/)).toBeInTheDocument();
    expect(screen.getByText('Standard policies')).toBeInTheDocument();
  });

  it('shows failures of saving and testing', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.saveControlTowerPolicy.mockRejectedValue(new Error('Forbidden'));
    ct.testControlTowerPolicy.mockRejectedValue(new Error('Unreachable'));
    renderWith(<Section />, { permissions: ADMIN });
    fireEvent.click(await screen.findByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    fireEvent.click(screen.getByRole('checkbox', { name: /fail open/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });

  it('shows an unreachable agent from the test without policies', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.testControlTowerPolicy.mockResolvedValue({
      reachable: false,
      message: 'No route',
      policies: [],
    });
    renderWith(<Section />, { permissions: ADMIN });
    fireEvent.change(await screen.findByRole('textbox', { name: /Decision path/ }), {
      target: { value: 'y/decision' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Agent URL/ }), {
      target: { value: 'http://other:1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No route');
  });

  it('is read-only when the backend says the user may not edit', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: false });
    renderWith(<Section />);
    expect(await screen.findByRole('textbox', { name: /Agent URL/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save policy settings' })).toBeNull();
  });

  it('retries a failed load', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockRejectedValueOnce(new Error('x'));
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    renderWith(<Section />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: /Agent URL/ })).toBeInTheDocument();
  });
});

describe('queue widget', () => {
  async function Widget() {
    return (await controltowerApp.widgets![0]!.component()).default;
  }

  it('shows how many specs are ready and links to the queue', async () => {
    const W = await Widget();
    renderRoutes([{ index: true, element: <W /> }]);
    const link = await screen.findByRole('link', { name: /spec ready to dispatch/ });
    expect(link).toHaveAttribute('href', '/controltower/queue');
    expect(ct.getControlTowerQueueProposal).toHaveBeenCalledWith('r1', expect.anything());
  });

  it('asks for a project', async () => {
    const W = await Widget();
    renderWith(<W />, { project: null });
    expect(await screen.findByTestId('controltower-widget-no-project')).toBeInTheDocument();
    expect(ct.getControlTowerProjectByCockpitProject).not.toHaveBeenCalled();
  });

  it('says when the project has no repository', async () => {
    const W = await Widget();
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    renderWith(<W />);
    expect(await screen.findByText('No repository is linked to this project.')).toBeInTheDocument();
  });

  it('retries a failed load, for either request', async () => {
    const W = await Widget();
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('x'));
    const first = renderRoutes([{ index: true, element: <W /> }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link')).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerQueueProposal.mockRejectedValueOnce(new Error('x'));
    renderRoutes([{ index: true, element: <W /> }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link')).toBeInTheDocument();
  });
});

describe('retrying a failed load', () => {
  it.each([
    ['/controltower/specs', 'listControlTowerSpecs', 'Login page'],
    ['/controltower/graph', 'getControlTowerGraph', 'Login page'],
    ['/controltower/queue', 'getControlTowerQueueProposal', 'Logout'],
    ['/controltower/interviews', 'listControlTowerInterviews', 'Kick-off'],
    ['/controltower/templates', 'listControlTowerTemplates', 'Standard project'],
    ['/controltower/templates', 'listControlTowerSpecTemplates', 'Default'],
  ])('%s after %s fails', async (path, request, shown) => {
    ct[request]!.mockRejectedValueOnce(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(shown)).toBeInTheDocument();
  });
});

describe('edge cases', () => {
  it('reports a repository without a Git URL as empty and shows a dependency-free approval', async () => {
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue({ ...REPOSITORY, gitUrl: null });
    const Section = (await controltowerApp.settings![0]!.component()).default;
    renderWith(<Section />);
    expect(await screen.findByRole('textbox', { name: /Git repository URL/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check connection' })).toBeDisabled();
  });

  it('names no branch when an approval returns none', async () => {
    ct.approveControlTowerSpec.mockResolvedValue({
      ...SPEC_DRAFT,
      status: 'APPROVED',
      branch: null,
    });
    renderRoutes(controltowerRoutes, { path: '/controltower/specs' });
    fireEvent.click(await screen.findByText('Login page'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve and push branch' }));
    fireEvent.click(await screen.findByTestId('confirm-action-confirm'));
    expect(await screen.findByText(/Spec pushed to branch \./)).toBeInTheDocument();
  });

  it('lays out a graph whose order names an unknown spec and draws no edge from a spec outside the order', async () => {
    const graph = {
      nodes: [
        { id: 'a', title: 'A', status: 'DRAFT', dependsOn: [], ready: false },
        { id: 'b', title: 'B', status: 'DRAFT', dependsOn: ['a'], ready: false },
      ],
      topologicalOrder: ['ghost', 'a'],
    };
    expect(layoutGraph(graph).positions.has('ghost')).toBe(true);
    ct.getControlTowerGraph.mockResolvedValue(graph);
    renderRoutes(controltowerRoutes, { path: '/controltower/graph' });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(0);
  });

  it('shows what is being dictated while listening and starts an empty answer with it', async () => {
    class Recognition {
      lang = '';
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        this.onresult?.({ results: [[{ transcript: 'first' }], []] });
      }
    }
    vi.stubGlobal('SpeechRecognition', Recognition);
    renderRoutes(controltowerRoutes, { path: '/controltower/interviews' });
    fireEvent.click(await screen.findByText('Kick-off'));
    fireEvent.click(await screen.findByRole('button', { name: 'Speak' }));
    expect(await screen.findByRole('button', { name: 'Listening…' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Your answer/ })).toHaveValue('first ');
    vi.unstubAllGlobals();
  });
});

describe('errorMessage', () => {
  it('takes the message of an Error and the text of anything else', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});

describe('translations', () => {
  it('renders in another language', async () => {
    renderRoutes(controltowerRoutes, { locale: 'nl' });
    expect(await screen.findByText('Zo werkt het')).toBeInTheDocument();
  });
});
