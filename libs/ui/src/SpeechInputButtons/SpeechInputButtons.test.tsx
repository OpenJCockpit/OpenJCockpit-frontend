import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeechInputButtons } from './SpeechInputButtons';

const labels = { speak: 'Speak', listening: 'Listening', read: 'Read', unsupported: 'No speech' };

type Win = Record<string, unknown>;

afterEach(() => {
  delete (window as unknown as Win).SpeechRecognition;
  delete (window as unknown as Win).webkitSpeechRecognition;
  delete (window as unknown as Win).speechSynthesis;
  vi.unstubAllGlobals();
});

describe('SpeechInputButtons', () => {
  it('says so when the browser cannot recognise speech', () => {
    render(<SpeechInputButtons text="Hi" onTranscript={vi.fn()} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: /Speak/ }));
    expect(screen.getByRole('status')).toHaveTextContent('No speech');
  });

  it('dictates, joins the alternatives and stops listening at the end', () => {
    const instances: { onresult: (e: unknown) => void; onend: () => void; start: () => void }[] =
      [];
    class Fake {
      lang = '';
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      constructor() {
        instances.push(this as never);
      }
    }
    (window as unknown as Win).webkitSpeechRecognition = Fake;
    const onTranscript = vi.fn();
    render(<SpeechInputButtons text="Hi" onTranscript={onTranscript} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: /Speak/ }));
    expect(screen.getByRole('button', { name: /Listening/ })).toBeInTheDocument();
    const recognition = instances[0]!;
    act(() =>
      recognition.onresult({ results: [[{ transcript: 'one' }], [], [{ transcript: 'two' }]] }),
    );
    expect(onTranscript).toHaveBeenCalledWith('one  two');
    act(() => recognition.onend());
    expect(screen.getByRole('button', { name: /Speak/ })).toBeInTheDocument();
  });

  it('reads the text aloud, and does nothing without speech synthesis', () => {
    render(<SpeechInputButtons text="Hello" onTranscript={vi.fn()} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: /Read/ }));

    const speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    (window as unknown as Win).speechSynthesis = speechSynthesis;
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        constructor(public text: string) {}
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /Read/ }));
    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello' }));
  });
});
