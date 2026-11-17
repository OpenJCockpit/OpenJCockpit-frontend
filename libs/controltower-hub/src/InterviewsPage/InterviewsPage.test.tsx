import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, INTERVIEW, renderRoutes } from '../testUtils';

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
