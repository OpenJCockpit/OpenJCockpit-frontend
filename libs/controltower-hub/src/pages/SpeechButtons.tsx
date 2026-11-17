import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { Button, Icon, StatusMessage } from '@openjcockpit/ui';

interface Recognition {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}
type RecognitionConstructor = new () => Recognition;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

interface Props {
  /** The question that "Read question" speaks. */
  text: string;
  onTranscript: (transcript: string) => void;
}

/**
 * Browser speech: reads the question aloud and dictates the answer. Dictation needs the microphone, which
 * the host's Permissions-Policy allows for its own origin (`microphone=(self)`); the browser still asks.
 */
export function SpeechButtons({ text, onTranscript }: Props) {
  const { t } = useTranslation('controltower');
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  function speak() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language;
    window.speechSynthesis.speak(utterance);
  }

  function listen() {
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
    recognition.onend = () => setListening(false);
    setUnsupported(false);
    setListening(true);
    recognition.start();
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={listen}>
        <Icon name="microphone" /> {listening ? t('speech.listening') : t('speech.speak')}
      </Button>{' '}
      <Button type="button" variant="secondary" onClick={speak}>
        <Icon name="speaker" /> {t('speech.read')}
      </Button>
      {unsupported && <StatusMessage role="status">{t('speech.unsupported')}</StatusMessage>}
    </div>
  );
}
