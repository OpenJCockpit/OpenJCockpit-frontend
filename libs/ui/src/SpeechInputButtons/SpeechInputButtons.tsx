import { useEffect, useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { StatusMessage } from '../StatusMessage/StatusMessage';

interface Recognition {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
}
type RecognitionConstructor = new () => Recognition;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

export interface SpeechInputLabels {
  /** Dictate button. */
  speak: string;
  /** Dictate button while the microphone is open. */
  listening: string;
  /** Read-aloud button. */
  read: string;
  /** Shown when the browser has no speech recognition. */
  unsupported: string;
}

interface Props {
  /** The text that the read-aloud button speaks. */
  text: string;
  onTranscript: (transcript: string) => void;
  labels: SpeechInputLabels;
}

/**
 * Browser speech: reads text aloud and dictates an answer. Dictation needs the microphone, which
 * the host's Permissions-Policy allows for its own origin (`microphone=(self)`); the browser still asks.
 */
export function SpeechInputButtons({ text, onTranscript, labels }: Props) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const active = useRef<Recognition | null>(null);

  // Release the microphone and silence read-aloud if the component goes away mid-session.
  useEffect(
    () => () => {
      const recognition = active.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        if (recognition.abort) recognition.abort();
        else recognition.stop?.();
        active.current = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  function speak() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language;
    window.speechSynthesis.speak(utterance);
  }

  function listen() {
    if (active.current) {
      // Second click while the microphone is open: stop it, so the final result is delivered.
      active.current.stop?.();
      return;
    }
    const speechWindow = window as unknown as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setUnsupported(true);
      return;
    }
    const recognition = new Constructor();
    recognition.lang = navigator.language;
    recognition.onresult = (event) =>
      onTranscript(
        Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join(' '),
      );
    const finish = () => {
      active.current = null;
      setListening(false);
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    active.current = recognition;
    setUnsupported(false);
    setListening(true);
    recognition.start();
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={listen}>
        <Icon name="microphone" /> {listening ? labels.listening : labels.speak}
      </Button>{' '}
      <Button type="button" variant="secondary" onClick={speak}>
        <Icon name="speaker" /> {labels.read}
      </Button>
      {unsupported && <StatusMessage role="status">{labels.unsupported}</StatusMessage>}
    </div>
  );
}
