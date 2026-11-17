import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  Icon,
  SelectField,
  SpeechInputButtons,
  StatusChip,
  StatusMessage,
  TextAreaField,
} from '@openjcockpit/ui';
import {
  answerControlTowerInterview,
  generateControlTowerSpecs,
  type ControlTowerInterview,
} from '@openjcockpit/api';
import { useRepositoryMutation, useSpecTemplates } from '../hooks';
import { CONTROLTOWER_SPECS_PATH } from '../routePaths';
import type { SpecsHandoff } from '../SpecsPage/handoff';
import type { RunAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import styles from './InterviewsPage.module.scss';

interface Props {
  repositoryId: string;
  interview: ControlTowerInterview;
  run: RunAction;
  onChange: (interview: ControlTowerInterview) => void;
  onClose: () => void;
}

/** One interview: the current question with its answer form, or, once complete, the spec generation step. */
export function InterviewSession({ repositoryId, interview, run, onChange, onClose }: Props) {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const canWrite = useWriteAccess();
  const specTemplates = useSpecTemplates().data ?? [];
  const [answer, setAnswer] = useState('');
  const [specTemplateId, setSpecTemplateId] = useState('');
  const send = useRepositoryMutation(repositoryId, (body: { id: string; answer: string }) =>
    answerControlTowerInterview(body.id, body.answer),
  );
  const generate = useRepositoryMutation(repositoryId, (id: string) =>
    generateControlTowerSpecs(id, specTemplateId ? { specTemplateId } : undefined),
  );
  const busy = send.isPending || generate.isPending;
  const active = interview.status === 'ACTIVE';

  function onAnswer(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      onChange(await send.mutateAsync({ id: interview.id, answer }));
      setAnswer('');
    });
  }

  function onGenerate() {
    void run(async () => {
      const created = await generate.mutateAsync(interview.id);
      onClose();
      const state: SpecsHandoff = { draftsCreated: created.length };
      void navigate(CONTROLTOWER_SPECS_PATH, { state });
    });
  }

  return (
    <div className={styles.session}>
      <StatusChip
        label={`${t(`interviews.status.${interview.status}`)} · ${interview.kind}`}
        kind={active ? 'active' : 'done'}
      />
      <h3>{active ? interview.currentQuestion : t('interviews.completed')}</h3>
      {active ? (
        <form onSubmit={onAnswer} className={styles.session}>
          <TextAreaField
            label={t('interviews.answer')}
            rows={5}
            required
            value={answer}
            onChange={setAnswer}
            placeholder={t('interviews.answerPlaceholder')}
          />
          <SpeechInputButtons
            text={interview.currentQuestion}
            labels={{
              speak: t('speech.speak'),
              listening: t('speech.listening'),
              read: t('speech.read'),
              unsupported: t('speech.unsupported'),
            }}
            onTranscript={(text) => setAnswer((old) => (old ? `${old} ${text}` : text))}
          />
          <ActionRow>
            <Button variant="primary" type="submit" disabled={busy || !canWrite}>
              {t('interviews.submit')}
            </Button>
          </ActionRow>
        </form>
      ) : (
        <div className={styles.session}>
          <StatusMessage>{t('interviews.enough')}</StatusMessage>
          <SelectField
            label={t('interviews.specTemplate')}
            value={specTemplateId}
            onChange={setSpecTemplateId}
            options={[
              { value: '', label: t('interviews.defaultSpecTemplate') },
              ...specTemplates.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <ActionRow>
            <Button
              variant="primary"
              disabled={busy || !canWrite || interview.status !== 'COMPLETE'}
              onClick={onGenerate}
            >
              <Icon name="sparkle" /> {t('interviews.generate')}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t('interviews.close')}
            </Button>
          </ActionRow>
        </div>
      )}
    </div>
  );
}
