import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, INTERVIEW, TEMPLATE, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

describe('interviews', () => {
  const path = '/controltower/interviews';

  it('starts an interview, answers it and generates the specs', async () => {
    ct.startControlTowerInterview.mockResolvedValue(INTERVIEW);
    ct.answerControlTowerInterview.mockResolvedValue({ ...INTERVIEW, status: 'COMPLETE' });
    ct.generateControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, SPEC_DISPATCHED]);
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
    expect(await screen.findByText(/2 drafts created/)).toBeInTheDocument();
  });

  it('points to the templates when there are none to start from', async () => {
    ct.listControlTowerTemplates.mockResolvedValue([]);
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Create a template first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to templates' })).toHaveAttribute(
      'href',
      '/controltower/templates',
    );
    expect(screen.queryByRole('button', { name: 'Start interview' })).not.toBeInTheDocument();
  });

  it('shows the answer count, keeps an unsent draft per interview and submits with Ctrl+Enter', async () => {
    ct.answerControlTowerInterview.mockResolvedValue({ ...INTERVIEW, status: 'COMPLETE' });
    ct.listControlTowerInterviews.mockResolvedValue([
      { ...INTERVIEW, answers: [{ questionId: 'goal', question: 'q', answer: 'a' }] },
    ]);
    const first = renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    expect(await screen.findByText(/1 answered/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Your answer/ }), {
      target: { value: 'half typed' },
    });
    first.unmount();

    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    const box = await screen.findByRole('textbox', { name: /Your answer/ });
    expect(box).toHaveValue('half typed');
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    await waitFor(() =>
      expect(ct.answerControlTowerInterview).toHaveBeenCalledWith('i1', 'half typed'),
    );
    expect(sessionStorage.getItem('controltower.answerDraft.i1')).toBeNull();
  });

  it('shows the questions and answers of a completed interview', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([
      {
        ...INTERVIEW,
        status: 'COMPLETE',
        answers: [
          { questionId: 'goal', question: 'What is the goal?', answer: 'Ship it' },
          { questionId: 'users', question: 'Who are the users?', answer: 'Ops team' },
        ],
      },
    ]);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    expect(await screen.findByText('Interview completed')).toBeInTheDocument();
    expect(screen.getByText('What is the goal?')).toBeInTheDocument();
    expect(screen.getByText('Ship it')).toBeInTheDocument();
    expect(screen.getByText('Who are the users?')).toBeInTheDocument();
    expect(screen.getByText('Ops team')).toBeInTheDocument();
  });

  it('opens an interview on its own screen and goes back to the list', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([{ ...INTERVIEW, status: 'COMPLETE' }]);
    const { router } = renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    expect(await screen.findByText('Interview completed')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`${path}/i1`);
    expect(screen.queryByRole('button', { name: 'Start interview' })).toBeNull();
    expect(screen.getByRole('link', { name: /^Discovery interviews/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    fireEvent.click(screen.getByRole('link', { name: 'Back to interviews' }));
    expect(await screen.findByRole('button', { name: 'Start interview' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it('offers no spec generation once the specs are generated', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([{ ...INTERVIEW, status: 'GENERATED' }]);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    expect(await screen.findByRole('button', { name: 'Close session' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate spec drafts' })).toBeNull();
    expect(screen.getByRole('link', { name: 'View generated specs' })).toHaveAttribute(
      'href',
      `/controltower/specs?interview=${INTERVIEW.id}`,
    );
    expect(screen.queryByRole('combobox', { name: /Spec output template/ })).toBeNull();
  });

  it('shows the progress through the template questions', async () => {
    const question = (id: string) => ({
      id,
      text: id,
      required: true,
      maxFollowUps: 2,
      completionCriteria: '',
    });
    ct.listControlTowerTemplates.mockResolvedValue([
      { ...TEMPLATE, questions: [question('a'), question('b'), question('c')] },
    ]);
    ct.listControlTowerInterviews.mockResolvedValue([
      { ...INTERVIEW, questionIndex: 1, followUps: 1 },
    ]);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    expect(await screen.findByText(/Question 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/1 question left after this one/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up 1 of up to 2/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Interview progress' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });

  it('lists the newest interview first with its date', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([
      { ...INTERVIEW, id: 'old', title: 'Old one', createdAt: '2026-01-01T10:00:00Z' },
      { ...INTERVIEW, id: 'undated', title: 'Undated one' },
      { ...INTERVIEW, id: 'new', title: 'New one', createdAt: '2026-06-01T10:00:00Z' },
    ]);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('New one');
    const titles = screen.getAllByRole('button').map((b) => b.querySelector('b')?.textContent);
    expect(titles.filter(Boolean)).toEqual(['New one', 'Old one', 'Undated one']);
  });

  it('generates with the default template and can close the session', async () => {
    ct.generateControlTowerSpecs.mockResolvedValue([]);
    ct.listControlTowerInterviews.mockResolvedValue([{ ...INTERVIEW, status: 'COMPLETE' }]);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByText('Kick-off'));
    fireEvent.click(await screen.findByRole('button', { name: 'Close session' }));
    expect(await screen.findByRole('button', { name: 'Start interview' })).toBeInTheDocument();
    fireEvent.click(await screen.findByText('Kick-off'));
    fireEvent.click(await screen.findByRole('button', { name: 'Generate spec drafts' }));
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
      renderRoutes(controltowerRoutes, { path });
      fireEvent.click(await screen.findByText('Kick-off'));
      fireEvent.click(await screen.findByRole('button', { name: 'Speak' }));
      expect(await screen.findByRole('button', { name: 'Listening…' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Your answer/ })).toHaveValue('first ');
      vi.unstubAllGlobals();
    });
  });
});
