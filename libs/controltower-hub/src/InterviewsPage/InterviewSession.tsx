import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  Icon,
  SelectField,
  Shortcut,
  SpeechInputButtons,
  StatusChip,
  StatusMessage,
  TextAreaField,
  cx,
  buttonClass,
  usesCommandKey,
} from '@openjcockpit/ui';
import {
  answerControlTowerInterview,
  generateControlTowerSpecs,
  type ControlTowerInterview,
  type ControlTowerQuestion,
} from '@openjcockpit/api';
import { useRepositoryMutation, useSpecTemplates, useTemplates } from '../hooks';
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

const draftKey = (interviewId: string) => `controltower.answerDraft.${interviewId}`;

function readDraft(interviewId: string): string {
  try {
    return sessionStorage.getItem(draftKey(interviewId)) ?? '';
  } catch {
    return '';
  }
}

function writeDraft(interviewId: string, text: string) {
  try {
    if (text) sessionStorage.setItem(draftKey(interviewId), text);
    else sessionStorage.removeItem(draftKey(interviewId));
  } catch {
    // Storage can be blocked; the draft then lives only in memory.
  }
}

/** Where the interview stands: the template's questions are the fixed part; follow-ups may add more. */
function InterviewProgress({
  interview,
  questions,
}: {
  interview: ControlTowerInterview;
  questions: ControlTowerQuestion[];
}) {
  const { t } = useTranslation('controltower');
  const total = questions.length;
  const left = Math.max(0, total - interview.questionIndex - 1);
  const maxFollowUps = questions[interview.questionIndex]?.maxFollowUps ?? 0;
  return (
    <div className={styles.progress}>
      <div
        className={styles.segments}
        role="progressbar"
        aria-label={t('interviews.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(interview.questionIndex, total)}
      >
        {questions.map((question, index) => (
          <span
            key={question.id}
            className={cx(
              styles.segment,
              index < interview.questionIndex && styles.segmentDone,
              index === interview.questionIndex && styles.segmentCurrent,
            )}
          />
        ))}
      </div>
      <small>
        {t('interviews.progress', { current: interview.questionIndex + 1, total })}
        {' · '}
        {left === 0 ? t('interviews.progressLast') : t('interviews.progressLeft', { count: left })}
        {interview.followUps > 0 &&
          ` · ${t('interviews.progressFollow', { number: interview.followUps, max: maxFollowUps })}`}
      </small>
    </div>
  );
}

/** One interview: the current question with its answer form, or, once complete, the spec generation step. */
export function InterviewSession({ repositoryId, interview, run, onChange, onClose }: Props) {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const canWrite = useWriteAccess();
  const specTemplates = useSpecTemplates().data ?? [];
  const questions = useTemplates().data?.find((c) => c.id === interview.templateId)?.questions;
  const [answer, setAnswer] = useState(() => readDraft(interview.id));
  const [specTemplateId, setSpecTemplateId] = useState('');
  const send = useRepositoryMutation(repositoryId, (body: { id: string; answer: string }) =>
    answerControlTowerInterview(body.id, body.answer),
  );
  const generate = useRepositoryMutation(repositoryId, (id: string) =>
    generateControlTowerSpecs(id, specTemplateId ? { specTemplateId } : undefined),
  );
  const busy = send.isPending || generate.isPending;
  const active = interview.status === 'ACTIVE';
  const generated = interview.status === 'GENERATED';

  useEffect(() => writeDraft(interview.id, answer), [interview.id, answer]);

  function onAnswer(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      onChange(await send.mutateAsync({ id: interview.id, answer }));
      setAnswer('');
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !busy && canWrite) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function onGenerate() {
    void run(async () => {
      const created = await generate.mutateAsync(interview.id);
      const state: SpecsHandoff = {
        draftsCreated: created.length,
        specIds: created.map((spec) => spec.id),
      };
      void navigate(CONTROLTOWER_SPECS_PATH, { state });
    });
  }

  return (
    <div className={styles.session}>
      <StatusChip
        label={`${t(`interviews.status.${interview.status}`)} · ${t(`kind.${interview.kind}`)} · ${t('interviews.answered', { count: interview.answers.length })}`}
        kind={active ? 'active' : 'done'}
      />
      {active && questions && <InterviewProgress interview={interview} questions={questions} />}
      <h3>{active ? interview.currentQuestion : t('interviews.completed')}</h3>
      {interview.answers.length > 0 && (
        <section aria-label={t('interviews.transcript')}>
          <h4>{t('interviews.transcript')}</h4>
          <dl className={styles.transcript}>
            {interview.answers.map((a, index) => (
              <div key={`${a.questionId}-${index}`}>
                <dt>{a.question}</dt>
                <dd>{a.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {active ? (
        <form onSubmit={onAnswer} className={styles.session}>
          <TextAreaField
            label={t('interviews.answer')}
            rows={5}
            required
            value={answer}
            onChange={setAnswer}
            onKeyDown={onKeyDown}
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
          <StatusMessage>{t('interviews.privacy')}</StatusMessage>
          <ActionRow>
            <Button variant="primary" type="submit" disabled={busy || !canWrite}>
              {send.isPending ? t('interviews.submitting') : t('interviews.submit')}
            </Button>
            <small className={styles.shortcutHint}>
              <Shortcut
                keys={
                  usesCommandKey()
                    ? ['\u2318', '\u23CE']
                    : [t('interviews.shortcutCtrl'), t('interviews.shortcutEnter')]
                }
              />
              <span>{t('interviews.submitShortcut')}</span>
            </small>
          </ActionRow>
        </form>
      ) : (
        <div className={styles.session}>
          {!generated && (
            <>
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
            </>
          )}
          <ActionRow>
            {!generated && (
              <Button variant="primary" disabled={busy || !canWrite} onClick={onGenerate}>
                <Icon name={generate.isPending ? 'spinner' : 'sparkle'} />{' '}
                {generate.isPending ? t('interviews.generating') : t('interviews.generate')}
              </Button>
            )}
            {generated && (
              <Link
                className={buttonClass({ variant: 'primary' })}
                to={`${CONTROLTOWER_SPECS_PATH}?interview=${encodeURIComponent(interview.id)}`}
              >
                {t('interviews.viewSpecs')}
              </Link>
            )}
            <Button variant="secondary" onClick={onClose}>
              {t('interviews.close')}
            </Button>
          </ActionRow>
        </div>
      )}
    </div>
  );
}
